# API Contracts: Landed Cost & Scoping (Sprint 3)

This contract defines the public HTTP interfaces, query parameters, authorization levels, request schemas, and response footprints for Sprint 3.

---

## 📦 1. Landed Cost Modules

### POST `/api/procurement/landed-cost`
Create a new Landed Cost Voucher in `DRAFT` status.

* **Authorization**: `Role IN ['ADMIN', 'PROC_OFFICER', 'GM']`
* **Request Body (Zod Map)**:
  ```json
  {
    "allocationMethod": "VALUE | QUANTITY | WEIGHT | VOLUME",
    "totalAllocatedCost": 1500.50,
    "currencyId": "uuid-string",
    "exchangeRate": 1.0,
    "transactionDate": "2026-06-01T21:30:00.000Z",
    "grnIds": ["grn-uuid-1", "grn-uuid-2"]
  }
  ```
* **Response Body (`201 Created`)**:
  ```json
  {
    "id": "voucher-uuid",
    "voucherNumber": "LCV-20260601-0001",
    "allocationMethod": "VALUE",
    "totalAllocatedCost": "1500.5000",
    "status": "DRAFT",
    "currencyId": "uuid-string",
    "exchangeRate": "1.000000",
    "transactionDate": "2026-06-01T21:30:00.000Z",
    "version": 1,
    "createdById": "user-uuid"
  }
  ```

---

### PUT `/api/procurement/landed-cost/:id`
Update an existing `DRAFT` Landed Cost Voucher and recalculate pro-rata line allocations.

* **Authorization**: `Role IN ['ADMIN', 'PROC_OFFICER', 'GM']`
* **Request Body (Zod Map)**:
  ```json
  {
    "version": 1,
    "allocationMethod": "VALUE | QUANTITY | WEIGHT | VOLUME",
    "totalAllocatedCost": 1800.00,
    "grnIds": ["grn-uuid-1", "grn-uuid-2"]
  }
  ```
* **Response Body (`200 OK`)**:
  ```json
  {
    "id": "voucher-uuid",
    "status": "DRAFT",
    "totalAllocatedCost": "1800.0000",
    "version": 2,
    "allocationLines": [
      {
        "grnLineId": "grn-line-uuid-1",
        "allocatedCost": "600.0000",
        "adjustedUnitCost": "106.0000"
      },
      {
        "grnLineId": "grn-line-uuid-2",
        "allocatedCost": "1200.0000",
        "adjustedUnitCost": "212.0000"
      }
    ]
  }
  ```
* **Error States**:
  - `400 Bad Request`: If voucher status is not `DRAFT` (immutable edit block).
  - `409 Conflict`: Optimistic concurrency check failed (version mismatch).

---

### POST `/api/procurement/landed-cost/:id/post`
Post the Landed Cost Voucher and trigger asynchronous cost revaluations.

* **Authorization**: `Role IN ['ADMIN', 'PROC_OFFICER', 'GM']`
* **Response Body (`202 Accepted`)**:
  ```json
  {
    "id": "voucher-uuid",
    "voucherNumber": "LCV-20260601-0001",
    "status": "PROCESSING",
    "message": "Cost revaluation background task has been scheduled."
  }
  ```

---

### GET `/api/procurement/landed-cost/:id/status`
Check background revaluation job status.

* **Authorization**: `Role IN ['ADMIN', 'PROC_OFFICER', 'GM', 'AUDITOR']`
* **Response Body (`200 OK`)**:
  ```json
  {
    "id": "voucher-uuid",
    "status": "PROCESSING | POSTED | DRAFT",
    "progress": 75,
    "errorDetails": null
  }
  ```

---

## 🔐 2. Admin User-Role Management

### GET `/api/admin/roles`
Fetch static system roles and capabilities list.

* **Authorization**: `Role IN ['ADMIN']` (Strict Admin Enforcement)
* **Response Body (`200 OK`)**:
  ```json
  [
    {
      "role": "WH_KEEPER",
      "capabilities": ["VIEW_STOCK", "RECEIVE_TRANSFER", "SHIP_TRANSFER"]
    },
    {
      "role": "ADMIN",
      "capabilities": ["BYPASS_SCOPES", "MANAGE_ROLES", "SYSTEM_CONFIG"]
    }
  ]
  ```

---

### PUT `/api/admin/users/:id/role`
Update a user's static role assignment.

* **Authorization**: `Role IN ['ADMIN']` (Strict Admin Enforcement)
* **Request Body (Zod Map)**:
  ```json
  {
    "role": "WH_KEEPER | INV_MGR | PROC_OFFICER | APPROVER | ADMIN | AUDITOR | VIEWER"
  }
  ```
* **Response Body (`200 OK`)**:
  ```json
  {
    "userId": "user-uuid",
    "role": "ADMIN",
    "message": "User role updated successfully. Security context will reload immediately."
  }
  ```
