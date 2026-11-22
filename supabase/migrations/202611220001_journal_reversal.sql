-- Controlled reversal for manually posted journals.
-- Original journal rows remain immutable; a reversal is a new posted journal.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS reversal_of uuid
    REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_one_reversal_per_original
  ON public.journal_entries(reversal_of)
  WHERE reversal_of IS NOT NULL;

CREATE OR REPLACE FUNCTION private.reverse_posted_journal(
  p_journal_id uuid,
  p_reason text,
  p_reversal_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_original public.journal_entries%ROWTYPE;
  v_line_count integer;
  v_debit numeric(15,2);
  v_credit numeric(15,2);
  v_reversal_id uuid;
  v_reversal_number text;
  v_reason text := NULLIF(trim(COALESCE(p_reason, '')), '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sesi login tidak ditemukan.';
  END IF;

  v_role := private.current_user_role();
  IF COALESCE(v_role, '') <> 'manajer' THEN
    RAISE EXCEPTION 'Hanya Manajer yang dapat membalik jurnal posted.';
  END IF;

  IF p_journal_id IS NULL THEN
    RAISE EXCEPTION 'ID jurnal tidak valid.';
  END IF;

  IF v_reason IS NULL OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Alasan reversal wajib diisi dan maksimal 500 karakter.';
  END IF;

  IF p_reversal_date IS NULL THEN
    RAISE EXCEPTION 'Tanggal jurnal pembalik wajib diisi.';
  END IF;

  SELECT *
  INTO v_original
  FROM public.journal_entries
  WHERE id = p_journal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jurnal yang akan dibalik tidak ditemukan.';
  END IF;

  IF v_original.status <> 'posted' THEN
    RAISE EXCEPTION 'Hanya jurnal berstatus posted yang dapat dibalik.';
  END IF;

  IF v_original.reversal_of IS NOT NULL THEN
    RAISE EXCEPTION 'Jurnal pembalik tidak dapat dibalik kembali.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.journal_entries
    WHERE reversal_of = p_journal_id
  ) THEN
    RAISE EXCEPTION 'Jurnal ini sudah memiliki jurnal pembalik.';
  END IF;

  -- Transaksi POS dan invoice harus dibatalkan melalui modul asalnya agar
  -- status dokumen, stok, pembayaran, dan jurnal tetap konsisten.
  IF EXISTS (
    SELECT 1 FROM public.store_sales ss
    WHERE v_original.keterangan = 'Penjualan toko KDMP ' || ss.sale_number
  ) THEN
    RAISE EXCEPTION 'Jurnal POS harus dibalik melalui pembatalan transaksi toko.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE v_original.keterangan = 'Jurnal otomatis invoice ' || i.invoice_number
  ) THEN
    RAISE EXCEPTION 'Jurnal invoice harus ditangani melalui modul invoice.';
  END IF;

  IF v_original.keterangan LIKE 'Jurnal simpanan %'
     OR v_original.keterangan LIKE 'Jurnal pembayaran angsuran %' THEN
    RAISE EXCEPTION 'Jurnal simpanan/pinjaman harus dikoreksi melalui transaksi modul asal.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(kredit), 0)
  INTO v_line_count, v_debit, v_credit
  FROM public.journal_lines
  WHERE journal_id = p_journal_id;

  IF v_line_count < 2 OR ABS(v_debit - v_credit) > 0.005 THEN
    RAISE EXCEPTION 'Rincian jurnal tidak lengkap atau tidak seimbang. Reversal dihentikan.';
  END IF;

  v_reversal_number :=
    'JU-REV-' || to_char(p_reversal_date, 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.journal_entries (
    nomor_jurnal, tanggal, keterangan, status, created_by,
    reversal_of, reversal_reason
  )
  VALUES (
    v_reversal_number,
    p_reversal_date,
    'Jurnal pembalik ' || v_original.nomor_jurnal || ' - ' || v_reason,
    'draft',
    v_user_id,
    p_journal_id,
    v_reason
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_lines (
    journal_id, account_id, keterangan, debit, kredit
  )
  SELECT
    v_reversal_id,
    account_id,
    'Pembalik: ' || COALESCE(keterangan, v_original.nomor_jurnal),
    kredit,
    debit
  FROM public.journal_lines
  WHERE journal_id = p_journal_id;

  UPDATE public.journal_entries
  SET status = 'posted'
  WHERE id = v_reversal_id;

  RETURN jsonb_build_object(
    'success', true,
    'original_journal_id', p_journal_id,
    'original_journal_number', v_original.nomor_jurnal,
    'reversal_journal_id', v_reversal_id,
    'reversal_journal_number', v_reversal_number,
    'reversal_date', p_reversal_date
  );
END;
$function$;

REVOKE ALL ON FUNCTION private.reverse_posted_journal(uuid, text, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reverse_posted_journal(uuid, text, date)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_posted_journal(
  p_journal_id uuid,
  p_reason text,
  p_reversal_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.reverse_posted_journal(
    p_journal_id, p_reason, p_reversal_date
  );
$function$;

REVOKE ALL ON FUNCTION public.reverse_posted_journal(uuid, text, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_posted_journal(uuid, text, date)
  TO authenticated;
