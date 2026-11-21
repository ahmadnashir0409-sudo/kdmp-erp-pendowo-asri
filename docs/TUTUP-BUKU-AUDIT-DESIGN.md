# DAGBOEK Period Closing Audit & Design

Date: 2026-11-21
Branch: `feature/multi-kdmp-license-control-center`
Status: read-only audit and design; no production schema or data changes

## User-approved behavior

- Closing is always manual. Calendar dates never trigger a close automatically.
- Manager chooses the period end date with a date picker.
- DAGBOEK derives the period start from the previous successfully closed period. The first period requires an explicitly configured opening/start date; do not assume one.
- Until the manager completes the final close action, the period remains open and normal transaction entry continues.
- The manager reviews validation results before pressing the final **Tutup Buku** action.
- A closed period blocks backdated inserts and edits/deletes affecting that period at the database layer, not only in the UI.
- Reopening requires an explicit authorized workflow and creates an immutable audit event.
- Monthly closing does not zero out or close nominal accounts. Annual closing and SHU distribution are a separate later design.

## Repository/code audit

Source: `app.js` on this branch (9,527 lines; 395,745 bytes at audit time).

### Existing finance/report behavior

- Financial transactions are created through RPC `catat_transaksi_keuangan`, passing `p_tanggal`, transaction type, cash/counterpart accounts, amount and description.
- Manual journal entry flow inserts a `journal_entries` header with status `draft`, inserts `journal_lines`, then updates the header to `posted`.
- Existing DB triggers validate journal balance when a journal is posted and prevent edits/deletes to posted journal headers and lines.
- Profit/loss report reads posted journal lines where `journal_entries.tanggal` is between selected start/end dates.
- Balance sheet reads posted journal lines up to selected end date and calculates current surplus from income less expenses.
- Cash flow report derives movements from posted journal lines and cash/bank accounts.
- Ledger calculates opening balance from posted journal lines before selected start date and period movement within the chosen date range.
- Existing reports are date-filtered but there is no period-close state or lock integrated into their workflows.

### Inventory/reporting rule

- `inventory_products.current_stock` is the agreed operational stock source of truth.
- Inventory movements are recorded in `inventory_movements`; a BEFORE INSERT trigger `private.process_inventory_movement()` processes movement and stock values.
- Closing must snapshot stock quantities/valuation as of the close boundary without overwriting `current_stock`, changing historical movements, or rebuilding inventory history.
- The legacy `inventory_products.stock` column remains a separate known technical issue; do not use it as the closing stock value.

## Production database audit (read-only)

Project: `srfhamdyewblyuangxzz`.

### Relevant structures confirmed

- `accounts`: COA with `kategori` and `saldo_normal`.
- `journal_entries`: `tanggal`, `status`, journal number and description.
- `journal_lines`: account, debit and credit.
- `financial_transactions`: `tanggal`, transaction type, cash/counterpart account, amount and linked journal.
- `inventory_products`: both legacy `stock` and `current_stock`.
- `inventory_movements`: quantity, stock_before/stock_after, movement date and cost.
- Supporting date-bearing tables include invoices/payments, store sales, accounts receivable/payable documents/payments, bank reconciliations, savings transactions, loans, installments and installment payments.
- No public table or database function with a closing/period name was found in the inspected catalog.
- All inspected public tables have RLS enabled. Existing tenant migration remains incomplete; do not mistake current RLS for a future complete tenant-aware close design.

### Existing trigger protections observed

- `journal_entries`: journal balance validation on insert/status update; posted journal header update/delete protection.
- `journal_lines`: posted journal line insert/update/delete protection.
- `inventory_movements`: inventory processing BEFORE INSERT.
- These protections do not constitute a general period-close lock. In particular, they do not prove that invoices, sales, payments, loan/savings activity, inventory movements or a financial RPC are blocked when a period is closed.

### Data snapshot at audit time

Catalog/statistics and prior verified row counts show active history exists: 17 accounts, 19 posted journal headers, 56 journal lines, 6 inventory products, 19 inventory movements, 5 invoices, 8 invoice items, 8 invoice payments, 16 store sales, 17 store sale items, plus supporting bank/savings/loan data. Row statistics are estimates where sourced from PostgreSQL table statistics; do not use them as a reconciliation assertion.

## Critical implementation requirements

