# API Contracts: LogiRest Frontend UI

**Feature Branch**: `001-logirest-frontend-ui`
**Date**: 2026-04-19
**Type**: REST API Interface Contract (Frontend perspective — mocked for development)

> These contracts define what the frontend expects from the backend API. During development, these are fulfilled by mock handlers in `src/lib/api/mocks/`. All request/response shapes have corresponding Zod schemas in `src/types/`.

---

## Base URL

```
Development:  NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
Production:   [TBD by backend team]
```

All requests include:
- `Authorization: Bearer {jwt}` header
- `Accept-Language: ar` or `en` header (for error message localization)

---

## Authentication

### `POST /auth/login`

**Request**:
```json
{ "email": "string", "password": "string" }
```

**Response 200**:
```json
{
  "user": { /* AuthUser */ },
  "token": "string (JWT)"
}
```

**Response 401**:
```json
{ "code": "INVALID_CREDENTIALS", "message": "errors.auth.invalid_credentials", "field_errors": null }
```

### `POST /auth/refresh`

**Request**: Empty body (reads httpOnly refresh cookie)
**Response 200**: `{ "token": "string" }`
**Response 401**: `{ "code": "SESSION_EXPIRED" ... }`

---

## Master Data

### Branches — `GET /branches`

**Query params**: `?is_active=true&page=1&page_size=50`
**Response 200**: `PaginatedResponse<Branch>`

### `POST /branches` / `PUT /branches/:id` / `DELETE /branches/:id`

Standard CRUD. Request/Response: `Branch` (omit `id`, `created_at` on POST).

### Warehouses — `GET /warehouses?branch_id=&page=`
### Items — `GET /items?category_id=&search=&page=`
### Suppliers — `GET /suppliers?search=&page=`
### Currencies — `GET /currencies`
### FX Rates — `GET /currencies/fx-rates?from=USD&effective_date=2026-04-19`

---

## Inventory

### Stock Balance — `GET /inventory/balance`

**Query**: `?warehouse_id=&item_id=&page=`
**Response**:
```json
{
  "data": [
    {
      "item_id": "string",
      "item": { /* Item (abbreviated) */ },
      "warehouse_id": "string",
      "qty_on_hand": 100,
      "qty_reserved": 5,
      "qty_available": 95
    }
  ],
  "meta": { /* pagination */ }
}
```

### Lot Balances — `GET /inventory/lots`

**Query**: `?warehouse_id=&item_id=&exclude_expired=false&page=`
**Response**: `PaginatedResponse<Lot>`

### Movement Ledger — `GET /inventory/movements`

**Query**: `?warehouse_id=&item_id=&document_type=&from_date=&to_date=&page=`
**Response**:
```json
{
  "data": [
    {
      "id": "string",
      "document_number": "string",
      "document_type": "GRN",
      "item": { /* abbreviated */ },
      "lot": { /* abbreviated */ },
      "direction": "IN",
      "qty": 50,
      "posted_at": "ISO 8601"
    }
  ],
  "meta": { /* pagination */ }
}
```

### Warehouse Lock Status — `GET /inventory/warehouses/:id/lock`

**Response**:
```json
{
  "is_locked": true,
  "session_id": "string",
  "session_number": "ST-2026-003",
  "lock_started_at": "ISO 8601"
}
```

---

## Procurement

### Purchase Requests — `GET /procurement/prs?status=&page=`
### `POST /procurement/prs` — Create PR
### `PUT /procurement/prs/:id` — Edit DRAFT
### `POST /procurement/prs/:id/submit` — Submit for approval
### `POST /procurement/prs/:id/approve` — Approve (INV_MGR+)
### `POST /procurement/prs/:id/reject` — Reject with reason

### Purchase Orders — `GET /procurement/pos?status=&pr_id=&page=`
### `POST /procurement/pos` — Create PO (optionally from PR)
### `POST /procurement/pos/:id/post` — Post PO

### GRN — `GET /procurement/grns?status=&po_id=&page=`
### `POST /procurement/grns` — Create GRN draft
### `POST /procurement/grns/:id/post` — Post GRN

**Post GRN Request Body** (FX capture):
```json
{
  "fx_rate": 3.75,
  "confirmation": "ACKNOWLEDGE_IRREVERSIBLE"
}
```
**Post GRN Response 200**: `GRN` with `status: "POSTED"`, `fx_rate` set.
**Post GRN Response 409**: `{ "code": "WAREHOUSE_LOCKED", "session_number": "ST-2026-003" }`
**Post GRN Response 422**: `{ "code": "FX_RATE_REQUIRED", ... }` (if foreign currency PO and no fx_rate)

---

## Operations

### Issues — `GET /operations/issues?status=&warehouse_id=&page=`
### `POST /operations/issues` — Create Issue
### `POST /operations/issues/:id/post` — Post Issue

**Post Issue Response 409**: `{ "code": "WAREHOUSE_LOCKED" }`

### Lot Allocation (FEFO) — `GET /operations/lots-available`

**Query**: `?item_id=&warehouse_id=&include_expired=false`
**Response**: `Lot[]` sorted by `expiry_date ASC`

### Transfers — `GET /operations/transfers?status=&page=`
### `POST /operations/transfers` — Create Transfer (ship side)
### `POST /operations/transfers/:id/ship` — Mark as IN_TRANSIT
### `POST /operations/transfers/:id/receive` — Receive and Post

### Adjustments — `GET /operations/adjustments?status=&page=`
### `POST /operations/adjustments` — Create Adjustment
### `POST /operations/adjustments/:id/approve` — Approve
### `POST /operations/adjustments/:id/post` — Post (irreversible)

---

## Stocktake

### `GET /stocktake/sessions?status=&warehouse_id=`
### `POST /stocktake/sessions` — Start session (takes snapshot, locks warehouse)
### `GET /stocktake/sessions/:id/counts` — Get count sheet
### `PUT /stocktake/sessions/:id/counts/:count_id` — Update counted qty
### `POST /stocktake/sessions/:id/post` — Finalize and unlock warehouse

**Start Session Response 409**: `{ "code": "ACTIVE_SESSION_EXISTS", "session_number": "ST-2026-003" }`

---

## Notifications

### `GET /notifications/templates` — List email templates
### `PUT /notifications/templates/:id` — Update template
### `GET /notifications/outbox?status=&page=` — Outbox list
### `GET /notifications/logs?page=` — Delivery logs

---

## Administration

### Users — `GET /admin/users?role=&page=`
### `POST /admin/users` — Create user with role + scope
### `PUT /admin/users/:id` — Update user

### Audit Log — `GET /admin/audit-log?entity_type=&from_date=&page=`

---

## Error Response Format (all endpoints)

```json
{
  "code": "MACHINE_READABLE_ERROR_CODE",
  "message": "i18n.key.for.localized.message",
  "field_errors": {
    "field_name": ["validation error 1", "validation error 2"]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing/expired JWT |
| `FORBIDDEN` | 403 | RBAC scope violation |
| `NOT_FOUND` | 404 | Entity not found |
| `WAREHOUSE_LOCKED` | 409 | Active stocktake blocks posting |
| `DOCUMENT_POSTED` | 409 | Attempt to edit posted document |
| `VALIDATION_ERROR` | 422 | Field-level validation failed |
| `FX_RATE_REQUIRED` | 422 | Foreign currency GRN post without FX rate |
| `EXPIRED_LOT_BLOCKED` | 422 | Expired lot used without override |
| `NETWORK_ERROR` | — | Client-side fetch failure |
