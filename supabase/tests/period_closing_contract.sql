\set ON_ERROR_STOP on

-- Standalone lifecycle contract test for manual accounting-period closing.
-- Synthetic PostgreSQL objects only. No Supabase production connection or data.
CREATE SCHEMA close_test;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT '11111111-1111-4111-8111-111111111111'::uuid;
$$;
CREATE TABLE close_test.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('open','closed','reopened')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closed_by uuid,
  CHECK (period_start <= period_end),
  UNIQUE (cooperative_id, period_start, period_end)
);

CREATE UNIQUE INDEX one_active_period_end
ON close_test.periods(cooperative_id, period_end)
WHERE status IN ('open','closed');

CREATE TABLE close_test.snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES close_test.periods(id),
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, version)
);

CREATE TABLE close_test.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cooperative_id uuid NOT NULL,
  period_id uuid NOT NULL REFERENCES close_test.periods(id),
  event_type text NOT NULL CHECK (event_type IN ('created','closed','reopened')),
  actor_id uuid NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION close_test.create_period(
  p_cooperative_id uuid,
  p_first_period_start date,
  p_period_end date
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_end date;
  v_start date;
  v_period_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_cooperative_id::text, 0));

  SELECT max(period_end) INTO v_previous_end
  FROM close_test.periods
  WHERE cooperative_id = p_cooperative_id
    AND status = 'closed';

  IF v_previous_end IS NULL THEN
    IF p_first_period_start IS NULL THEN
      RAISE EXCEPTION 'FIRST_PERIOD_START_REQUIRED';
    END IF;
    v_start := p_first_period_start;
  ELSE
    v_start := v_previous_end + 1;
  END IF;

  IF p_period_end < v_start THEN
    RAISE EXCEPTION 'PERIOD_END_BEFORE_START';
  END IF;

  IF EXISTS (
    SELECT 1 FROM close_test.periods
    WHERE cooperative_id = p_cooperative_id
      AND status IN ('open','reopened')
  ) THEN
    RAISE EXCEPTION 'ACTIVE_PERIOD_ALREADY_EXISTS';
  END IF;

  INSERT INTO close_test.periods(cooperative_id,period_start,period_end,status)
  VALUES(p_cooperative_id,v_start,p_period_end,'open')
  RETURNING id INTO v_period_id;

  INSERT INTO close_test.events(cooperative_id,period_id,event_type,actor_id)
  VALUES(p_cooperative_id,v_period_id,'created',auth.uid());

  RETURN v_period_id;
END;
$$;

CREATE FUNCTION close_test.finalize_period(
  p_period_id uuid,
  p_actor_id uuid,
  p_snapshot jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_period close_test.periods%ROWTYPE;
  v_hash text;
BEGIN
  SELECT * INTO v_period
  FROM close_test.periods
  WHERE id = p_period_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'PERIOD_NOT_FOUND'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_period.cooperative_id::text, 0));

  IF v_period.status NOT IN ('open','reopened') THEN
    RAISE EXCEPTION 'PERIOD_NOT_OPEN';
  END IF;

  v_hash := md5(p_snapshot::text);

  INSERT INTO close_test.snapshots(period_id,version,snapshot,content_hash)
  VALUES(p_period_id,v_period.version,p_snapshot,v_hash);

  UPDATE close_test.periods
  SET status='closed',closed_at=now(),closed_by=p_actor_id
  WHERE id=p_period_id;

  INSERT INTO close_test.events(cooperative_id,period_id,event_type,actor_id,metadata)
  VALUES(v_period.cooperative_id,p_period_id,'closed',p_actor_id,
         jsonb_build_object('version',v_period.version,'snapshot_hash',v_hash));
END;
$$;

CREATE FUNCTION close_test.guard_dated_write(
  p_cooperative_id uuid,
  p_transaction_date date
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_cooperative_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM close_test.periods
    WHERE cooperative_id=p_cooperative_id
      AND status='closed'
      AND p_transaction_date BETWEEN period_start AND period_end
  ) THEN
    RAISE EXCEPTION 'ACCOUNTING_PERIOD_CLOSED';
  END IF;
END;
$$;

CREATE FUNCTION close_test.reopen_period(
  p_period_id uuid,
  p_actor_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_period close_test.periods%ROWTYPE;
BEGIN
  IF nullif(btrim(p_reason),'') IS NULL THEN
    RAISE EXCEPTION 'REOPEN_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_period FROM close_test.periods WHERE id=p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PERIOD_NOT_FOUND'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_period.cooperative_id::text, 0));

  IF v_period.status <> 'closed' THEN RAISE EXCEPTION 'PERIOD_NOT_CLOSED'; END IF;
  IF EXISTS (
    SELECT 1 FROM close_test.periods
    WHERE cooperative_id=v_period.cooperative_id
      AND period_start > v_period.period_end
      AND status IN ('open','closed')
  ) THEN
    RAISE EXCEPTION 'LATER_PERIOD_EXISTS';
  END IF;

  UPDATE close_test.periods
  SET status='reopened',version=version+1,closed_at=NULL,closed_by=NULL
  WHERE id=p_period_id;

  INSERT INTO close_test.events(cooperative_id,period_id,event_type,actor_id,reason,metadata)
  VALUES(v_period.cooperative_id,p_period_id,'reopened',p_actor_id,p_reason,
         jsonb_build_object('previous_version',v_period.version));
END;
$$;

CREATE FUNCTION close_test.reject_snapshot_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PERIOD_SNAPSHOT_IMMUTABLE';
END;
$$;
CREATE TRIGGER snapshots_immutable
BEFORE UPDATE OR DELETE ON close_test.snapshots
FOR EACH ROW EXECUTE FUNCTION close_test.reject_snapshot_mutation();

