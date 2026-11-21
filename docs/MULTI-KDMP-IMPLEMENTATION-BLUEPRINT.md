# DAGBOEK Multi-KDMP Implementation Blueprint

Date: 2026-11-21
Target branch: `feature/multi-kdmp-license-control-center`
Status: design artifact only; no production DDL or deployment

## Product behavior

DAGBOEK is a multi-tenant ERP product operated by Nusa Pixel.

- Nusa Pixel Super Admin is the only identity allowed to create/activate tenants, invite the initial manager, manage license status, and set/renew expiry.
- Every KDMP receives one isolated tenant. Its manager logs in with an individual Auth account.
- A newly provisioned KDMP starts with empty operational data and receives only standard reference structures (default COA and default finance settings).
- Existing KDMP Pendowo Asri remains intact. Its existing rows must be backfilled to cooperative ID `a2ddfb43-7e0f-431f-9012-a098a7e3d273`.
- Every active KDMP user has equal access to ERP modules. Job title may remain as descriptive profile information but is not an authorization boundary.
- Tenant isolation and license enforcement must be server-side (RLS + trusted database routines), never only frontend filtering.
- Login must never clear or reseed existing tenant data.

## Identity and authorization model

### Super Admin
Use a protected table in a non-exposed schema (for example `private.super_admin_allowlist`) keyed by immutable Auth user UUID. Seed the confirmed product-owner UUID `440b4978-8a65-4248-bfaa-48359288947b` through a controlled migration/bootstrap. Do not authorize based on `profiles.role`, `user_metadata`, or user-editable `app_metadata`.

Only narrowly scoped server/database routines should read this allowlist. Revoke direct table access from `anon` and `authenticated`. Add audit records for Super Admin actions.

### Tenant membership
Resolve the current tenant from `cooperative_memberships` using `auth.uid()` and `status='active'`. If the product later permits one user in multiple KDMPs, introduce an explicit active-tenant selector backed by membership validation; never trust a raw client-supplied cooperative ID.

### License
Create a tenant license record with:
- cooperative_id (one current license per tenant, with history retained);
- status (trial/active/suspended/expired/cancelled as finalized);
- starts_at, expires_at;
- plan_code and duration metadata;
- created_by, updated_by, created_at, updated_at;
- reason/audit event history for activation, suspension, renewal, and expiry.

All business RLS predicates and privileged RPCs must check both active membership and an allowed license state/time window. A suspended/expired license should block business mutations and normal business reads according to final product policy, while still allowing login to a restricted renewal/contact screen.

## Data ownership matrix

### Cooperative-owned: add cooperative_id
- accounts
- ar_ap_documents
- ar_ap_payments
- bank_reconciliation_items
- bank_reconciliations
- business_partners
- cooperative_finance_settings
- cooperative_members
- financial_transactions
- inventory_movements
- inventory_products
- invoice_items
- invoice_payments
- invoices
- journal_entries
- journal_lines
- loan_installment_payments
- loan_installments
- member_loans
- member_savings_transactions
- operational_daily_logs
- store_sale_items
- store_sales

### Needs explicit product decision before migration
- dabu_conversations and dabu_messages: likely tenant-owned plus user-owned access checks, but confirm whether a user can carry DABU conversation history across KDMP memberships.
- dabu_user_memory: user-scoped personal assistant memory; do not force it into a tenant without an explicit product decision.
- profiles: global Auth profile keyed by Auth UUID; membership is the tenant relationship. Never use profiles.role as the Super Admin source of truth.

Existing cooperative_invitations and cooperative_memberships already carry cooperative_id.

## Tenant-safe relational integrity

Keep globally unique UUID primary keys. Add tenant-scoped unique constraints where human-facing values are naturally repeated between KDMPs, after checking existing duplicates:
- accounts (cooperative_id, kode_akun)
- cooperative_members (cooperative_id, member_number)
- financial_transactions (cooperative_id, nomor_transaksi)
- inventory_products (cooperative_id, product_code)
- invoices (cooperative_id, invoice_number)
- journal_entries (cooperative_id, nomor_jurnal)
- loan_installment_payments (cooperative_id, payment_number)
- member_loans (cooperative_id, loan_number)
- member_savings_transactions (cooperative_id, transaction_number)
- store_sales (cooperative_id, sale_number)
- ar_ap_documents (cooperative_id, nomor)

