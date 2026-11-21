# DAGBOEK Multi-KDMP Readiness Audit

Date: 2026-11-21
Branch: feature/multi-kdmp-license-control-center

## Status

Read-only production audit completed for the current database schema, RLS policy inventory, foreign keys, selected trigger/function definitions, and live row counts. No production data, schema, policies, functions, or Edge Functions have been changed.

## Critical findings

1. The current database is not tenant-isolated. Of 30 public base tables inspected, only `cooperative_invitations` and `cooperative_memberships` contain `cooperative_id`. Business data tables such as accounts, inventory, journals, invoices, savings/loans, POS, members, reconciliation, and financial transactions do not.
2. RLS is enabled on all 30 inspected public tables, but enabled RLS alone does not provide tenant isolation. Several policies are global or role-only. Example: `accounts_read` has `qual = true`.
3. All inspected public tables currently have `FORCE ROW LEVEL SECURITY = false`.
4. Existing authorization is role-based and manager-driven. The `invite-user` Edge Function permits only users whose profile role is `manajer`, requires an active manager membership, and creates users with one of five operational roles. This conflicts with the intended Nusa Pixel Super Admin licensing model and equal access for KDMP users.
5. Existing SECURITY DEFINER routines contain global, non-tenant-scoped lookups and role checks. Examples include invoice journal automation, invoice payment, loan installment payment, and store transaction/cancellation routines. These must be audited and made tenant-aware before enabling multiple tenants.
6. Parent-child foreign keys currently validate record IDs but generally do not validate that both records belong to the same cooperative. Tenant-aware composite constraints or equivalent server-side checks are required.
7. Production currently contains meaningful historical data. Counts include 17 accounts, 1 cooperative member, 1 financial transaction, 6 inventory products, 19 inventory movements, 5 invoices, 19 journal entries, 56 journal lines, 16 store sales, and related child records. Preserve all rows and mutation history.

## Live tenant

- Existing cooperative: KDMP Pendowo Asri
- Cooperative ID: `a2ddfb43-7e0f-431f-9012-a098a7e3d273`
- Slug: `kdmp-pendowo-asri`
- Status: active
- Existing memberships: 2 active manager memberships

The existing historical rows are currently untagged. The safe migration must explicitly backfill them to the existing Pendowo Asri tenant before enforcing tenant policies. Never infer tenant ownership from arbitrary user input at runtime.

## Required target architecture

### Tenant data plane
- Every cooperative-owned business table receives a non-null `cooperative_id`.
- Backfill all existing Pendowo Asri rows to its known cooperative UUID.
- New rows derive tenant identity from the authenticated user's active membership on the server/database side; client-supplied tenant IDs are not trusted.
- RLS policies scope SELECT/INSERT/UPDATE/DELETE to the authenticated user's active tenant membership and active license.
- Child records must be prevented from referencing parents belonging to another tenant.
- All SECURITY DEFINER functions and triggers must resolve and enforce the same tenant boundary.
- Keep `current_stock` as the inventory source of truth; do not change stock history as part of tenant migration.

### Product control plane
- Add a protected Super Admin identity/authorization mechanism that cannot be self-assigned through profiles or user metadata.
- Super Admin can create a cooperative tenant, invite its manager, activate/deactivate/renew a license, set expiry, and inspect tenant/license status.
- License status and expiry are enforced server-side, not merely hidden in the UI.
- KDMP users receive the same module access; operational job titles do not restrict modules.
- A KDMP account can access only its own tenant. The Nusa Pixel control plane is separate from cooperative data access.

### Invitation flow
- Replace manager-driven role invitation with a Super Admin-only server-side flow.
- Create the tenant, standard chart-of-accounts seed, license record, manager auth account/profile, and membership in a controlled transaction or recoverable workflow.
- Each tenant starts with empty operational data but receives standard system structures. Existing Pendowo Asri data is preserved and remains assigned to Pendowo Asri.

## Safe implementation sequence

