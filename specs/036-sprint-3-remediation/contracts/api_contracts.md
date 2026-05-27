# Phase 1 Contracts: Sprint 3 API & Endpoint Definitions

This document defines the API contracts, request/response formats, and validation rules introduced or modified in Sprint 3.

---

## 1. System Settings Update Contract

### **PUT** `/admin/settings`
Updates system-wide configuration settings. Hardened with typed DTO validation constraints.

#### Request Headers:
* `Content-Type`: `application/json`

#### Request Payload (`UpdateSettingsDto`):
```typescript
{
  system_name?: string;       // max length 100
  timezone?: string;          // max length 100
  base_currency?: string;     // max length 10
  language?: string;          // max length 50
  reply_to?: string;          // max length 100
  mail_provider?: "smtp" | "none";
  smtp_host?: string;         // max length 255
  smtp_port?: number;         // integer, min 1, max 65535
  smtp_user?: string;         // max length 255
  smtp_password?: string;     // max length 500
  smtp_encryption?: "none" | "tls" | "ssl";
  smtp_from?: string;         // valid email, max length 255
}
```

#### Response (200 OK):
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```
* **Validation Failure (400 Bad Request)**: Returned if `smtp_port` is not a number, `smtp_encryption` is an invalid string, etc.

---

## 2. Reports Visual Hub Contracts

### **GET** `/reports/wac-history`
Retrieves chronological cost adjustments (WAC shifts) for a specific item in a warehouse.

#### Query Parameters:
* `warehouseId`: `string` (required)
* `itemId`: `string` (required)

#### Response (200 OK):
```json
[
  {
    "postedAt": "2026-05-27T12:00:00Z",
    "newWac": 12.5000,
    "documentNumber": "GRN-2026-0001",
    "quantityChanged": 100.00
  },
  {
    "postedAt": "2026-05-27T14:30:00Z",
    "newWac": 13.0000,
    "documentNumber": "GRN-2026-0002",
    "quantityChanged": 50.00
  }
]
```

---

### **GET** `/reports/lot-trace`
Traces all ledger movements for a specific lot.

#### Query Parameters:
* `lotId`: `string` (required)

#### Response (200 OK):
```json
{
  "lotId": "LOT-100293",
  "itemId": "SKU-99238",
  "itemName": "Fresh Tomato",
  "movements": [
    {
      "postedAt": "2026-05-27T10:00:00Z",
      "warehouseId": "WH-MAIN",
      "warehouseCode": "WHM",
      "quantity": 150.0000,
      "documentType": "GRN",
      "documentNumber": "GRN-2026-0001"
    },
    {
      "postedAt": "2026-05-28T09:15:00Z",
      "warehouseId": "WH-MAIN",
      "warehouseCode": "WHM",
      "quantity": -30.0000,
      "documentType": "ISSUE",
      "documentNumber": "ISS-2026-0021"
    }
  ]
}
```

---

## 3. Streaming excel exports

### **GET** `/reports/stock-movements/export`
Generates and downloads a progressively-streamed spreadsheet report of stock ledger movements.

#### Headers Returned:
* `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
* `Content-Disposition`: `attachment; filename="stock-movements.xlsx"`
* `Transfer-Encoding`: `chunked` (progressive streaming payload)
