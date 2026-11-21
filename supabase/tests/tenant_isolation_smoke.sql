\set ON_ERROR_STOP on

-- Isolated PostgreSQL smoke test for DAGBOEK's tenant-isolation pattern.
-- Synthetic data only. This file never connects to Supabase production.

CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA private;

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TABLE public.cooperatives (
  id uuid PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE public.cooperative_memberships (
  user_id uuid NOT NULL,
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  PRIMARY KEY (user_id, cooperative_id)
);

CREATE TABLE public.cooperative_licenses (
  cooperative_id uuid PRIMARY KEY REFERENCES public.cooperatives(id),
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'cancelled')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE public.inventory_products (
  id uuid PRIMARY KEY,
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id),
  name text NOT NULL,
  current_stock numeric(15,3) NOT NULL DEFAULT 0,
  UNIQUE (id, cooperative_id)
);

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY,
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id),
  code text NOT NULL,
  UNIQUE (id, cooperative_id),
  UNIQUE (cooperative_id, code)
);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY,
  cooperative_id uuid NOT NULL REFERENCES public.cooperatives(id),
  description text NOT NULL,
  UNIQUE (id, cooperative_id)
);

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY,
  cooperative_id uuid NOT NULL,
  journal_entry_id uuid NOT NULL,
  account_id uuid NOT NULL,
  amount numeric(15,2) NOT NULL,
  FOREIGN KEY (journal_entry_id, cooperative_id)
    REFERENCES public.journal_entries(id, cooperative_id),
  FOREIGN KEY (account_id, cooperative_id)
    REFERENCES public.accounts(id, cooperative_id)
);

CREATE FUNCTION private.has_active_cooperative_membership(p_cooperative_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cooperative_memberships AS cm
    WHERE cm.cooperative_id = p_cooperative_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.cooperative_licenses AS cl
        WHERE cl.cooperative_id = cm.cooperative_id
          AND cl.status = 'active'
          AND cl.starts_at <= now()
          AND (cl.expires_at IS NULL OR cl.expires_at > now())
      )
  );
$$;

REVOKE ALL ON FUNCTION private.has_active_cooperative_membership(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_active_cooperative_membership(uuid) TO authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON
  public.inventory_products,
  public.accounts,
  public.journal_entries,
  public.journal_lines
TO authenticated;

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_tenant_select ON public.inventory_products
FOR SELECT TO authenticated
USING (private.has_active_cooperative_membership(cooperative_id));
CREATE POLICY inventory_tenant_insert ON public.inventory_products
FOR INSERT TO authenticated
WITH CHECK (private.has_active_cooperative_membership(cooperative_id));
CREATE POLICY inventory_tenant_update ON public.inventory_products
FOR UPDATE TO authenticated
USING (private.has_active_cooperative_membership(cooperative_id))
WITH CHECK (private.has_active_cooperative_membership(cooperative_id));

CREATE POLICY accounts_tenant_all ON public.accounts
FOR ALL TO authenticated
USING (private.has_active_cooperative_membership(cooperative_id))
WITH CHECK (private.has_active_cooperative_membership(cooperative_id));

CREATE POLICY journal_entries_tenant_all ON public.journal_entries
FOR ALL TO authenticated
USING (private.has_active_cooperative_membership(cooperative_id))
WITH CHECK (private.has_active_cooperative_membership(cooperative_id));

CREATE POLICY journal_lines_tenant_all ON public.journal_lines
FOR ALL TO authenticated
USING (private.has_active_cooperative_membership(cooperative_id))
WITH CHECK (private.has_active_cooperative_membership(cooperative_id));

INSERT INTO public.cooperatives (id, name) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'KDMP Alpha'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'KDMP Beta');

INSERT INTO public.cooperative_memberships (user_id, cooperative_id, status) VALUES
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'active');

INSERT INTO public.cooperative_licenses (cooperative_id, status, starts_at, expires_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'active', now() - interval '1 day', now() + interval '30 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'active', now() - interval '1 day', now() + interval '30 days');

INSERT INTO public.inventory_products (id, cooperative_id, name, current_stock) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Produk Alpha', 10),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Produk Beta', 20);

INSERT INTO public.accounts (id, cooperative_id, code) VALUES
  ('a2000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '1101'),
  ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '1101');

INSERT INTO public.journal_entries (id, cooperative_id, description) VALUES
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Jurnal Alpha'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Jurnal Beta');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

DO $$
DECLARE
  v_count integer;
  v_stock numeric;
BEGIN
  SELECT count(*) INTO v_count FROM public.inventory_products;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Tenant leak: Alpha sees % inventory rows, expected 1', v_count;
  END IF;

  SELECT current_stock INTO v_stock
  FROM public.inventory_products
  WHERE id = 'a1000000-0000-4000-8000-000000000001';
  IF v_stock <> 10 THEN
    RAISE EXCEPTION 'Alpha inventory fixture mismatch';
  END IF;

  UPDATE public.inventory_products
  SET current_stock = 11
  WHERE id = 'a1000000-0000-4000-8000-000000000001';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alpha could not update its own inventory row';
  END IF;

  UPDATE public.inventory_products
  SET current_stock = 999
  WHERE id = 'b1000000-0000-4000-8000-000000000001';
  IF FOUND THEN
    RAISE EXCEPTION 'Cross-tenant update unexpectedly succeeded';
  END IF;

  BEGIN
    INSERT INTO public.inventory_products (id, cooperative_id, name, current_stock)
    VALUES (
      'a1000000-0000-4000-8000-000000000002',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Injected Beta Product',
      1
    );
    RAISE EXCEPTION 'Cross-tenant insert unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.journal_lines
      (id, cooperative_id, journal_entry_id, account_id, amount)
    VALUES (
      'a4000000-0000-4000-8000-000000000001',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'a3000000-0000-4000-8000-000000000001',
      'b2000000-0000-4000-8000-000000000001',
      100
    );
    RAISE EXCEPTION 'Cross-tenant account reference unexpectedly succeeded';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.inventory_products;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Tenant leak: Beta sees % inventory rows, expected 1', v_count;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_products
    WHERE id = 'b1000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Beta cannot see its own inventory row';
  END IF;
END;
$$;

RESET ROLE;

-- Expire Beta's license and verify that its otherwise-active member loses access.
UPDATE public.cooperative_licenses
SET expires_at = now() - interval '1 second'
WHERE cooperative_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.inventory_products;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Expired license still has access to % inventory rows', v_count;
  END IF;
END;
$$;

RESET ROLE;
\echo 'PASS: tenant isolation, cross-tenant write rejection, composite FK isolation, and expired-license lockout'
