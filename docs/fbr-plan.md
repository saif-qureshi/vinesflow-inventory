# FBR Digital Invoicing Plan

Status: **in progress** (Step 1). FBR is an **optional, per-org** integration —
off unless an org enables it and configures a token.

Reference: PRAL "Technical Specification for DI API v1.12". Prior art studied:
`~/projects/erp-system` (Laravel, the original) and `~/projects/accountings`
(NestJS, copied its shape). Both converge on the same small design.

## Principles

1. **Opt-in per org** — nothing FBR touches an org that hasn't enabled it.
2. **Non-blocking** — if FBR is down or rejects, the invoice still finalizes;
   it is marked failed and can be retried. A tax-authority hiccup never loses a sale.
3. **Reference data + testing are platform-managed** — the FBR code lists are
   global/shared; sandbox scenario testing is a platform-admin job (later).
4. **Validate before post** — dry-run every invoice against `validateinvoicedata`
   before `postinvoicedata`.
5. **Sales only** — FBR is for what you issue: invoices + credit notes. Bills,
   POs, goods receipts are purchases and are never posted.

## Reference data — one global table

FBR splits into flat national lists and a few dependent lookups. Model both in
one org-agnostic table (erp-system's shape), dependency via a parent pointer.
No HS×UoM matrix — both prior projects define that endpoint and never call it.

```
fbr_reference_data(type, code, description, value, parent_type, parent_code,
                   is_active, synced_at)
unique(type, code, parent_code)
```

Types: `doc_type, hs_code, uom, sale_type, tax_rate, sro_schedule, sro_item`.
Provinces are a fixed set — a `FbrProvince` enum (7 values), not synced.

Sync order (a `vineflow fbr sync` CLI, platform-level, < 100 calls):
- flat: doc types, hs codes (~8k rows, one call), uoms, sale types, sro item codes
- dependent: `tax_rate` per sale type (parent = sale type); `sro_schedule` per
  non-18% rate (parent = rate); `sro_item` per schedule (parent = schedule)

Endpoints (base `https://gw.fbr.gov.pk`, Bearer token):
`/pdi/v1/{provinces,doctypecode,itemdesccode,uom,transtypecode,sroitemcode}`,
`/pdi/v1/SroSchedule?rate_id=&date=`, `/pdi/v2/SaleTypeToRate?date=&transTypeId=&originationSupplier=`,
`/pdi/v2/SROItem?date=&sro_id=`. Post/validate: `/di_data/v1/di/{postinvoicedata,validateinvoicedata}`.

## Org settings — opt-in + two encrypted tokens

Columns on `organizations`: `fbr_enabled`, `fbr_environment`
(`sandbox|production`), `fbr_sandbox_token` 🔒, `fbr_production_token` 🔒,
`fbr_province`. The seller business name reuses `org.name` — FBR validates the
NTN, not the name string.

Tokens are encrypted at rest (Fernet, key from `FBR_ENCRYPTION_KEY`), decrypted
only to call FBR, and never returned by the API — reads expose only
`fbr_sandbox_configured` / `fbr_production_configured` booleans.

## Master-data fields

- Product: `hs_code`, `uom_code`, `sale_type` (+ optional `sro_schedule_no`,
  `sro_item_serial_no`, `fixed_notified_value`), chosen from the synced lists.
  The tax rate is derived from the sale type at post time, not typed in.
- Party (buyer): `province`, `registration_type` (registered/unregistered).
- Org (seller): `province` (NTN/STRN/address already exist).

## Submission

On `DocumentService.finalize` (the existing boundary), when `fbr_enabled` and the
document is an invoice/credit note: validate → post → store the result. Invoice
columns: `fbr_invoice_number` (IRN), `fbr_status`
(`not_applicable|pending|posted|failed`), `fbr_error`, `fbr_response`,
`fbr_submitted_at`, `fbr_scenario_id`, `fbr_invoice_ref_no`. Failures are stored,
never block finalize; a retry endpoint re-submits.

Optional tax fields (`furtherTax`, `extraTax`, `fedPayable`, `salesTaxWithheld`)
are always sent as explicit `0.00` — most FBR failures are "cannot be empty",
not "must be non-zero".

## Print

The document template already reserves `stamp_image / stamp_overlay /
stamp_caption`. Populate with the FBR QR (segno, pure-Python) + FBR logo, sized
to spec (QR v2 25×25, 1.0×1.0 inch), only when `fbr_status = posted`.

## Credit-note rules (from the DI error codes, enforced only when FBR-enabled)

Mandatory reason + remarks (0027/0028), within 180 days of the invoice (0034),
note date ≥ invoice date (0029/0035), value ≤ original (0036/0037), one credit
note per invoice (0064), no self-invoicing (0058).

## Build order

1. reference table + sync CLI + encrypted org settings + settings UI ← pull real data
2. master-data fields (product/party/org) + pickers
3. client + payload builder + validate (dry-run against sandbox)
4. submit-on-finalize (+retry, non-blocking) + status UI
5. QR + logo on the PDF
6. credit-note reason + FBR rules
7. (later) scenario testing under platform admin

## Decisions (confirmed)

- Reference sync uses a platform token (`FBR_REFERENCE_TOKEN` in env).
- One app-wide Fernet key (`FBR_ENCRYPTION_KEY`) encrypts per-org tokens.
- FBR credit-note constraints apply only when the org is FBR-enabled.