1. **No calendar auto-close.** Dates are inputs only. No scheduled job or date-triggered status transition.
2. **Period boundary continuity.** A period start is previous closed `period_end + 1 day`; first-period start must be explicitly configured. Reject overlaps, gaps where continuity is required, and duplicate closes.
3. **Database-authoritative lock.** A transaction touching a closed accounting date must be rejected by trusted database logic, including RPC paths and direct table writes. Frontend disabling is only usability, never security.
4. **Concurrency safety.** Finalize must lock the cooperative's period sequence and relevant rows so a concurrent transaction cannot slip in between validation/snapshot and close. The finalize operation must be atomic.
5. **No partial close.** If validation, snapshot, or audit write fails, no closed status is committed.
6. **Idempotency.** Retrying a close request cannot create duplicate snapshots or duplicate closing journals.
7. **Immutable evidence.** Store the selected range, close timestamp, actor, validation results, report totals, COA balances, stock snapshot, and snapshot version/hash. Preserve an append-only audit trail.
8. **Reopen flow.** Reopen requires a reason and authorized manager action, preserves the prior close snapshot and events, marks the period reopened, and records subsequent re-close as a new event/version.
9. **No monthly nominal-account closing journal.** Monthly closing freezes and snapshots only. Annual closing/SHU is out of scope until separately specified.
10. **Preserve source history.** Never delete/rewrite existing journals, inventory movements, invoice/payment history, store sales or other operational records as part of period closing.

## Proposed logical model (not yet implemented)

- `accounting_periods`: period id, tenant/cooperative id, start/end date, status (`open`, `closing`, `closed`, `reopened`), created/closed/reopened metadata, sequence/version.
- `accounting_period_snapshots`: immutable close snapshot per period/version; report totals and structured balances/stock valuation snapshot, snapshot timestamp and content hash.
- `accounting_period_events`: append-only audit events for created, validation, closed, reopened and re-closed actions; actor, reason, timestamp, metadata.
- Optional structured child tables for per-account and per-product snapshot rows if JSON snapshot size/queryability requires it.

All three must be tenant-scoped before multi-KDMP rollout. Tenant identity must be resolved from trusted membership context, not accepted blindly from the browser.

## Validation checklist for the pre-close review

- All posted journals in range are balanced.
- No invalid/draft journals remain that the cooperative requires to be posted before close (show them clearly; final policy still needs owner confirmation).
- No orphan transaction-to-journal references or inconsistent source/journal dates.
- Required invoice/payment and store sale records are internally consistent.
- Bank reconciliation status/differences are shown; whether unresolved differences block close is a business-policy decision.
- Receivable/payable and savings/loan subledgers are summarized and reconciled to their control accounts where mappings exist.
- Stock snapshot uses `current_stock`; negative stock, movement errors, or missing cost basis are warnings/blockers according to an explicitly agreed policy.
- Trial balance balances (total debit = total credit); balance sheet equation is checked.
- All warnings/blockers are shown before final manager confirmation.

## Open design decisions before schema implementation

- First period start date for Pendowo Asri (must not be guessed).
- Whether the selected end date may be any day or must be the 25th by default; the UI should allow a manually selected date either way per current conversation.
- Which validation conditions are hard blockers versus warnings.
- Whether invoices/sales/payments created in one period but paid in a later period are recognized by invoice date, payment date, or linked journal posting date. The accounting journal date should remain the authoritative basis for financial statements; operational subledger summaries should display their own event dates and reconcile clearly.
- Which user membership roles may close/reopen. Existing UI checks role names, but final authorization must be server-side and compatible with the planned equal-access tenant model.

## Safety status

No production DDL, DML, policy, trigger, function, deployment, or migration was executed for this feature. This document is a design artifact only. Production migration history has a known version-format mismatch with checked-in migration filenames; do not use `db push`, migration repair, or production migration application until that drift is reconciled.


## Development test harness added (branch only)

A standalone PostgreSQL contract test now lives at `supabase/tests/period_closing_contract.sql` and is wired into `.github/workflows/dagboek-free-regression.yml`. It uses a disposable `close_test` schema and synthetic cooperative IDs only. It covers:
- first-period start must be explicit;
- next period begins the day after the last successfully closed period;
- a closed period rejects backdated writes while the next open period and another cooperative remain unaffected;
- duplicate close attempts are rejected;
- reopening requires a reason and is blocked when a later period already exists;
- a permitted reopen increments the version and a re-close creates a second immutable snapshot;
- snapshot and event rows reject update/delete.

This is a contract harness, not production application code. It deliberately does not introduce a Supabase migration because current journal and operational tables do not yet have a reliable cooperative/tenant key. Applying period lock triggers before tenant ownership is established could either lock the wrong cooperative or fail to lock some records. The database implementation must follow the tenant migration and its cross-tenant FK/RLS tests.
