# API Contracts: API Controllers (Phase 8)

All endpoints require a valid JWT cookie (`logirest_token`) and valid active scopes (`x-warehouse-id`, `x-branch-id` headers) unless noted otherwise (e.g. `/auth/login`).

## 1. Authentication
Endpoints for logging in, logging out, session refresh, and fetching current session profile.

### 1.1 Login
- **URL**: `/api/v1/auth/login`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "email": "user@logirest.com",
    "password": "securepassword"
  }
  ```
- **Response (200 Success)**: Sets HttpOnly cookie `logirest_token` containing JWT.
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "email": "user@logirest.com",
      "role": "WH_KEEPER"
    }
  }
  ```

### 1.2 Logout
- **URL**: `/api/v1/auth/logout`
- **Method**: `POST`
- **Response (200 Success)**: Clears `logirest_token` cookie.
  ```json
  {
    "success": true
  }
  ```

### 1.3 Me (Current User Details)
- **URL**: `/api/v1/auth/me`
- **Method**: `GET`
- **Response (200 Success)**:
  ```json
  {
    "id": "user-uuid",
    "email": "user@logirest.com",
    "role": "WH_KEEPER",
    "scopes": [
      {
        "warehouseId": "warehouse-uuid-1",
        "branchId": "branch-uuid-1",
        "isDefault": true
      }
    ]
  }
  ```

---

## 2. Master Data CRUD
Lookup tables CRUD (Branches, Warehouses, Items, Suppliers, UOMs, Categories, Currencies, FX Rates, Barcodes).

### 2.1 Get Warehouses (Scope filtered, excludes archived unless parameter is set)
- **URL**: `/api/v1/master-data/warehouses`
- **Method**: `GET`
- **Parameters**: `includeArchived=true/false` (optional, default: `false`)
- **Response (200 Success)**:
  ```json
  [
    {
      "id": "warehouse-uuid-1",
      "name": "Main Kitchen WH",
      "isActive": true
    }
  ]
  ```

### 2.2 Archive/Soft-Delete Warehouse
- **URL**: `/api/v1/master-data/warehouses/:id/archive`
- **Method**: `PUT`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "id": "warehouse-uuid-1",
    "isActive": false
  }
  ```
- **Error (400 Bad Request)**: Returns if the warehouse has current stock balance `onHandQty > 0`.
  ```json
  {
    "success": false,
    "errorCode": "STOCK_NOT_EMPTY",
    "message": "Cannot archive warehouse with active stock balance."
  }
  ```

### 2.3 Check Barcode Duplication
- **URL**: `/api/v1/master-data/barcodes/check-duplicate`
- **Method**: `GET`
- **Parameters**: `barcode=123456789`
- **Response (200 Success)**:
  ```json
  {
    "isDuplicate": true,
    "itemId": "item-uuid",
    "itemName": "Tomato Sauce"
  }
  ```

---

## 3. Procurement Lifecycles

### 3.1 PR Create & Convert
- **URL**: `/api/v1/purchasing/purchase-requests`
- **Method**: `POST`
- **Response (201 Created)**:
  ```json
  {
    "id": "pr-uuid",
    "status": "DRAFT",
    "version": 1
  }
  ```

- **URL**: `/api/v1/purchasing/purchase-requests/:id/submit`
- **Method**: `POST`
- **Response (200 Success)**:
  ```json
  {
    "id": "pr-uuid",
    "status": "SUBMITTED",
    "version": 2
  }
  ```

- **URL**: `/api/v1/purchasing/purchase-requests/:id/convert-to-po`
- **Method**: `POST`
- **Response (200 Success)**:
  ```json
  {
    "poId": "po-uuid",
    "status": "DRAFT"
  }
  ```

### 3.2 PO Approve/Reject
- **URL**: `/api/v1/purchasing/purchase-orders/:id/approve`
- **Method**: `POST`
- **Response (200 Success)**:
  ```json
  {
    "id": "po-uuid",
    "status": "APPROVED",
    "version": 3
  }
  ```

- **URL**: `/api/v1/purchasing/purchase-orders/:id/reject`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "comments": "Unit price exceeds market value"
  }
  ```
