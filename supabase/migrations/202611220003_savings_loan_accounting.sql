-- Automatic accounting journals for member savings and loan installment payments.
-- Existing historical rows are not rewritten; only new transactions create journals.

INSERT INTO public.accounts (kode_akun,nama_akun,kategori,saldo_normal,aktif)
VALUES ('2103','Simpanan Sukarela Anggota','kewajiban','kredit',true)
ON CONFLICT (kode_akun) DO NOTHING;

ALTER TABLE public.loan_installment_payments
  ADD COLUMN IF NOT EXISTS principal_paid numeric(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_paid numeric(15,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION private.record_savings_transaction_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_cash_account uuid;
  v_savings_account uuid;
  v_savings_code text;
  v_journal_id uuid;
  v_journal_number text;
  v_description text;
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Nominal simpanan harus lebih besar dari nol.';
  END IF;

  v_savings_code := CASE NEW.savings_type
    WHEN 'pokok' THEN '3101'
    WHEN 'wajib' THEN '3102'
    WHEN 'sukarela' THEN '2103'
    ELSE NULL
  END;
  IF v_savings_code IS NULL THEN
    RAISE EXCEPTION 'Jenis simpanan tidak memiliki pemetaan akun.';
  END IF;

  SELECT id INTO v_cash_account
  FROM public.accounts
  WHERE kode_akun = CASE WHEN NEW.payment_method = 'tunai' THEN '1101' ELSE '1102' END
    AND aktif = true
  LIMIT 1;

  SELECT id INTO v_savings_account
  FROM public.accounts
  WHERE kode_akun = v_savings_code AND aktif = true
  LIMIT 1;

  IF v_cash_account IS NULL OR v_savings_account IS NULL THEN
    RAISE EXCEPTION 'Akun kas/bank atau akun simpanan belum tersedia/aktif.';
  END IF;

  v_journal_number := 'JRN-SMP-' || to_char(NEW.transaction_date,'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_description := 'Jurnal simpanan ' || NEW.savings_type || ' ' || NEW.transaction_type ||
    ' - ' || NEW.transaction_number;

  INSERT INTO public.journal_entries(nomor_jurnal,tanggal,keterangan,status,created_by)
  VALUES(v_journal_number,NEW.transaction_date::date,v_description,'draft',NEW.created_by)
  RETURNING id INTO v_journal_id;

  IF NEW.transaction_type = 'setoran' THEN
    INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
    VALUES
      (v_journal_id,v_cash_account,NEW.amount,0,'Penerimaan simpanan'),
      (v_journal_id,v_savings_account,0,NEW.amount,'Penambahan saldo simpanan anggota');
  ELSIF NEW.transaction_type = 'penarikan' THEN
    INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
    VALUES
      (v_journal_id,v_savings_account,NEW.amount,0,'Penarikan saldo simpanan anggota'),
      (v_journal_id,v_cash_account,0,NEW.amount,'Pengeluaran penarikan simpanan');
  ELSE
    RAISE EXCEPTION 'Jenis transaksi simpanan tidak valid.';
  END IF;

  UPDATE public.journal_entries SET status='posted' WHERE id=v_journal_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.record_savings_transaction_journal() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_savings_transaction_journal ON public.member_savings_transactions;
CREATE TRIGGER trg_savings_transaction_journal
AFTER INSERT ON public.member_savings_transactions
FOR EACH ROW EXECUTE FUNCTION private.record_savings_transaction_journal();

CREATE OR REPLACE FUNCTION private.record_loan_installment_payment_journal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_loan_number text;
  v_installment_number integer;
  v_cash_account uuid;
  v_receivable_account uuid;
  v_service_account uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_description text;
BEGIN
  IF abs(COALESCE(NEW.principal_paid,0) + COALESCE(NEW.service_paid,0) - NEW.amount) > 0.01 THEN
    RAISE EXCEPTION 'Alokasi pokok dan jasa tidak sama dengan total pembayaran.';
  END IF;

  SELECT ml.loan_number,li.installment_number
  INTO v_loan_number,v_installment_number
  FROM public.loan_installments li
  JOIN public.member_loans ml ON ml.id=li.loan_id
  WHERE li.id=NEW.installment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jadwal pinjaman tidak ditemukan untuk pembayaran.';
  END IF;

  SELECT id INTO v_cash_account
  FROM public.accounts
  WHERE kode_akun=CASE WHEN NEW.payment_method='tunai' THEN '1101' ELSE '1102' END
    AND aktif=true LIMIT 1;
  SELECT id INTO v_receivable_account FROM public.accounts WHERE kode_akun='1103' AND aktif=true LIMIT 1;
  SELECT id INTO v_service_account FROM public.accounts WHERE kode_akun='4102' AND aktif=true LIMIT 1;

  IF v_cash_account IS NULL OR v_receivable_account IS NULL THEN
    RAISE EXCEPTION 'Akun kas/bank atau piutang anggota belum tersedia/aktif.';
  END IF;
  IF NEW.service_paid > 0 AND v_service_account IS NULL THEN
    RAISE EXCEPTION 'Akun pendapatan jasa belum tersedia/aktif.';
  END IF;

  v_journal_number := 'JRN-ANG-' || to_char(NEW.payment_date,'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_description := 'Jurnal pembayaran angsuran ' || v_loan_number ||
    ' angsuran ' || v_installment_number || ' - ' || NEW.payment_number;

  INSERT INTO public.journal_entries(nomor_jurnal,tanggal,keterangan,status,created_by)
  VALUES(v_journal_number,NEW.payment_date::date,v_description,'draft',NEW.created_by)
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
  VALUES(v_journal_id,v_cash_account,NEW.amount,0,'Penerimaan pembayaran angsuran');

  IF NEW.principal_paid > 0 THEN
    INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
    VALUES(v_journal_id,v_receivable_account,0,NEW.principal_paid,'Pengurangan piutang pokok pinjaman');
  END IF;

  IF NEW.service_paid > 0 THEN
    INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
    VALUES(v_journal_id,v_service_account,0,NEW.service_paid,'Pendapatan jasa pinjaman');
  END IF;

  UPDATE public.journal_entries SET status='posted' WHERE id=v_journal_id;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.record_loan_installment_payment_journal() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS trg_loan_payment_journal ON public.loan_installment_payments;
CREATE TRIGGER trg_loan_payment_journal
AFTER INSERT ON public.loan_installment_payments
FOR EACH ROW EXECUTE FUNCTION private.record_loan_installment_payment_journal();

CREATE OR REPLACE FUNCTION public.pay_loan_installment(
  p_payment_number text,
  p_installment_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'tunai'::text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_installment public.loan_installments%ROWTYPE;
  v_remaining NUMERIC(15,2);
  v_remaining_principal NUMERIC(15,2);
  v_remaining_service NUMERIC(15,2);
  v_prior_principal NUMERIC(15,2);
  v_prior_service NUMERIC(15,2);
  v_principal_paid NUMERIC(15,2);
  v_service_paid NUMERIC(15,2);
  v_new_paid NUMERIC(15,2);
  v_new_status TEXT;
  v_remaining_installments INTEGER;
  v_journal_number text;
BEGIN
  IF COALESCE(public.current_user_role(), '') NOT IN ('manajer', 'admin_keuangan') THEN
    RAISE EXCEPTION 'Akses tidak diizinkan untuk operasi pembayaran angsuran.';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Silakan login terlebih dahulu.';
  END IF;

  IF p_payment_number IS NULL OR length(trim(p_payment_number))=0 THEN
    RAISE EXCEPTION 'Nomor pembayaran wajib diisi.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal pembayaran harus lebih besar dari nol.';
  END IF;

  IF p_payment_method NOT IN ('tunai','transfer','qris') THEN
    RAISE EXCEPTION 'Metode pembayaran tidak valid.';
  END IF;

  SELECT * INTO v_installment
  FROM public.loan_installments
  WHERE id=p_installment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jadwal angsuran tidak ditemukan.';
  END IF;

  SELECT
    COALESCE(SUM(
      CASE WHEN COALESCE(p.principal_paid,0)+COALESCE(p.service_paid,0)>0
        THEN p.principal_paid
        ELSE ROUND(p.amount * (v_installment.principal_due / NULLIF(v_installment.total_due,0)),2)
      END
    ),0),
    COALESCE(SUM(
      CASE WHEN COALESCE(p.principal_paid,0)+COALESCE(p.service_paid,0)>0
        THEN p.service_paid
        ELSE p.amount - ROUND(p.amount * (v_installment.principal_due / NULLIF(v_installment.total_due,0)),2)
      END
    ),0)
  INTO v_prior_principal,v_prior_service
  FROM public.loan_installment_payments p
  WHERE p.installment_id=p_installment_id;

  v_remaining_principal := GREATEST(v_installment.principal_due-v_prior_principal,0);
  v_remaining_service := GREATEST(v_installment.service_due-v_prior_service,0);
  v_remaining := v_remaining_principal+v_remaining_service;

  IF ABS(v_remaining-(v_installment.total_due-v_installment.paid_amount))>0.02 THEN
    RAISE EXCEPTION 'Data alokasi angsuran tidak konsisten. Perlu pemeriksaan sebelum menerima pembayaran baru.';
  END IF;

  IF v_remaining<=0 THEN
    RAISE EXCEPTION 'Angsuran ini sudah lunas.';
  END IF;
  IF p_amount>v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan sebesar %.',v_remaining;
  END IF;

  v_principal_paid := LEAST(v_remaining_principal,ROUND(p_amount*v_remaining_principal/NULLIF(v_remaining,0),2));
  v_service_paid := p_amount-v_principal_paid;
  IF v_service_paid>v_remaining_service THEN
    v_service_paid := v_remaining_service;
    v_principal_paid := p_amount-v_service_paid;
  END IF;

  v_new_paid := v_installment.paid_amount+p_amount;
  IF v_new_paid>=v_installment.total_due THEN
    v_new_status := 'lunas';
  ELSIF v_installment.due_date<CURRENT_DATE THEN
    v_new_status := 'terlambat';
  ELSE
    v_new_status := 'sebagian';
  END IF;

  INSERT INTO public.loan_installment_payments(
    payment_number,installment_id,amount,principal_paid,service_paid,
    payment_date,payment_method,notes,created_by
  )
  VALUES(
    p_payment_number,p_installment_id,p_amount,v_principal_paid,v_service_paid,
    NOW(),p_payment_method,p_notes,auth.uid()
  );

  UPDATE public.loan_installments
  SET paid_amount=v_new_paid,status=v_new_status
  WHERE id=p_installment_id;

  SELECT COUNT(*) INTO v_remaining_installments
  FROM public.loan_installments
  WHERE loan_id=v_installment.loan_id AND paid_amount<total_due;

  IF v_remaining_installments=0 THEN
    UPDATE public.member_loans
    SET status='lunas',updated_at=NOW()
    WHERE id=v_installment.loan_id;
  END IF;

  SELECT nomor_jurnal INTO v_journal_number
  FROM public.journal_entries
  WHERE keterangan LIKE '% - '||p_payment_number
  ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'success',TRUE,
    'payment_number',p_payment_number,
    'paid_amount',v_new_paid,
    'remaining_amount',v_installment.total_due-v_new_paid,
    'principal_paid',v_principal_paid,
    'service_paid',v_service_paid,
    'journal_number',v_journal_number,
    'status',v_new_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.record_savings_transaction_journal() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.record_loan_installment_payment_journal() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.pay_loan_installment(text,uuid,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_loan_installment(text,uuid,numeric,text,text) TO authenticated;

-- Store the source account used for each new loan disbursement.
ALTER TABLE public.member_loans
  ADD COLUMN IF NOT EXISTS disbursement_method text;

CREATE OR REPLACE FUNCTION private.disburse_member_loan(
  p_loan_id uuid,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_loan public.member_loans%ROWTYPE;
  v_cash_account uuid;
  v_receivable_account uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_disbursed_at timestamptz := now();
  v_base_principal numeric(15,2);
  v_remaining_principal numeric(15,2);
  v_principal_due numeric(15,2);
  v_service_due numeric(15,2);
  v_total_due numeric(15,2);
  v_rate numeric;
  v_i integer;
  v_schedule_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak ditemukan.';
  END IF;
  v_role := private.current_user_role();
  IF COALESCE(v_role,'') <> 'manajer' THEN
    RAISE EXCEPTION 'Hanya Manajer yang dapat mencairkan pinjaman.';
  END IF;
  IF p_payment_method NOT IN ('tunai','transfer','qris') THEN
    RAISE EXCEPTION 'Metode pencairan tidak valid.';
  END IF;

  SELECT * INTO v_loan
  FROM public.member_loans
  WHERE id=p_loan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data pinjaman tidak ditemukan.';
  END IF;
  IF v_loan.status <> 'disetujui' THEN
    RAISE EXCEPTION 'Hanya pinjaman yang sudah disetujui yang dapat dicairkan.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.loan_installments WHERE loan_id=p_loan_id) THEN
    RAISE EXCEPTION 'Jadwal angsuran sudah ada. Pencairan ulang ditolak.';
  END IF;
  IF v_loan.principal_amount<=0 OR v_loan.term_months<1 THEN
    RAISE EXCEPTION 'Pokok pinjaman atau tenor tidak valid.';
  END IF;

  SELECT id INTO v_cash_account
  FROM public.accounts
  WHERE kode_akun=CASE WHEN p_payment_method='tunai' THEN '1101' ELSE '1102' END
    AND aktif=true
  LIMIT 1;
  SELECT id INTO v_receivable_account
  FROM public.accounts
  WHERE kode_akun='1103' AND aktif=true
  LIMIT 1;
  IF v_cash_account IS NULL OR v_receivable_account IS NULL THEN
    RAISE EXCEPTION 'Akun kas/bank atau piutang anggota belum tersedia/aktif.';
  END IF;

  v_base_principal := floor(v_loan.principal_amount/v_loan.term_months);
  v_remaining_principal := v_loan.principal_amount;
  v_rate := COALESCE(v_loan.monthly_interest_rate,0)/100;

  FOR v_i IN 1..v_loan.term_months LOOP
    v_principal_due := CASE
      WHEN v_i=v_loan.term_months THEN v_remaining_principal
      ELSE v_base_principal
    END;
    v_service_due := round(
      CASE
        WHEN v_loan.interest_method='menurun' THEN v_remaining_principal*v_rate
        WHEN v_loan.interest_method='tetap' THEN v_loan.principal_amount*v_rate
        ELSE NULL
      END,0
    );
    IF v_service_due IS NULL OR v_service_due<0 THEN
      RAISE EXCEPTION 'Metode jasa pinjaman tidak valid.';
    END IF;
    v_total_due := v_principal_due+v_service_due;

    INSERT INTO public.loan_installments(
      loan_id,installment_number,due_date,principal_due,service_due,total_due,paid_amount,status
    )
    VALUES(
      p_loan_id,
      v_i,
      (v_disbursed_at::date + make_interval(months=>v_i))::date,
      v_principal_due,
      v_service_due,
      v_total_due,
      0,
      'belum_bayar'
    );
    v_schedule_count := v_schedule_count+1;
    v_remaining_principal := v_remaining_principal-v_principal_due;
  END LOOP;

  v_journal_number :=
    'JRN-CAIR-'||to_char(v_disbursed_at,'YYYYMMDD')||'-'||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.journal_entries(nomor_jurnal,tanggal,keterangan,status,created_by)
  VALUES(
    v_journal_number,
    v_disbursed_at::date,
    'Jurnal pencairan pinjaman '||v_loan.loan_number,
    'draft',
    v_user_id
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_lines(journal_id,account_id,debit,kredit,keterangan)
  VALUES
    (v_journal_id,v_receivable_account,v_loan.principal_amount,0,'Piutang pokok pinjaman anggota'),
    (v_journal_id,v_cash_account,0,v_loan.principal_amount,'Pencairan dana pinjaman melalui '||p_payment_method);

  UPDATE public.journal_entries SET status='posted' WHERE id=v_journal_id;

  UPDATE public.member_loans
  SET status='dicairkan',
      disbursed_by=v_user_id,
      disbursed_at=v_disbursed_at,
      disbursement_method=p_payment_method,
      updated_at=v_disbursed_at
  WHERE id=p_loan_id;

  RETURN jsonb_build_object(
    'success',true,
    'loan_id',p_loan_id,
    'loan_number',v_loan.loan_number,
    'schedule_count',v_schedule_count,
    'journal_id',v_journal_id,
    'journal_number',v_journal_number,
    'disbursement_method',p_payment_method
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.disburse_member_loan(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.disburse_member_loan(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.disburse_member_loan(
  p_loan_id uuid,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog','private'
AS $function$
  SELECT private.disburse_member_loan(p_loan_id,p_payment_method);
$function$;

REVOKE ALL ON FUNCTION public.disburse_member_loan(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.disburse_member_loan(uuid,text) TO authenticated;

REVOKE ALL ON FUNCTION public.pay_loan_installment(text,uuid,numeric,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pay_loan_installment(text,uuid,numeric,text,text)
  TO authenticated;

