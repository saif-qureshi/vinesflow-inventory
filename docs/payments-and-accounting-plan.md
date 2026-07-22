# Payments & Books (Accounting) Plan

Status: **design**. Aligns Vineflow's payment capture with the `~/projects/accountings`
blueprint so that adopting its GL later is a **drop-in**, not a rewrite.

Two parts:
- **Part A — Payments** (build now): record money in/out, settle invoices/bills.
- **Part B — Books / GL** (later): the accountings-derived ledger it plugs into.

The bridge between them is one idea: **`submit` is the single accounting
boundary.** Applying a payment to a document happens on submit; that is the exact
place Books will add its `post voucher` call. Nothing else changes.

---

## Part A — Payments (Phase 2)

### A.1 Principles (mirrored from accountings)

1. A payment is a **header + allocations**, with a **draft → submitted →
   cancelled** lifecycle.
2. **Apply-on-submit.** Draft is a pure record — no effect on documents. On
   **submit**, allocations post to the documents (and later, to the GL). **Cancel**
   reverses.
3. Track three amounts: `amount`, `allocated_amount`, `unapplied_amount`.
4. Separate a document's **lifecycle status** from its **settlement status**.
5. No hard delete of a submitted payment — cancel keeps the audit trail.

### A.2 Data model (one autogen migration)

**`payments`** — header
| column | notes |
|---|---|
| `id, org_id` | |
| `direction` | `received` \| `made` (money in vs out) |
| `number` | `PAY-0001` / `PMT-0001` via existing `document_sequences` |
| `party_id` | customer (received) / vendor (made) |
| `party_name` | snapshot |
| `document_date`, `posting_date` | posting_date = the GL/period date |
| `method` | `cash · bank · cheque · card · other` |
| `status` | `draft · submitted · cancelled` |
| `amount, allocated_amount, unapplied_amount` | Numeric(18,2) |
| `reference, notes` | |
| `submitted_at, submitted_by_id, cancelled_at, cancelled_by_id` | state audit |
| `+ AuditMixin, timestamps` | |

**`payment_allocations`** — one payment settling one or more documents
`id · payment_id · document_id · document_number (snapshot) · amount` — unique `(payment, document)`.

**Document changes** (the status split — free to do now, no doc has ever been paid):
- `status` keeps **lifecycle only**: `draft · sent · void` (drop the settlement
  values from use).
- add **`payment_status`**: `unpaid · partial · paid` (default `unpaid`).
- `amount_paid` already exists; `balance_due = total − amount_paid`.
- UI badge derives from both: `void → Void`, `draft → Draft`, else the
  `payment_status` (Unpaid/Partial/Paid). One badge, correctly sourced.

### A.3 Lifecycle & rules

**create / edit (draft)** — validate each allocation:
- document belongs to org, **same party**, is **finalized** (`status == sent`),
- **direction matches** (received → invoices, made → bills),
- alloc ≤ document `balance_due`, and Σalloc ≤ payment `amount`,
- `unapplied_amount = amount − allocated_amount`.
No document or ledger effect yet.

**submit** (draft → submitted):
1. `_apply_allocations(+1)`: for each, `document.amount_paid += alloc`, recompute
   `payment_status` (`paid` if `amount_paid ≥ total`, else `partial`, else `unpaid`).
2. **[Books seam]** `ledger.post_payment(payment)` — no-op today (see §A.6).
3. stamp `submitted_at/by`, set status.

**cancel** (→ cancelled):
1. **[Books seam]** `ledger.reverse_payment(payment)`.
2. `_apply_allocations(−1)`: reverse `amount_paid`, recompute `payment_status`.
3. stamp `cancelled_at/by`.

A document can only be voided when `amount_paid == 0` (already enforced) — so a
paid invoice must have its payment cancelled first.

### A.4 API — same factory as documents

`register_payment_routes(path, direction, module="payments")` mounts per direction:
- `/payments-received` (Sales), `/payments-made` (Purchases): list · get · create ·
  update (draft) · **submit** · **cancel**.
- `GET /documents/outstanding?party_id=&direction=` — open invoices/bills for the
  allocation picker.

RBAC `payments` module already exists.

### A.5 UI (reuse the shared-component pattern)

- **"Record Payment"** on the invoice/bill view (when `sent` & `balance_due > 0`)
  → modal pre-filled with that doc + its outstanding; creates **and** submits in
  one click (draft stays available for save-without-posting).
- **Payment modal**: party, dates, amount, method, reference + allocation rows
  (each outstanding doc with an apply amount; "apply full" helper); shows
  unapplied remainder.
- **Payments Received / Payments Made** list pages — one shared `PaymentList`
  parameterized by direction (like `DocumentList`).
