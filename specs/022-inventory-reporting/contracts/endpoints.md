# API Endpoint Contracts: Inventory Query, Reporting, & Administrative Jobs

This document defines the request/response payloads, authentication guards, and response statuses for all API endpoints introduced in Phase 9.

## Common Headers

Every endpoint requires the following headers:
- `Authorization: Bearer <jwt-token>`
- `x-warehouse-id: <authorized-warehouse-uuid>`
- `x-branch-id: <authorized-branch-uuid>`

---

## 1. Inventory Queries

### 1.1 GET `/api/v1/inventory/balance`
Fetch current stock on-hand quantities for the active warehouse scope.

- **Query Parameters**:
  - `itemId` (optional, uuid) - Filter by specific item.
  - `categoryId` (optional, uuid) - Filter by item category.
  - `search` (optional, string) - Match item name or code.
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "itemId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "itemCode": "ITEM-001",
      "itemName": "Fresh Tomato",
      "categoryName": "Vegetables",
      "onHandQty": 120.50,
      "weightedAvgCost": 2.50,
      "defaultUomSymbol": "kg"
    }
  ]
  ```

---

### 1.2 GET `/api/v1/inventory/lots`
Fetch active lot locations and allocations for the active warehouse.

- **Query Parameters**:
  - `itemId` (optional, uuid) - Filter by item.
  - `status` (optional, enum: `AVAILABLE`, `HOLD`, `EXPIRED`) - Filter by lot status.
- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "lotId": "b2fbc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "lotNumber": "LOT-20260523-01",
      "itemId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "itemCode": "ITEM-001",
      "itemName": "Fresh Tomato",
      "onHandQty": 50.00,
      "expiryDate": "2026-06-01T00:00:00Z",
      "status": "AVAILABLE"
    }
  ]
  ```

---

### 1.3 GET `/api/v1/inventory/movements`
Fetch paginated stock movement history (StockLedger).

- **Query Parameters**:
  - `itemId` (optional, uuid) - Filter by item.
  - `page` (optional, int, default 1)
  - `limit` (optional, int, default 50)
  - `startDate` (optional, date ISO-8601)
  - `endDate` (optional, date ISO-8601)
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        "timestamp": "2026-05-23T12:00:00Z",
        "itemId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "itemName": "Fresh Tomato",
        "transactionType": "GRN_IN",
        "documentReference": "GRN-2026-0005",
        "quantity": 50.00,
        "balanceAfter": 120.50,
        "performedByUserName": "John Doe"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
  ```

---

## 2. Optimized Scanner Resolution

### 2.1 GET `/api/v1/items/scan`
Highly optimized endpoint returning item and active lot configurations for a scanned barcode.

- **Query Parameters**:
  - `barcode` (required, string)
- **Success Response (`200 OK`)**:
  ```json
  {
    "itemId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "itemCode": "ITEM-001",
    "itemName": "Fresh Tomato",
    "uomId": "u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00",
    "uomSymbol": "kg",
    "conversionFactor": 1.00,
    "activeLots": [
      {
        "lotId": "b2fbc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        "lotNumber": "LOT-20260523-01",
        "onHandQty": 50.00,
        "expiryDate": "2026-06-01T00:00:00Z"
      }
    ]
  }
  ```
- **Error Response (`404 Not Found`)**:
  ```json
  {
    "statusCode": 404,
    "message": "No item registered for barcode '9780201379624'"
  }
  ```

---

## 3. Reports & KPIs

### 3.1 GET `/api/v1/reports/dashboard`
Fetch counts of pending actions and active documents for the active scope.

- **Success Response (`200 OK`)**:
  ```json
  {
    "pendingPurchaseRequests": 4,
    "openPurchaseOrders": 2,
    "inTransitTransfers": 3,
    "overdueTransfers": 1
  }
  ```

---

### 3.2 GET `/api/v1/reports/adjustments/summary`
Fetch stock adjustment totals by status for the current warehouse.

- **Success Response (`200 OK`)**:
  ```json
  [
    { "status": "DRAFT", "count": 2 },
    { "status": "PENDING_APPROVAL", "count": 1 },
    { "status": "POSTED", "count": 15 }
  ]
  ```

---

### 3.3 GET `/api/v1/reports/transfers/overdue`
Retrieve transfers currently in-transit that have exceeded `TRANSFER_OVERDUE_DAYS`.

- **Success Response (`200 OK`)**:
  ```json
  [
    {
      "transferId": "t0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      "transferNumber": "TR-0025",
      "sourceWarehouseName": "Central Kitchen",
      "destinationWarehouseName": "Main Warehouse",
      "shippedAt": "2026-05-10T10:00:00Z",
      "daysInTransit": 13
    }
  ]
  ```

---

## 4. Administrative Audits & Actions

### 4.1 GET `/api/v1/admin/audit-logs`
Retrieve paginated audit logs (Restricted to Roles: `ADMIN`, `MANAGER`).

- **Query Parameters**:
  - `page`, `limit` (pagination)
  - `userId` (optional, uuid) - Filter by performer
- **Success Response (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": "ad00c99-9c0b-4ef8-bb6d-6bb9bd380a99",
        "createdAt": "2026-05-23T15:00:00Z",
        "performedByUserId": "u0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
        "performedByRole": "MANAGER",
        "beforeStateJson": null,
        "afterStateJson": { "status": "RELEASED", "isActive": false }
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 50 }
  }
  ```

---

### 4.2 POST `/api/v1/warehouse-locks/:id/unlock`
Manually unlock a warehouse (Restricted to Roles: `ADMIN`, `MANAGER`).

- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Warehouse lock successfully released.",
    "deactivatedAt": "2026-05-23T15:47:00Z"
  }
  ```
- **Error Response (`403 Forbidden`)**:
  ```json
  {
    "statusCode": 403,
    "message": "Only admins and managers are authorized to manually release warehouse locks."
  }
  ```

---

## 5. Notification Control

### 5.1 PATCH `/api/v1/notifications/:id/read`
Mark a single notification log entry as read.

- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "n0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
    "isRead": true
  }
  ```

---

### 5.2 POST `/api/v1/notifications/read-all`
Mark all unread notifications for the caller's active role and warehouse scope as read.

- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "markedReadCount": 12
  }
  ```