1. Finish source audit of all app.js data queries, role guards, Edge Functions, triggers, views, and policies.
2. Prepare migration SQL and revised Edge Function source on this feature branch; do not run against production yet.
3. Validate migration against a staging database/branch. A Supabase development branch may incur charges and requires explicit cost approval before creation.
4. Test tenant isolation with two tenants and cross-tenant read/write attempts, plus license expiry/deactivation, invitations, and existing Pendowo Asri regression flows.
5. Only after successful validation, schedule production migration with backup/rollback plan.

## Open security prerequisite

The current database inspection identifies two manager accounts but does not establish which authenticated identity belongs to the Nusa Pixel product owner. Do not promote either account based on guesswork. Super Admin bootstrap must use a verified owner identity and a server-controlled allowlist/secret or equivalent one-time secure provisioning process.

## Scope deliberately deferred

Tutup Buku is not included in this migration. It requires a separate functional/accounting design discussion before implementation.


## Product owner identity confirmation

The user explicitly designated `ahmadnashir0409@gmail.com` as the Nusa Pixel product-owner/Super Admin account. A read-only lookup confirms that this email exists in Supabase Auth, is email-confirmed, and has auth user ID `440b4978-8a65-4248-bfaa-48359288947b`.

This is the account identity to use for the protected Super Admin bootstrap. Do not change its password or alter auth state as part of this project work. The owner has forgotten the current password; the account should regain access through the normal Supabase password-recovery flow before final Super Admin activation. The app login page currently has no visible forgot-password/reset-password flow in index.html, so a recovery email should be initiated through the Supabase Auth dashboard or a deliberately implemented secure recovery flow.


## Extended database/function audit (2026-11-21)

### Complete public table inventory
The live public schema contains 30 application tables. Only `cooperative_invitations` and `cooperative_memberships` currently have `cooperative_id`. The remaining 28 tables need an explicit ownership decision before tenant enforcement:
- Core cooperative records: `accounts`, `cooperative_members`, `cooperative_finance_settings`, `business_partners`.
- Finance/accounting: `financial_transactions`, `journal_entries`, `journal_lines`, `ar_ap_documents`, `ar_ap_payments`, `bank_reconciliations`, `bank_reconciliation_items`.
- Inventory/POS/invoice: `inventory_products`, `inventory_movements`, `store_sales`, `store_sale_items`, `invoices`, `invoice_items`, `invoice_payments`.
- Savings/loans: `member_loans`, `loan_installments`, `loan_installment_payments`, `member_savings_transactions`.
- Operations and DABU: `operational_daily_logs`, `dabu_conversations`, `dabu_messages`, `dabu_user_memory`.
- Identity: `profiles` is global identity/profile data and should not simply receive a tenant ID; membership is the tenant relationship. DABU records need an explicit ownership policy (user-owned, tenant-owned, or both) before adding tenant scoping.

### Relationship and uniqueness implications
Current business foreign keys are mostly single-column ID references. For tenant safety, parent-child relationships must be strengthened so child rows cannot point to another tenant's parent. Important chains include:
- journal_lines -> journal_entries and accounts;
- financial_transactions -> accounts and journal_entries;
- inventory_movements -> inventory_products;
- store_sale_items -> store_sales and inventory_products;
- invoice_items/invoice_payments -> invoices, plus invoice_items -> inventory_products;
- ar_ap_payments -> ar_ap_documents -> business_partners;
- bank_reconciliation_items -> bank_reconciliations and journal_lines; bank_reconciliations -> accounts;
- member_loans -> cooperative_members -> loan_installments -> loan_installment_payments;
- member_savings_transactions -> cooperative_members.
Existing unique keys on human-readable numbers/codes are global (e.g. account code, invoice number, sale number, product code, member number, loan number). These should generally become tenant-scoped unique keys after duplicate checks, while primary UUID keys remain globally unique. Existing composite unique constraints in DABU and membership structures should be verified in raw pg_constraint metadata because information_schema's key-column join repeats columns for some composite keys.

