# API Contracts: Inventory Transactions (Phase 7)

All endpoints require a valid JWT cookie (`logirest_token`) and valid active scopes (`x-warehouse-id`, `x-branch-id` headers).

## 1. GRN Posting
Posting RECEIVED goods into inventory.

- **URL**: `/api/v1/procurement/goods-received/:id/post`
- **Method**: `POST`
- **Roles**: `ADMIN`, `INV_MGR`, `PROC_OFFICER`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "grn-uuid",
    "status": "POSTED",
    "postedAt": "2026-05-23T12:00:00.000Z",
    "postedBy": "user-uuid"
  }
  ```

---

## 2. Issue Posting
Posting Stock Issue to decrease inventory.

- **URL**: `/api/v1/operations/issues/:id/post`
- **Method**: `POST`
- **Roles**: `ADMIN`, `INV_MGR`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "issue-uuid",
    "status": "POSTED",
    "allocations": [
      {
        "lineId": "line-uuid",
        "lotId": "lot-uuid",
        "allocatedQty": 15.0000
      }
    ]
  }
  ```

---

## 3. Transfer Shipping
Shipping stock out from source warehouse.

- **URL**: `/api/v1/operations/transfers/:id/ship`
- **Method**: `POST`
- **Roles**: `ADMIN`, `INV_MGR`, `WH_KEEPER`, `STORE_MGR`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "transfer-uuid",
    "status": "IN_TRANSIT",
    "shippedAt": "2026-05-23T12:00:00.000Z"
  }
  ```

---

## 4. Transfer Receiving
Receiving stock at destination warehouse. Handles quantity variance.

- **URL**: `/api/v1/operations/transfers/:id/receive`
- **Method**: `POST`
- **Roles**: `ADMIN`, `WH_KEEPER`, `INV_MGR`
- **Request Body**:
  ```json
  {
    "receivedLines": [
      {
        "lineId": "transfer-line-uuid",
        "receivedQty": 8.0000,
        "varianceReason": "Damaged in transit" // Required if receivedQty != shippedQty
      }
    ]
  }
  ```
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "transfer-uuid",
    "status": "RECEIVED",
    "receivedAt": "2026-05-23T12:00:00.000Z"
  }
  ```

---

## 5. Adjustment Posting
Applying stock adjustments.

- **URL**: `/api/v1/operations/adjustments/:id/post`
- **Method**: `POST`
- **Roles**: `ADMIN`, `INV_MGR`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "adjustment-uuid",
    "status": "POSTED"
  }
  ```

---

## 6. Stocktake Posting
Applying variance adjustments from stocktake.

- **URL**: `/api/v1/stocktake/sessions/:id/post`
- **Method**: `POST`
- **Roles**: `ADMIN`, `INV_MGR`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "sessionId": "stocktake-uuid",
    "status": "POSTED"
  }
  ```

---

## Error Codes Reference

| HTTP Status | Error Code | Description |
|---|---|---|
| `403` | `FORBIDDEN` | Role unauthorized or current document status transition invalid. |
| `409` | `CONFLICT` | Optimistic locking `version` mismatch. |
| `422` | `UNPROCESSABLE_ENTITY` | Insufficient stock / negative stock validation failure. |
| `423` | `LOCKED` | Warehouse lock active/stale under stocktake. |
