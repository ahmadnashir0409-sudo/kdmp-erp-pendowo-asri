# Multi-KDMP Architecture and Migration Plan

Status: audit/design only; not production-applied.

## Decision
Use one Supabase project with PostgreSQL-enforced tenant isolation. Every cooperative-owned record receives `cooperative_id`. Authorization is derived from `cooperative_memberships` for the selected tenant, not from the global `profiles.role`. Nusa Pixel Super Admin is a separate allowlisted platform principal in `platform_admins`, not a cooperative manager.

## Audit findings
- Existing active cooperative: KDMP Pendowo Asri.
- `cooperative_invitations` and `cooperative_memberships` already contain `cooperative_id`; 23 operational tables do not.
- Existing business row counts: accounts 18; bank_reconciliations 3; cooperative_finance_settings 1; cooperative_members 1; financial_transactions 1; inventory_movements 19; inventory_products 6; invoice_items 8; invoice_payments 8; invoices 5; journal_entries 22; journal_lines 62; loan_installment_payments 1; loan_installments 12; member_loans 1; member_savings_transactions 1; store_sale_items 17; store_sales 16. Other listed operational tables are currently empty.
- RLS currently uses global profile roles in multiple tables, which is not safe for multiple tenants.
- Current `invite-user` creates Auth user/profile/membership immediately from email + manager-supplied password. It does not create a pending invitation or send a tokenized email.
- Tenant-sensitive relationships include accounts/journal_lines, journal_entries/journal_lines, inventory_products/inventory_movements and invoice_items, invoices/invoice_items and invoice_payments, store_sales/store_sale_items, cooperative_members/member_loans and savings, member_loans/installments/payments, bank_reconciliations/items.
- Triggers/RPCs requiring tenant validation include inventory movements, journal integrity/immutability, savings and loan journal creation, invoice atomic save, POS sale/cancel, and loan disbursement.

## Migration phases
1. Audit exact tenant UUID, all tables, functions, views, triggers, grants, storage policies, and frontend reads/writes. Verify a backup/restore point.
2. Add nullable `cooperative_id` to every tenant-owned table; backfill existing rows to Pendowo Asri; verify unchanged row counts and zero nulls; then enforce NOT NULL, FK, indexes, and composite parent-child tenant-safe FKs. Add `platform_admins` and license metadata. No new tenants enabled yet.
3. Replace global role checks with tenant-scoped helpers and RLS. Update every RPC/trigger to validate tenant ownership. Review function grants, views (`security_invoker`), storage, and Data API exposure. Add cross-tenant tests.
4. Replace direct user creation with invitation lifecycle: cryptographically random token, store only hash, expiry, role, cooperative_id, inviter, single-use acceptance, resend/revoke/expire, email match, idempotent acceptance, existing-user support. Configure transactional email provider and verify delivery.
5. Add tenant picker and selected cooperative context. Update all reads/writes/reports/POS/inventory/invoice/journal/savings/loans/DABU/settings. Derive role from active membership; never trust client-supplied tenant ID without database membership validation.
6. Build separate Nusa Pixel Super Admin console for tenant lifecycle, license status, membership/invitation overview and audit. Global financial/member data access is denied by default; support access requires time-limited audited break-glass.
7. Test two disposable tenants, multiple roles, cross-tenant CRUD denial on every table and RPC, composite FK rejection, and full regression of POS/inventory/invoice/journal/savings/loan/reconciliation. Verify Pendowo Asri history, stock, balances and row counts unchanged apart from tenant ownership metadata. Deploy schema, functions and frontend together.

## Blockers
- Transactional email provider, verified sender and credentials not yet evidenced.
- Super Admin bootstrap Auth user UUID not yet confirmed.
- Prior audit noted Auth OTP expiry >1 hour and leaked-password protection disabled; fix in Dashboard.
- Supabase no longer automatically exposes new public tables to Data API by default; verify explicit grants/exposure.

## Safety rules
No delete/truncate of business data. Do not edit historical movements, journals, invoices, POS, savings or loan rows. No automatic stock or monetary recalculation. No production migration until tested and restore plan reviewed. No tenant onboarding until database, Edge Functions and frontend are all tenant-safe.
