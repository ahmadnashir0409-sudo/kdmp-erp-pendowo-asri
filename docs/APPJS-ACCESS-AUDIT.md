# DAGBOEK app.js Authorization and Data-Access Audit

Date: 2026-11-21
Branch: feature/multi-kdmp-license-control-center
Source audited: current app.js (9,527 lines; 395,745 bytes; unchanged source SHA at audit time: 9202cb6b9aa08b7fb4e74e90a9d40942529395dc)

## Findings

- 102 direct Supabase `.from(...)` query call sites were identified across 24 tables, plus RPC calls.
- 34 lines contain role-based authorization/menu guards or role-dependent UI behavior.
- Login currently loads only `profiles.nama_lengkap, role`, stores `{id,nama,role}` in `window.currentUser`, and chooses default page from `KDMP_ROLE_PAGES`.
- `applyRoleMenuVisibility()`, `KDMP_ROLE_PAGES`, `kdmpCanAccessPage()`, and several overwritten/wrapped `window.showPage` implementations form overlapping front-end role gating. These need consolidation, not a blind global string replacement.
- Existing user invitation UI is manager-facing and passes cooperative_id, email, password, and operational role to the legacy `invite-user` Edge Function. Both UI and function need replacement by a Super Admin-only flow.
- Query sites do not consistently include a tenant predicate. This must be enforced in database RLS and server-side routines; adding client-side `.eq('cooperative_id', ...)` alone is not a security boundary.

## Tables referenced directly by app.js

| Table | Direct query call sites |
|---|---:|
| accounts | 12 |
| journal_lines | 13 |
| journal_entries | 8 |
| inventory_products | 8 |
| member_loans | 8 |
| cooperative_members | 6 |
| bank_reconciliations | 5 |
| bank_reconciliation_items | 5 |
| inventory_movements | 5 |
| invoices | 5 |
| loan_installments | 4 |
| invoice_items | 3 |
| member_savings_transactions | 3 |
| store_sales | 3 |
| financial_transactions | 2 |
| operational_daily_logs | 2 |
| store_sale_items | 2 |
| cooperative_finance_settings | 2 |
| profiles | 1 |
| invoice_payments | 1 |
| cooperative_memberships | 1 |
| ar_ap_payments | 1 |
| loan_installment_payments | 1 |
| dabu_messages | 1 |

## Role guard locations

The following source lines contain role checks or role-based page/menu behavior and must be reviewed individually during refactor:

`530, 531, 609, 644, 695, 737, 807, 847, 2859, 3078, 4136, 4281, 4303, 5071, 5116, 5540, 5612, 5659, 5786, 5824, 5855, 5933, 6215, 7039, 7676, 8106, 8375, 9322, 9333, 9334, 9338, 9339, 9343, 9351, 9352`

Line numbers are a snapshot and may shift after edits.

## Safe refactor plan

1. Introduce one canonical authenticated session context: user ID, active cooperative ID, membership status, and license status returned from trusted database/server checks.
2. Replace front-end role restrictions with tenant/license session checks; keep all KDMP modules visible and usable to active tenant members as requested.
3. Keep Super Admin UI isolated behind a server-verified Super Admin capability. Never infer Super Admin from a client-side role field, user metadata, email string, or hidden menu.
4. Consolidate the multiple `showPage` wrappers and role menu logic only after identifying the final navigation contract. Avoid accidental regressions in module initialization.
5. Add tenant enforcement to every relevant table via RLS and to every SECURITY DEFINER RPC/trigger. The browser query layer is not the authority.
6. Update invoice, loan, store/POS, stock movement, journal automation, and reconciliation routines to resolve records/accounts within the caller's tenant.
7. Regression-test every module against existing Pendowo Asri data and a second isolated tenant.

## Explicit non-actions

- No app.js changes have been committed yet.
- No production database changes have been made.
- No production data or inventory history has been modified.
- Tutup Buku remains deferred pending a separate accounting design discussion.
