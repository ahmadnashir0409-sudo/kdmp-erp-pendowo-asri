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


## DABU AI architecture and hybrid commercial model

### Product decision (2026-11-21)

DABU will use a **hybrid entitlement model** for multi-KDMP:

- Every eligible KDMP receives a configurable basic monthly AI allowance included with its DAGBOEK plan.
- A KDMP that needs more usage can purchase an additional quota/top-up or a higher AI allowance plan.
- The basic allowance, paid allowance, model access, and usage limits are controlled centrally by Nusa Pixel Super Admin.
- No KDMP can consume another KDMP's allowance or paid balance.
- The Rp25,000/month limit is the initial pilot operating budget target, not a promise of unlimited usage and not the permanent per-tenant allowance. The pilot must stay within this cap until Nusa Pixel explicitly changes it.
- Initial pilot allocation proposal: up to Rp20,000 estimated API spend, with Rp5,000 held as a safety buffer for exchange-rate variance, token-estimation error, and provider billing differences. This is a control target, not a guaranteed provider-side hard cap.

### Model-routing policy

- Phase 1: use one verified, low-cost text model for all requests. Do not ship an unverified model identifier. Confirm current API model availability and pricing from official provider documentation before enabling it.
- Keep model name, per-token price assumptions, output limit, and routing rules in server-side configuration, not in app.js.
- Phase 2: optionally add a stronger model for explicitly classified complex accounting/reporting questions. It must have a separate per-tenant allowance and stricter limits. Do not silently route every message to the expensive model.
- Do not claim DABU can execute transactions. The initial assistant remains read-only; any future write-capable tools require separate authorization, approval, audit, and idempotency design.

### Tenant quota and billing ledger

Create a dedicated AI usage/billing subsystem, separate from cooperative accounting journals:

- dabu_plan_entitlements: plan code, included monthly units/budget, allowed model tier, monthly reset rule, active dates, and configuration version.
- dabu_tenant_wallets (or equivalent balance ledger): cooperative_id, purchased units/credit, currency, status, and timestamps. Treat ledger entries as immutable; calculate balance from credits/debits or maintain a transactionally reconciled balance.
- dabu_usage_events: cooperative_id, user_id, request_id/idempotency key, conversation_id, model, input/output/cached token counts when available, estimated cost, provider-reported cost when available, entitlement bucket (included/top-up), status, and timestamps.
- dabu_credit_transactions: immutable grant, purchase, expiry, adjustment, and consumption records with actor and reason. Never let the browser write these rows directly.
- dabu_monthly_usage: optional aggregate/cache only; source of truth remains immutable usage and credit ledger records.
- Use integer minor currency units (for IDR, whole rupiah) or a fixed-precision numeric type. Never use floating point for wallet arithmetic.

### Request lifecycle and hard application-side guard

1. Authenticate the user and resolve the active cooperative from trusted membership context; never trust a client-supplied cooperative_id.
2. Check tenant license status and DABU entitlement.
3. Atomically reserve a conservative maximum request cost against the tenant's included allowance first, then eligible purchased credits. The reservation operation must be a trusted database RPC/transaction with row locking or equivalent concurrency control to prevent simultaneous requests overspending the same balance.
4. Enforce per-request input/output limits and model allowlist. Trim conversation history and fetch only the minimum tenant-scoped context needed.
5. Call the provider from the Edge Function using a server-side API key. Never expose provider keys to browser code, logs, prompts, or users.
6. Record provider usage and reconcile the reservation to actual usage. Release unused reserved amount; record any discrepancy safely.
7. If the provider fails, apply the documented reservation-release/refund rule and retain a sanitized error event.
8. If allowance and purchased credits are exhausted, fail closed with a clear quota-exhausted response. Do not silently continue on an unmetered fallback.
9. Apply rate limits per user and per tenant, plus global concurrency limits, to reduce abuse and cost spikes.

### Allowance, paid add-ons, and commercial rules

- Nusa Pixel configures the included monthly allowance per DAGBOEK subscription/license plan. The allowance can be zero, a small fixed number of requests, or a token/cost budget; prefer token/cost accounting over raw message counts because message sizes vary.
- Unused included allowance expires at the monthly reset unless a later commercial policy explicitly allows rollover.
- Paid top-ups are tenant-specific, have explicit validity/expiry terms, and cannot be transferred between tenants.
- Paid credit is activated only after a verified payment-provider webhook or an authorized Super Admin adjustment. Never trust a browser payment-success redirect.
- Define refund, expiry, failed-payment, chargeback, and cancellation handling before public sale.
- Show each tenant its included allowance, consumed amount, remaining amount, paid balance, and recent usage. Show Super Admin aggregate spend, tenant-level consumption, provider-reported costs, and alerts.
- Keep DABU AI credits separate from cooperative financial accounting. If Nusa Pixel later invoices AI usage, create auditable billing records; do not post directly to a KDMP's operational books without an explicit accounting workflow.

### Budget controls and alerts

For the initial pilot:
- Target maximum estimated API spend: Rp20,000/month.
- Hold Rp5,000 as an unallocated safety buffer.
- Alert at 50%, 75%, and 90% of the pilot API-spend target.
- At 100% of the configured application-side spend ceiling, block new paid-provider requests until the next period or an authorized budget increase.
- Reconcile internal estimates against provider usage/billing daily. Provider billing dashboards/limits are an additional safeguard, not a replacement for application-side metering.
- Because provider-side spend reporting may be delayed and token estimates are imperfect, keep a safety margin and use conservative reservations. Do not promise an absolute zero-overrun guarantee.

### Data isolation, privacy, and security

- Every usage, entitlement, wallet, and credit record is cooperative-scoped and protected by RLS plus trusted server-side authorization.
- Users can see only their own conversation history and the usage view permitted by their tenant role; tenant managers can see their tenant's aggregate usage.
- Super Admin can administer plans and inspect platform-wide billing metadata, with audit logs. Do not expose message contents unnecessarily in billing dashboards.
- Do not send secrets, credentials, payment details, or unrelated tenant records to the model.
- The Edge Function must use the authenticated user's JWT and tenant-scoped queries. A service-role key, if ever needed for a narrowly scoped operation, must remain server-side and must not bypass tenant checks.
- Keep DABU conversations/messages ownership policy explicit: user-scoped access within the active tenant, with tenant_id recorded on each conversation. Do not allow a user to switch tenants and read another tenant's chat history merely by supplying a conversation UUID.
- Preserve user-scoped dabu_user_memory unless a separate product decision changes it. Do not automatically share personal memory across KDMPs.

### Rollout and acceptance criteria

1. Audit the current dabu-assistant Edge Function, its model identifier, context queries, JWT handling, conversation ownership, and existing database policies.
2. Verify model availability, official token pricing, and provider billing controls. Replace the currently configured model identifier only after verification.
3. Design and test entitlement/usage ledger migrations in an isolated test database; do not apply them to production during the design phase.
4. Add atomic reservation/reconciliation RPCs and tenant-scoped RLS policies.
5. Add per-tenant usage display and Super Admin cost monitoring.
6. Test concurrent requests, retries/idempotency, provider errors, token-limit enforcement, exhausted free allowance, exhausted top-up balance, failed/late payment webhooks, and monthly reset.
7. Test that Tenant A cannot read, reserve, spend, or refund Tenant B's allowance or credits.
8. Test that a request is blocked when the pilot global spend ceiling is reached.
9. Only after all tests pass, request explicit approval before any production schema/function deployment or enabling billable API calls.

No provider API key has been added, no AI billing account has been charged, and no production DABU function or database schema has been changed as part of this design update.