Add composite unique keys on parent tables as needed and composite foreign keys on child tables so same-tenant relationships are enforced by Postgres, not merely by UI:
- journal_lines -> journal_entries and accounts
- financial_transactions -> accounts and journal_entries
- inventory_movements -> inventory_products
- store_sale_items -> store_sales and inventory_products
- invoice_items -> invoices and inventory_products
- invoice_payments -> invoices
- ar_ap_documents -> business_partners; ar_ap_payments -> ar_ap_documents
- bank_reconciliations -> accounts; bank_reconciliation_items -> bank_reconciliations and journal_lines
- member_loans -> cooperative_members; loan_installments -> member_loans; loan_installment_payments -> loan_installments
- member_savings_transactions -> cooperative_members

Preserve existing FK semantics and ON DELETE behavior unless the migration explicitly proves a change is safe.

## Provisioning workflow

The control center should call a single Super Admin-only Edge Function. It should:
1. Authenticate the bearer token with Supabase Auth `getUser`.
2. Authorize the caller using the protected Super Admin allowlist, not a client-supplied role.
3. Validate cooperative identity, manager email, initial password, and license duration.
4. Use an idempotency key/request record to avoid duplicate tenant creation on retries.
5. Create the cooperative and license record.
6. Create the manager Auth user with a generated/entered initial password, confirmed email only according to the agreed onboarding policy.
7. Create the profile and active membership.
8. Seed the tenant's default COA and finance settings only; do not create operational transactions/members/products.
9. Return the tenant ID and manager login email, but never echo the password in logs or persist it in plaintext.
10. If any step fails, persist a recoverable provisioning state and safely retry/compensate without leaving an invisible orphan Auth user or half-created tenant.

Because Auth Admin user creation and Postgres writes are not one atomic transaction, implement this as a recoverable saga with explicit provisioning states and cleanup/retry logic, not as a promise of cross-service atomicity.

## Frontend changes

- Replace the manager-only “Tambah Pengguna” card with a Super Admin-only Control Center / Manajemen Lisensi route.
- Super Admin sees tenant list, create/invite flow, license status, activation/deactivation, expiry and renewal controls.
- KDMP users do not see Super Admin controls.
- Remove role-based module hiding and role checks from module actions only after server policies/RPCs have been migrated to equal tenant-member access.
- On login, load a trusted membership/tenant context and license state before rendering ERP modules.
- Load cooperative profile/settings from tenant-owned database records, not localStorage as the source of truth.
- Keep theme preference local to the device.
- Use explicit loading/error/expired states; do not show an empty dashboard if tenant context fails to load.

## Database migration sequence

1. Create protected control-plane tables and helper functions in a non-exposed schema.
2. Add nullable cooperative_id to all cooperative-owned tables.
3. Backfill every existing row to Pendowo Asri's known UUID; assert zero nulls and no rows left unassigned.
4. Add indexes and tenant-scoped unique constraints.
5. Add tenant-aware composite FKs and validate them.
6. Replace role-only/global RLS policies with membership + license policies.
7. Audit and replace every SECURITY DEFINER routine and trigger with fixed search_path, explicit auth checks, tenant resolution, and tenant-scoped lookups.
8. Add FORCE ROW LEVEL SECURITY where appropriate after testing service-role/admin flows and table ownership.
9. Seed protected Super Admin allowlist and Pendowo Asri license.
10. Run cross-tenant and regression tests before production release.

Do not combine every phase into one unreviewable migration. Keep rollback and data verification checkpoints between phases.

## Test matrix required before production

- Tenant A cannot SELECT, INSERT, UPDATE, or DELETE Tenant B rows in every business table.
- Child row cannot reference a parent or account from another tenant.
- Same account codes, product codes, invoice numbers, journal numbers, member numbers, and sale numbers may safely exist in two different tenants.
- All active members of one KDMP can use all modules irrespective of descriptive job title.
- Expired/suspended tenant cannot perform protected business operations; owner can renew/reactivate.
- Super Admin cannot be impersonated by editing profile role or user metadata.
- A non-owner cannot access tenant creation, license mutation, or invitation endpoints.
- New tenant has default COA/settings but zero operational records.
- Pendowo Asri retains every original row, journal, invoice, stock movement, and current_stock value.
- Inventory regression verifies current_stock remains the only stock truth and existing movement history remains immutable.
- Invitation retries, duplicate emails, Auth failures, and partial provisioning recover safely.
- DABU data ownership and tenant boundaries are explicitly tested after the product decision.

## Current blockers / safety gates

- No Supabase staging branch has been created because it may incur compute charges; obtain explicit cost approval first.
- No production DDL, RLS policy, function, Auth setting, or data mutation has been performed.
- Do not deploy the replacement invitation function until the protected control-plane schema exists and staging tests pass.
- Do not implement Tutup Buku in this workstream; discuss its accounting behavior separately after the license/invitation flow is complete.