- **Response (200 Success)**:
  ```json
  {
    "id": "po-uuid",
    "status": "REJECTED",
    "version": 3
  }
  ```

### 3.3 GRN Create & Post
- **URL**: `/api/v1/purchasing/goods-received`
- **Method**: `POST`
- **Response (201 Created)**:
  ```json
  {
    "id": "grn-uuid",
    "status": "DRAFT",
    "version": 1
  }
  ```

- **URL**: `/api/v1/purchasing/goods-received/:id/post`
- **Method**: `POST`
- **Response (200 Success)**: Runs within the posted ledger transaction.
  ```json
  {
    "success": true,
    "documentId": "grn-uuid",
    "status": "POSTED"
  }
  ```

---

## 4. Operational Movement & Adjustments

### 4.1 Stock Issue Posting
- **URL**: `/api/v1/operations/issues/:id/post`
- **Method**: `POST`
- **Response (200 Success)**: Performs lot allocations and deductions.
  ```json
  {
    "success": true,
    "documentId": "issue-uuid",
    "status": "POSTED"
  }
  ```

### 4.2 Stock Transfer Ship/Receive
- **URL**: `/api/v1/operations/transfers/:id/ship`
- **Method**: `POST`
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "documentId": "transfer-uuid",
    "status": "IN_TRANSIT"
  }
  ```

- **URL**: `/api/v1/operations/transfers/:id/receive`
- **Method**: `POST`
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
    "status": "RECEIVED"
  }
  ```

---

## 5. Stocktake Sessions

### 5.1 Start Stocktake Session (Warehouse Lock)
- **URL**: `/api/v1/stocktake/sessions/:id/start`
- **Method**: `POST`
- **Response (200 Success)**: Locks the warehouse and snapshots stock.
  ```json
  {
    "success": true,
    "sessionId": "stocktake-uuid",
    "status": "ACTIVE",
    "lockExpiresAt": "2026-05-26T12:00:00.000Z"
  }
  ```

### 5.2 Submit Count Quantities
- **URL**: `/api/v1/stocktake/sessions/:id/count`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "counts": [
      {
        "itemId": "item-uuid-1",
        "lotId": "lot-uuid-1",
        "countedQty": 12.5000
      }
    ]
  }
  ```
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "sessionId": "stocktake-uuid"
  }
  ```

### 5.3 Review & Post Stocktake
- **URL**: `/api/v1/stocktake/sessions/:id/submit`
- **Method**: `POST`
- **Response (200 Success)**: Transitions session status to `REVIEW`.
  ```json
  {
    "id": "stocktake-uuid",
    "status": "REVIEW"
  }
  ```

- **URL**: `/api/v1/stocktake/sessions/:id/post`
- **Method**: `POST`
- **Response (200 Success)**: Reconciles counts to ledger, sets active locks `isActive = false`.
  ```json
  {
    "success": true,
    "sessionId": "stocktake-uuid",
    "status": "POSTED"
  }
  ```

---

## 6. Kitchen Requests

### 6.1 Create & Submit Request
- **URL**: `/api/v1/kitchen-requests`
- **Method**: `POST`
- **Response (21 Created)**:
  ```json
  {
    "id": "kitchen-request-uuid",
    "status": "DRAFT"
  }
  ```

- **URL**: `/api/v1/kitchen-requests/:id/submit`
- **Method**: `POST`
- **Response (200 Success)**:
  ```json
  {
    "id": "kitchen-request-uuid",
    "status": "SUBMITTED"
  }
  ```

### 6.2 Fulfill Request
- **URL**: `/api/v1/kitchen-requests/:id/fulfill`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "fulfillments": [
      {
        "itemId": "item-uuid-1",
        "fulfilledQty": 5.0000
      }
    ]
  }
  ```
- **Response (200 Success)**:
  ```json
  {
    "success": true,
    "id": "kitchen-request-uuid",
    "status": "FULFILLED"
  }
  ```