CREATE FUNCTION close_test.reject_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PERIOD_EVENT_IMMUTABLE';
END;
$$;
CREATE TRIGGER events_immutable
BEFORE UPDATE OR DELETE ON close_test.events
FOR EACH ROW EXECUTE FUNCTION close_test.reject_event_mutation();

-- Fixture: two independent cooperatives.
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid AS coop_alpha \gset
SELECT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid AS coop_beta \gset
SELECT '11111111-1111-4111-8111-111111111111'::uuid AS actor \gset

DO $$
BEGIN
  BEGIN
    PERFORM close_test.create_period(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NULL,'2026-01-31'
    );
    RAISE EXCEPTION 'Expected first period start requirement';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FIRST_PERIOD_START_REQUIRED' THEN RAISE; END IF;
  END;
END;
$$;

SELECT close_test.create_period(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-01','2026-01-31'
) AS alpha_jan \gset
SELECT close_test.create_period(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-01-01','2026-01-31'
) AS beta_jan \gset

SELECT close_test.finalize_period(
  :'alpha_jan'::uuid, :'actor'::uuid,
  '{"trial_balance":{"debit":100,"credit":100},"current_stock_total":7}'::jsonb
);

DO $$
DECLARE v_next uuid; v_start date;
BEGIN
  v_next := close_test.create_period(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NULL,'2026-02-28'
  );
  SELECT period_start INTO v_start FROM close_test.periods WHERE id=v_next;
  IF v_start <> DATE '2026-02-01' THEN
    RAISE EXCEPTION 'Next period start was %, expected 2026-02-01',v_start;
  END IF;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM close_test.guard_dated_write(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-01-15'
    );
    RAISE EXCEPTION 'Backdated write should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ACCOUNTING_PERIOD_CLOSED' THEN RAISE; END IF;
  END;

  PERFORM close_test.guard_dated_write(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-02-01'
  );
  PERFORM close_test.guard_dated_write(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-01-15'
  );
END;
$$;

DO $$
DECLARE v_period uuid;
BEGIN
  SELECT id INTO v_period FROM close_test.periods
  WHERE cooperative_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND period_end='2026-01-31';
  BEGIN
    PERFORM close_test.finalize_period(
      v_period,'11111111-1111-4111-8111-111111111111','{}'::jsonb
    );
    RAISE EXCEPTION 'Second close should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'PERIOD_NOT_OPEN' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
DECLARE v_period uuid;
BEGIN
  SELECT id INTO v_period FROM close_test.periods
  WHERE cooperative_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND period_end='2026-01-31';
  BEGIN
    PERFORM close_test.reopen_period(v_period,
      '11111111-1111-4111-8111-111111111111','');
    RAISE EXCEPTION 'Empty reopen reason should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'REOPEN_REASON_REQUIRED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM close_test.reopen_period(v_period,
      '11111111-1111-4111-8111-111111111111','Koreksi bukti transaksi');
    RAISE EXCEPTION 'Reopen with a later period should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'LATER_PERIOD_EXISTS' THEN RAISE; END IF;
  END;
END;
$$;

-- Beta has no later period, so it can be reopened and re-closed as a new version.
DO $$
DECLARE v_period uuid;
BEGIN
  SELECT id INTO v_period FROM close_test.periods
  WHERE cooperative_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    AND period_end='2026-01-31';
  PERFORM close_test.finalize_period(v_period,
    '11111111-1111-4111-8111-111111111111','{"trial_balance":{"debit":50,"credit":50}}'::jsonb);
  BEGIN
    PERFORM close_test.reopen_period(v_period,
      '11111111-1111-4111-8111-111111111111','');
    RAISE EXCEPTION 'Empty reopen reason should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'REOPEN_REASON_REQUIRED' THEN RAISE; END IF;
  END;
  PERFORM close_test.reopen_period(v_period,
    '11111111-1111-4111-8111-111111111111','Koreksi bukti transaksi');
  IF (SELECT status FROM close_test.periods WHERE id=v_period) <> 'reopened' THEN
    RAISE EXCEPTION 'Period was not reopened';
  END IF;
  PERFORM close_test.finalize_period(v_period,
    '11111111-1111-4111-8111-111111111111','{"trial_balance":{"debit":50,"credit":50},"revision":2}'::jsonb);
  IF (SELECT version FROM close_test.periods WHERE id=v_period) <> 2 THEN
    RAISE EXCEPTION 'Re-close did not advance version';
  END IF;
END;
$$;

DO $$
DECLARE v_period uuid;
BEGIN
  SELECT id INTO v_period FROM close_test.periods
  WHERE cooperative_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND period_end='2026-01-31';
  BEGIN
    UPDATE close_test.snapshots SET snapshot='{}'::jsonb WHERE period_id=v_period;
    RAISE EXCEPTION 'Snapshot update should have been rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'PERIOD_SNAPSHOT_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
DECLARE v_events integer; v_snapshots integer;
BEGIN
  SELECT count(*) INTO v_events FROM close_test.events
  WHERE cooperative_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  SELECT count(*) INTO v_snapshots FROM close_test.snapshots
  WHERE period_id IN (
    SELECT id FROM close_test.periods
    WHERE cooperative_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );
  IF v_events <> 4 THEN RAISE EXCEPTION 'Expected 4 Beta events, got %',v_events; END IF;
  IF v_snapshots <> 2 THEN RAISE EXCEPTION 'Expected 2 versioned snapshots, got %',v_snapshots; END IF;
END;
$$;

DROP SCHEMA close_test CASCADE;
\echo 'PASS: manual period lifecycle, required first start, sequential periods, backdate lock, tenant boundary, idempotent close guard, audited reopen, immutable snapshots/events'
