# Quickstart: Phase 1 — Critical Operational Safety

**Branch**: `011-critical-operational-safety`  
**Date**: 2026-05-21

## Prerequisites

- [ ] Phase 0 (Security Hardening) completed or in-progress
- [ ] Node.js 20+ and npm 11+
- [ ] Backend endpoints available:
  - `GET /auth/me` — returns current user with role and scopes
  - `POST /operations/adjustments/:id/post` — includes server-side negative stock validation

## Setup

```bash
cd "e:\kitchen-store-inventory-system"
git checkout 011-critical-operational-safety
npm install
```

## Verify Baseline

```bash
cd apps/web
npx tsc --noEmit              # TypeScript compiles cleanly
npx vitest run                # Existing unit tests pass
```

## Implementation Order (Critical Path)

Tasks must be completed in this sequence due to dependencies:

```
P1-01 (Negative Stock Guard) → P1-02 (Version Locking) → P1-03 (Workflow Filter) → P1-04 (Session Validation)
```

- P1-01 is independent and can start immediately
- P1-02 and P1-03 both modify `AdjustmentListClient.tsx` — implement P1-02 first then layer P1-03
- P1-04 modifies `AuthProvider.tsx` and is independent of the adjustment changes

## Files Changed Per Task

| Task | File(s) | Type of Change |
|------|---------|----------------|
| P1-01 | `src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx` | Add negative stock guard |
| P1-01 | `messages/en.json`, `messages/ar.json` | Add translation keys |
| P1-02 | `src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx` | Fix version in batch loop |
| P1-03 | `src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx` | Add workflow filter |
| P1-04 | `src/providers/AuthProvider.tsx` | Add `/auth/me` call on mount |
| P1-04 | `messages/en.json`, `messages/ar.json` | Add auth translation keys |

## Translation Keys to Add

### `messages/en.json`

```json
{
  "operations": {
    "adjustment": {
      "errors": {
        "negative_stock_not_allowed": "Cannot save adjustment with negative stock",
        "exceeds_available_stock": "Exceeds available stock"
      }
    }
  },
  "batch": {
    "skipped_n_ineligible": "{count} adjustments skipped (not eligible)"
  },
  "auth": {
    "session_verification_failed": "Unable to verify your session. Please log in again."
  }
}
```

### `messages/ar.json`

```json
{
  "operations": {
    "adjustment": {
      "errors": {
        "negative_stock_not_allowed": "لا يمكن حفظ التسوية بمخزون سالب",
        "exceeds_available_stock": "يتجاوز المخزون المتاح"
      }
    }
  },
  "batch": {
    "skipped_n_ineligible": "تم تخطي {count} تسوية (غير مؤهلة)"
  },
  "auth": {
    "session_verification_failed": "تعذر التحقق من جلستك. يرجى تسجيل الدخول مرة أخرى."
  }
}
```

## Verification

After each task:

```bash
cd apps/web
npx tsc --noEmit          # No type errors
npx vitest run             # All tests pass
npx next build             # Production build succeeds
```

### Manual Test Scenarios

**P1-01 — Negative Stock Guard**:
1. Create new adjustment with warehouse that has items with known stock
2. Add a DECREASE line with quantity exceeding available stock
3. Verify: Save/Submit buttons are disabled, inline error shown
4. Reduce quantity to below available stock → buttons re-enabled
5. Verify: Server-side rejection if API client-side check is bypassed

**P1-02 — Version Locking**:
1. Open adjustment list in two browser tabs (or simulate with another user)
2. In tab A, select adjustments for batch approve
3. In tab B, modify one of the selected adjustments (change a line)
4. Execute batch approve in tab A
5. Verify: Conflict on modified item is detected and reported; other items succeed

**P1-03 — Workflow Filter**:
1. Select adjustments in mixed statuses (DRAFT, SUBMITTED, POSTED)
2. Execute batch approve
3. Verify: Only SUBMITTED are processed; others skipped with toast

**P1-04 — Session Validation**:
1. Log in normally → dashboard loads after `/auth/me` resolves
2. Revoke session server-side, refresh page → redirected to login
3. Block `/auth/me` endpoint (network throttle) → redirected to login after 10s
