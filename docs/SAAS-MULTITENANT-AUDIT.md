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