- **Payment view** — allocations + which docs it settled + lifecycle actions.

### A.6 The accounting seam (what makes Books a drop-in)

Introduce a thin **`LedgerPoster`** protocol now, with a **null implementation**
wired in the DI container:

```
class LedgerPoster(Protocol):
    def post_payment(self, payment) -> None: ...
    def reverse_payment(self, payment) -> None: ...
    def post_document(self, document) -> None: ...
    def reverse_document(self, document) -> None: ...

class NullLedgerPoster:  # today: does nothing
    def post_payment(self, payment): pass
    ...
```

`PaymentService.submit` already calls `self.ledger.post_payment(payment)`;
`DocumentService.finalize` already calls `self.ledger.post_document(doc)`. Today
these hit the null poster. When Books lands, we swap in a real poster — **the
operational services never change.** The payment already stores everything a
poster needs (amounts, allocations, party, `posting_date`, method).

### A.7 Build order & tests

Backend engine + tests first (mirroring the accountings capture flow: draft/submit/
cancel, allocation validation, payment_status recompute, unapplied), then the
record-payment modal + two list pages + view.

---

## Part B — Books / GL (later, blueprint from accountings)

Additive product. Nothing in Part A changes; the null poster is replaced.

### B.1 Tables (translated to Vineflow's stack)

- **`accounts`** — chart of accounts: `code, name, account_type
  (asset·liability·equity·income·expense), normal_balance (debit·credit),
  parent_id, is_control_account, is_postable, is_active`.
- **`accounting_vouchers`** (+ **`voucher_lines`**) — the journal entry:
  header (`type, document_no, document_date, posting_date, status, total_debit,
  total_credit`) + lines (`account_id, party_id, debit, credit, description`).
- **`ledger_entries`** — the posted GL, one row per voucher line, denormalized for
  reporting: `account_id, party_id (subledger), voucher_id, voucher_type,
  posting_date, debit, credit, fiscal_year_id, accounting_period_id, status`.
- **`fiscal_years`, `accounting_periods`** — period management (post into open
  periods only).
- **account-mapping settings** — `ar_account`, `ap_account`, `cash_account`,
  `bank_account`, `sales_revenue`, `sales_tax_payable`, `input_tax`, `inventory`,
  `cogs`, `grni`, … → the postable account for each role.

Seeded chart (from accountings): Cash 1110 · Bank 1120 · AR 1130 · Inventory 1140 ·
Input Tax 1150 · AP 2110 · Sales Tax Payable 2120 · GRNI 2130 · Owner Equity 3100 ·
Retained Earnings 3200 · Sales Revenue 4100 · COGS 5100 · Operating Expenses 5200.

### B.2 PostingService (from accountings)

- `post_voucher(lines)` — validate balanced (Σdebit == Σcredit), resolve open
  period, assign voucher number, write voucher + lines + ledger entries.
- `reverse_voucher(voucher)` — post a mirror (swap debit/credit), mark original
  reversed.
- AR/AP are **control accounts** — carry the **party** on the ledger line so the
  subledger (per customer/vendor) reconciles to the control balance.

### B.3 The posting map (Dr/Cr per source)

| Event (on submit/finalize) | Debit | Credit |
|---|---|---|
| **Invoice** finalized | AR *(party)* — total | Sales Revenue — subtotal; Sales Tax Payable — tax |
| *(perpetual)* | COGS — cost | Inventory — cost |
| **Payment Received** | Cash/Bank *(by method)* — amount | AR *(party)* — amount |
| **Bill** finalized | Inventory/Expense — subtotal; Input Tax — tax | AP *(party)* — total |
| **Payment Made** | AP *(party)* — amount | Cash/Bank — amount |
| **Credit Note / Vendor Credit** | reverse the invoice/bill signs | |

### B.4 Adoption steps (when Books starts)

1. Add the tables (§B.1) + seed the chart & account mapping per org.
2. Implement `RealLedgerPoster` (post/reverse voucher) and bind it in the DI
   container in place of `NullLedgerPoster`.
3. **Backfill**: replay `post_document` / `post_payment` over existing finalized
   documents and submitted payments to build historical ledger entries — possible
   precisely because Part A stored the complete, immutable trail.
4. Reports: Trial Balance, P&L, Balance Sheet, AR/AP aging (aging already
   derivable from documents' `payment_status` + `balance_due`).

---

## Decisions folded in (confirmed direction)

- Payments use the **draft → submit → cancel** lifecycle; apply-on-submit is the GL seam.
- Documents get a **`payment_status`** split from lifecycle `status` (done now, free).
- Prefixes **PAY** (received) / **PMT** (made) via `document_sequences`.
- A **null `LedgerPoster`** ships now so `submit`/`finalize` already call the seam.
