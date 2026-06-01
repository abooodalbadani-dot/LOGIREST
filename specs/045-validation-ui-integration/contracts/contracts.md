# API Contracts: Sprint 2: Automated Validation & UI Integration

This document defines the API contracts, payloads, and response structures for the endpoints introduced or updated in Sprint 2.

---

## 1. On-Demand Inventory Validation API

* **Endpoint**: `GET /api/admin/inventory/validate`
* **Authentication**: Bearer JWT + Request Header validation. Required role: `ADMIN`.
* **Description**: Triggers a manual execution of the physical-to-ledger consistency validation engine across all warehouses and lots.

### Successful Response (`200 OK`)
```json
{
  "success": true,
  "status": "CONSISTENT",
  "timestamp": "2026-06-01T20:45:00.000Z",
  "certificate": {
    "signature": "SHA256-CERTIFICATE-HASH...",
    "itemsAudited": 1245,
    "lotsAudited": 3842,
    "discrepanciesCount": 0
  },
  "discrepancies": []
}
```

### Anomaly Detected Response (`200 OK` with quarantine)
```json
{
  "success": false,
  "status": "DISCREPANCY_DETECTED",
  "timestamp": "2026-06-01T20:45:00.000Z",
  "certificate": null,
  "discrepanciesCount": 1,
  "discrepancies": [
    {
      "type": "ITEM_LEDGER_MISMATCH",
      "itemId": "item-uuid-111",
      "warehouseId": "warehouse-uuid-222",
      "physicalQty": "150.0000",
      "ledgerQty": "148.0000",
      "variance": "2.0000",
      "quarantined": true
    }
  ]
}
```

---

## 2. Confirm Receipt Stock Transfer API

* **Endpoint**: `PUT /api/operations/transfers/:id/receive`
* **Authentication**: Bearer JWT. Required role: `WH_KEEPER`, `INV_MGR`, or `ADMIN` (scoped to destination warehouse).
* **Payload**: None required (uses document ID from path).
* **Description**: Transitions stock transfer status from `IN_TRANSIT` to `RECEIVED`, incrementing lot balances at the destination.

### Successful Response (`200 OK`)
```json
{
  "id": "transfer-uuid-888",
  "documentNumber": "TR-20260601-001",
  "fromWarehouseId": "warehouse-source-uuid",
  "toWarehouseId": "warehouse-dest-uuid",
  "status": "RECEIVED",
  "version": 2,
  "updatedAt": "2026-06-01T20:45:00.000Z"
}
```

---

## 3. Submit Inventory Issue API

* **Endpoint**: `POST /api/operations/issues/:id/submit`
* **Authentication**: Bearer JWT. Required role: `WH_KEEPER`, `INV_MGR`, or `ADMIN` (scoped to issuing warehouse).
* **Payload**: None required (uses document ID from path).
* **Description**: Submits/posts a draft inventory issue, decrementing items/lots and locking editing.

### Successful Response (`200 OK`)
```json
{
  "id": "issue-uuid-999",
  "documentNumber": "IS-20260601-002",
  "warehouseId": "warehouse-uuid-222",
  "status": "POSTED",
  "version": 3,
  "updatedAt": "2026-06-01T20:45:00.000Z"
}
```
