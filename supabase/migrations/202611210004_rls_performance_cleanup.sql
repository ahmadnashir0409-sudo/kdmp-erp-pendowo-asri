-- Consolidate permissive RLS policies and index foreign-key lookup columns.
-- Prepared for review; the existing application data is not modified.

-- Remove duplicate SELECT paths caused by FOR ALL policies.
DROP POLICY IF EXISTS "Manajer mengelola daftar akun" ON public.accounts;
DROP POLICY IF EXISTS "Pengguna login membaca daftar akun" ON public.accounts;
CREATE POLICY accounts_read ON public.accounts
FOR SELECT TO authenticated USING (true);
CREATE POLICY accounts_insert ON public.accounts
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) = 'manajer');
CREATE POLICY accounts_update ON public.accounts
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) = 'manajer')
WITH CHECK ((select private.current_user_role()) = 'manajer');
CREATE POLICY accounts_delete ON public.accounts
FOR DELETE TO authenticated
USING ((select private.current_user_role()) = 'manajer');

DROP POLICY IF EXISTS "Manajer mengelola profil pengguna" ON public.profiles;
DROP POLICY IF EXISTS "Pengguna membaca profil sendiri" ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
FOR SELECT TO authenticated
USING (id = (select auth.uid()) OR (select private.current_user_role()) = 'manajer');
CREATE POLICY profiles_insert ON public.profiles
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) = 'manajer');
CREATE POLICY profiles_update ON public.profiles
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) = 'manajer')
WITH CHECK ((select private.current_user_role()) = 'manajer');
CREATE POLICY profiles_delete ON public.profiles
FOR DELETE TO authenticated
USING ((select private.current_user_role()) = 'manajer');

DROP POLICY IF EXISTS cooperative_members_read ON public.cooperative_members;
DROP POLICY IF EXISTS cooperative_members_write ON public.cooperative_members;
CREATE POLICY cooperative_members_read ON public.cooperative_members
FOR SELECT TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan','kasir','pengurus'));
CREATE POLICY cooperative_members_insert ON public.cooperative_members
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY cooperative_members_update ON public.cooperative_members
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'))
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY cooperative_members_delete ON public.cooperative_members
FOR DELETE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'));

DROP POLICY IF EXISTS financial_transactions_read ON public.financial_transactions;
DROP POLICY IF EXISTS financial_transactions_write ON public.financial_transactions;
CREATE POLICY financial_transactions_read ON public.financial_transactions
FOR SELECT TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan','pengurus'));
CREATE POLICY financial_transactions_insert ON public.financial_transactions
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY financial_transactions_update ON public.financial_transactions
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'))
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY financial_transactions_delete ON public.financial_transactions
FOR DELETE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'));

DROP POLICY IF EXISTS journal_entries_read ON public.journal_entries;
DROP POLICY IF EXISTS journal_entries_write ON public.journal_entries;
CREATE POLICY journal_entries_read ON public.journal_entries
FOR SELECT TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan','pengurus'));
CREATE POLICY journal_entries_insert ON public.journal_entries
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY journal_entries_update ON public.journal_entries
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'))
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY journal_entries_delete ON public.journal_entries
FOR DELETE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'));

DROP POLICY IF EXISTS journal_lines_read ON public.journal_lines;
DROP POLICY IF EXISTS journal_lines_write ON public.journal_lines;
CREATE POLICY journal_lines_read ON public.journal_lines
FOR SELECT TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan','pengurus'));
CREATE POLICY journal_lines_insert ON public.journal_lines
FOR INSERT TO authenticated
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY journal_lines_update ON public.journal_lines
FOR UPDATE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'))
WITH CHECK ((select private.current_user_role()) IN ('manajer','admin_keuangan'));
CREATE POLICY journal_lines_delete ON public.journal_lines
FOR DELETE TO authenticated
USING ((select private.current_user_role()) IN ('manajer','admin_keuangan'));

-- These are exact duplicate indexes; retain idx_inventory_movement_product and idx_inventory_product_name.
DROP INDEX IF EXISTS public.idx_inventory_movements_product;
DROP INDEX IF EXISTS public.idx_inventory_products_name;

-- Cover all foreign keys currently reported by the database advisor.
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_by_fk ON public.journal_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id_fk ON public.journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_id_fk ON public.journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_akun_kas_id_fk ON public.financial_transactions(akun_kas_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_akun_lawan_id_fk ON public.financial_transactions(akun_lawan_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_by_fk ON public.financial_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_journal_id_fk ON public.financial_transactions(journal_id);
CREATE INDEX IF NOT EXISTS idx_ar_ap_documents_created_by_fk ON public.ar_ap_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_ar_ap_payments_created_by_fk ON public.ar_ap_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_ar_ap_payments_document_id_fk ON public.ar_ap_payments(document_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconciliations_created_by_fk ON public.bank_reconciliations(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by_fk ON public.invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_operational_daily_logs_created_by_fk ON public.operational_daily_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_products_created_by_fk ON public.inventory_products(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by_fk ON public.inventory_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_store_sales_created_by_fk ON public.store_sales(created_by);
CREATE INDEX IF NOT EXISTS idx_cooperative_members_created_by_fk ON public.cooperative_members(created_by);
CREATE INDEX IF NOT EXISTS idx_member_savings_transactions_created_by_fk ON public.member_savings_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_member_loans_approved_by_fk ON public.member_loans(approved_by);
CREATE INDEX IF NOT EXISTS idx_member_loans_created_by_fk ON public.member_loans(created_by);
CREATE INDEX IF NOT EXISTS idx_member_loans_disbursed_by_fk ON public.member_loans(disbursed_by);
CREATE INDEX IF NOT EXISTS idx_loan_installment_payments_created_by_fk ON public.loan_installment_payments(created_by);
CREATE INDEX IF NOT EXISTS idx_cooperative_finance_settings_updated_by_fk ON public.cooperative_finance_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id_fk ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cooperative_invitations_accepted_by_fk ON public.cooperative_invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_cooperative_invitations_invited_by_fk ON public.cooperative_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_coop_memberships_auth_lookup ON public.cooperative_memberships(cooperative_id,user_id,status,role);
