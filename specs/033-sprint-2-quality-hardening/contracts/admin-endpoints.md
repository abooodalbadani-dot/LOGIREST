# API Endpoint Contracts: Admin Quality Hardening

This document outlines the contracts for the new administration endpoints exposed under the NestJS API.

## 1. Frozen Items Management

### GET /api/v1/admin/frozen-items
Retrieves all inventory items currently frozen due to discrepancy detection during stock reconciliation.

* **Authentication**: JWT Required
* **RBAC Role**: `ADMIN` or `INV_MGR`

**Success Response (200 OK)**
```json
[
  {
    "warehouseId": "wh-001",
    "warehouseName": "Main Kitchen Warehouse",
    "itemId": "item-abc",
    "sku": "SKU-MILK-001",
    "itemName": "Fresh Milk 1L",
    "frozenDate": "2026-05-26T18:00:00.000Z",
    "qtyOnHand": 12.0000,
    "qtyAllocated": 2.0000
  }
]
```

---

### POST /api/v1/admin/unfreeze/:warehouseId/:itemId
Unfreezes a specified warehouse item, immediately restoring stock movement privileges. Generates a security audit trail log.

* **Authentication**: JWT Required
* **RBAC Role**: `ADMIN` or `INV_MGR`
* **Path Parameters**:
  * `warehouseId`: ID of the target warehouse
  * `itemId`: ID of the target item

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Item SKU-MILK-001 in warehouse wh-001 successfully unfrozen."
}
```

---

## 2. Failed Outbox Event Management

### GET /api/v1/admin/outbox/failed
Retrieves a paginated list of failed outbox events (outgoing notifications).

* **Authentication**: JWT Required
* **RBAC Role**: `ADMIN`

**Success Response (200 OK)**
```json
{
  "events": [
    {
      "id": "evt-001",
      "eventType": "purchase.request.created",
      "attempts": 3,
      "lastError": "SMTP Connection Timeout (host: smtp.mail.com)",
      "createdAt": "2026-05-26T12:00:00.000Z",
      "updatedAt": "2026-05-26T12:05:00.000Z"
    }
  ],
  "total": 1,
  "pages": 1
}
```

---

### POST /api/v1/admin/outbox/:id/retry
Queues a specific failed outbox event for immediate retry. Resets retry attempts count to 0 and updates state to `PENDING`.

* **Authentication**: JWT Required
* **RBAC Role**: `ADMIN`
* **Path Parameters**:
  * `id`: ID of the outbox event

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Outbox event evt-001 queued for immediate retry."
}
```

---

### POST /api/v1/admin/outbox/retry-all
Queues all failed outbox events for immediate bulk retry.

* **Authentication**: JWT Required
* **RBAC Role**: `ADMIN`

**Success Response (200 OK)**
```json
{
  "success": true,
  "count": 14,
  "message": "Successfully queued 14 failed outbox events for retry."
}
```
