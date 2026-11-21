-- Move privileged implementations out of the exposed public API schema.
-- Public RPC wrappers remain SECURITY INVOKER and call private SECURITY DEFINER functions.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Move role helper and privileged RPC implementations; trigger/event functions keep their OIDs.
ALTER FUNCTION public.current_user_role() SET SCHEMA private;
ALTER FUNCTION public.batalkan_transaksi_toko(uuid,text) SET SCHEMA private;
ALTER FUNCTION public.catat_transaksi_keuangan(date,text,uuid,uuid,numeric,text) SET SCHEMA private;
ALTER FUNCTION public.proses_penjualan_toko_atomik(jsonb,jsonb) SET SCHEMA private;
ALTER FUNCTION public.record_invoice_journal(uuid) SET SCHEMA private;
ALTER FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text) SET SCHEMA private;

-- Retire obsolete RPCs and move internal trigger/event functions away from exposed schemas.
ALTER FUNCTION public.catat_jurnal_penjualan_toko(text,date,text,numeric,numeric,text) SET SCHEMA private;
ALTER FUNCTION public.save_toko_sale_with_stock(jsonb,jsonb) SET SCHEMA private;
ALTER FUNCTION public.rls_auto_enable() SET SCHEMA private;
ALTER FUNCTION public.auto_journal_invoice() SET SCHEMA private;
ALTER FUNCTION public.auto_journal_invoice_payment() SET SCHEMA private;
ALTER FUNCTION public.check_journal_balance() SET SCHEMA private;
ALTER FUNCTION public.prevent_posted_journal_changes() SET SCHEMA private;
ALTER FUNCTION public.prevent_posted_journal_line_changes() SET SCHEMA private;

-- Internal implementations are callable only through authenticated invoker wrappers.
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;
REVOKE ALL ON FUNCTION private.batalkan_transaksi_toko(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.batalkan_transaksi_toko(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION private.catat_transaksi_keuangan(date,text,uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.catat_transaksi_keuangan(date,text,uuid,uuid,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION private.proses_penjualan_toko_atomik(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.proses_penjualan_toko_atomik(jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION private.record_invoice_journal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.record_invoice_journal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.record_invoice_payment(uuid,numeric,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.record_invoice_payment(uuid,numeric,date,text,text) TO authenticated;

REVOKE ALL ON FUNCTION private.catat_jurnal_penjualan_toko(text,date,text,numeric,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.save_toko_sale_with_stock(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.auto_journal_invoice() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.auto_journal_invoice_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.check_journal_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_posted_journal_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.prevent_posted_journal_line_changes() FROM PUBLIC, anon, authenticated;

-- API-facing wrappers are invoker functions; privileged work happens in the private schema.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.current_user_role();
$function$;

CREATE OR REPLACE FUNCTION public.batalkan_transaksi_toko(
  p_sale_id uuid,
  p_reason text DEFAULT 'Pembatalan transaksi'::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.batalkan_transaksi_toko(p_sale_id, p_reason);
$function$;

CREATE OR REPLACE FUNCTION public.catat_transaksi_keuangan(
  p_tanggal date,
  p_jenis text,
  p_akun_kas_id uuid,
  p_akun_lawan_id uuid,
  p_nominal numeric,
  p_keterangan text
)
RETURNS TABLE(transaksi_id uuid, journal_id uuid, nomor_jurnal text)
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT * FROM private.catat_transaksi_keuangan(
    p_tanggal, p_jenis, p_akun_kas_id, p_akun_lawan_id, p_nominal, p_keterangan
  );
$function$;

CREATE OR REPLACE FUNCTION public.proses_penjualan_toko_atomik(
  p_sale jsonb,
  p_items jsonb
)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.proses_penjualan_toko_atomik(p_sale, p_items);
$function$;

CREATE OR REPLACE FUNCTION public.record_invoice_journal(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.record_invoice_journal(p_invoice_id);
$function$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'private'
AS $function$
  SELECT private.record_invoice_payment(
    p_invoice_id, p_amount, p_payment_date, p_payment_method, p_notes
  );
$function$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
REVOKE ALL ON FUNCTION public.batalkan_transaksi_toko(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.batalkan_transaksi_toko(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.catat_transaksi_keuangan(date,text,uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catat_transaksi_keuangan(date,text,uuid,uuid,numeric,text) TO authenticated;
REVOKE ALL ON FUNCTION public.proses_penjualan_toko_atomik(jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proses_penjualan_toko_atomik(jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.record_invoice_journal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_journal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text) TO authenticated;