### Policy inventory
There are 30 application-table policy groups in the current public schema. One `accounts` policy is unconditionally permissive (`qual = true`); most other business policies are role-gated. These policies need replacement with tenant membership + active license checks and the requested equal-module-access model. The existing profiles policy is manager-centric and must be redesigned separately so users can maintain only their own safe profile fields, without granting profile role escalation.

### Trigger and function inventory
Public-table triggers currently include:
- inventory_movements BEFORE INSERT -> `private.process_inventory_movement()`;
- journal_entries BEFORE INSERT/UPDATE -> `private.check_journal_balance()`;
- posted journal immutability triggers on journal_entries and journal_lines.

There are 15 private functions in the live schema. Tenant-sensitive SECURITY DEFINER routines requiring explicit review include:
- `auto_journal_invoice`, `auto_journal_invoice_payment`;
- `batalkan_transaksi_toko`, `proses_penjualan_toko_atomik`, `catat_jurnal_penjualan_toko`;
- `catat_transaksi_keuangan`;
- `record_invoice_journal`, `record_invoice_payment`;
- `pay_loan_installment`;
- `process_inventory_movement`.
Several currently query `accounts` by `kode_akun` without tenant context, and role-gated routines still check operational profile roles. These must be changed to resolve the caller's active cooperative and tenant-scoped account IDs; operational job titles must not gate module actions. Trigger functions must derive tenant from their source row and verify all linked records share it. No public views were found during this audit.

### Existing invitation function
The active `invite-user` Edge Function is version 6. It currently requires a caller with `profiles.role = manajer` plus an active manager membership, accepts an operational role, creates an Auth user, profile, and membership as separate service-role operations, and attempts compensating deletes on failure. It is not suitable for the Nusa Pixel licensing control plane. Replace only after designing a Super Admin-only, idempotent provisioning workflow with license checks and explicit recovery for partial failures. Do not deploy this replacement to production before staging validation.

### Security advisor snapshot
Supabase security advisors returned two Auth configuration warnings: email OTP expiry exceeds one hour, and leaked-password protection is disabled. These are Auth configuration findings, not tenant migration blockers; review and adjust deliberately in a separate security-hardening step.

### Implementation constraints
- Preserve every existing row and historical inventory/journal movement.
- Do not migrate DABU memory blindly into a cooperative tenant; decide whether user memories remain user-scoped.
- Make all human-readable unique values tenant-scoped where appropriate.
- Do not implement Super Admin as a profile role or user-editable metadata claim.
- Do not modify production schema, policies, functions, Auth settings, or data until a staging validation plan and explicit production approval exist.


## Frontend source audit correction and findings

The current `app.js` dynamically injects a password recovery flow (request reset email, handle `PASSWORD_RECOVERY`, and update the password). The earlier statement that the login page had no recovery flow was inaccurate: the UI is injected by JavaScript rather than being present in `index.html`. No recovery email or password operation was triggered during this audit.

Additional findings from the current branch source:
- `loadUserProfile()` reads `profiles.role`, stores it as `window.currentUser.role`, applies `KDMP_ROLE_PAGES`, and selects a role-dependent default page.
- Module actions and menu visibility contain role checks throughout `app.js`; these conflict with the equal-module-access requirement and need to be replaced consistently, not only by hiding menu buttons.
- Settings currently stores cooperative name, contact details, logo, and theme in browser `localStorage`, so cooperative identity is device-local rather than server-owned tenant data.
- The current “Tambah Pengguna Koperasi” UI is still the old manager invitation flow and exposes operational role selection. It must be replaced with the separate Nusa Pixel Super Admin control center.
- A likely runtime defect exists in the current invite handler: after obtaining `authenticatedUser` from `auth.getUser()`, the membership query references `user.id` rather than `authenticatedUser.id`. The identifier `user` is not defined in that handler scope. This should be corrected as part of the invitation-flow replacement, not patched as an isolated workaround.
- The frontend currently has no tenant-selection/bootstrap state and many queries assume a single cooperative. Tenant identity must be loaded from a trusted server-side membership context before any business module is enabled.
