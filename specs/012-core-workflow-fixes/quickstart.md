# Quickstart: Phase 2 — Core Workflow Fixes

**Branch**: `012-core-workflow-fixes`  
**Date**: 2026-05-21

## Prerequisites

- [ ] Phase 0 (Security Hardening) and Phase 1 (Critical Operational Safety) completed
- [ ] Node.js 20+ and npm 11+
- [ ] Backend endpoints:
  - `GET /operations/transfers` accepts `?search=` query param
  - `GET /stocktake/sessions/:id` returns `audit_log[]` array
  - `PUT /operations/adjustments/:id` supports EDIT transition from REJECTED

## Setup

```bash
cd "e:\kitchen-store-inventory-system"
git checkout 012-core-workflow-fixes
npm install
```

## Verify Baseline

```bash
cd apps/web
npx tsc --noEmit
npx vitest run
```

## Implementation Order

```
P2-01 (Transfer Search) ─┐
P2-02 (Warehouse Names) ─┤── Independent, parallel
P2-06 (Roles) ───────────┘
    ↓
P2-03 (REJECTED→DRAFT) → P2-04 (Stocktake Audit) → P2-05 (GRN Expiry)
```

P2-01, P2-02, P2-06 modify different files and can be done in parallel. P2-03 through P2-05 are each independent.

## Files Changed Per Task

| Task | File(s) |
|------|---------|
| P2-01 | `TransferListClient.tsx`, `useTransferList.ts` |
| P2-02 | `TransferListClient.tsx`, `AdjustmentListClient.tsx`, `StocktakeListClient.tsx` |
| P2-03 | `document-engine.ts`, `AdjustmentDetailClient.tsx` |
| P2-04 | `StocktakeForm.tsx`, `StocktakeViewer.tsx`, `stocktake.ts` |
| P2-05 | GRN form component (goods-received) |
| P2-06 | `document-engine.ts` |

## Translation Keys

### `messages/en.json`

```json
{
  "operations": {
    "adjustment": {
      "edit_rejected": "Edit / Resubmit",
      "rejection_reason_banner": "Editing a rejected adjustment — reason: {reason}"
    },
    "transfer": {
      "search_placeholder": "Search by document number or warehouse"
    }
  },
  "grn": {
    "expiry_date_in_past": "Expiry date cannot be in the past",
    "expiry_date_in_past_warning": "This expiry date is in the past. Provide a reason to override.",
    "expiry_date_required": "Expiry date is required",
    "override_reason": "Override reason"
  }
}
```

### `messages/ar.json`

```json
{
  "operations": {
    "adjustment": {
      "edit_rejected": "تعديل / إعادة تقديم",
      "rejection_reason_banner": "تعديل تسوية مرفوضة — السبب: {reason}"
    },
    "transfer": {
      "search_placeholder": "بحث برقم المستند أو المستودع"
    }
  },
  "grn": {
    "expiry_date_in_past": "لا يمكن أن يكون تاريخ الصلاحية في الماضي",
    "expiry_date_in_past_warning": "تاريخ الصلاحية هذا في الماضي. قدم سبباً للتجاوز.",
    "expiry_date_required": "تاريخ الصلاحية مطلوب",
    "override_reason": "سبب التجاوز"
  }
}
```

## Verification

```bash
cd apps/web
npx tsc --noEmit
npx vitest run
npx next build
```

### Manual Test Scenarios

**P2-01 — Transfer Search**:
1. Open transfer list, type a document number in search → list filters
2. Clear search → full list restored, back to page 1
3. Type warehouse name → transfers involving that warehouse shown

**P2-02 — Warehouse Names**:
1. Create a new warehouse → name appears in transfer, adjustment, and stocktake lists
2. Switch locale → names change to Arabic/English from entity data

**P2-03 — REJECTED→DRAFT**:
1. Submit an adjustment, reject it as approver
2. As creator, click "Edit / Resubmit" → form opens with rejection reason banner
3. Edit and resubmit → status returns to SUBMITTED

**P2-04 — Stocktake Audit Trail**:
1. Progress a stocktake through multiple statuses
2. Open detail → timeline shows all transitions with user and time

**P2-05 — GRN Expiry Validation**:
1. As WH_KEEPER, enter past expiry date → blocked
2. As INV_MGR, enter past expiry date → warning + override reason → saved

**P2-06 — Roles**:
1. Log in as KITCHEN_CHIEF → can submit/cancel kitchen requests
2. Log in as STORE_MGR → can create/submit adjustments, view transfers
