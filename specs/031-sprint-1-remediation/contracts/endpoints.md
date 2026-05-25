# API Endpoint Contracts: Sprint 1 Production Readiness

This document defines the REST API interfaces added or modified as part of Sprint 1.

---

## 1. Fast Count Metadata Endpoint (Proactive Export Guard)

### `GET /reports/count`
Used by the frontend to verify the size of a dataset prior to initiating an XLSX download.

* **Query Parameters**:
  * `reportType` (Required): `MOVEMENTS` | `EXPIRY` | `WAC_HISTORY` | `LOT_TRACE`
  * `startDate` (Optional): ISO Date String
  * `endDate` (Optional): ISO Date String
  * `warehouseId` (Optional): UUID
  * `itemId` (Optional): UUID

* **Success Response (`200 OK`)**:
  ```json
  {
    "count": 14250,
    "limit": 50000,
    "isExportable": true
  }
  ```

* **Limit Exceeded Response (`200 OK`)**:
  ```json
  {
    "count": 68412,
    "limit": 50000,
    "isExportable": false,
    "message": "Export limit exceeded. Please apply date or warehouse filters to export."
  }
  ```

---

## 2. Report Export Endpoint (Chunked & Enforced)

### `GET /reports/export`
Trigger the paginated, memory-safe download of report results.

* **Query Parameters**:
  * `reportType` (Required): `MOVEMENTS` | `EXPIRY` | `WAC_HISTORY` | `LOT_TRACE`
  * `[filters...]` (Same as above)

* **Success Response (`200 OK`)**:
  * **Headers**:
    * `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    * `Content-Disposition: attachment; filename="report-movements-2026-05-25.xlsx"`
  * **Body**: Streamed XLSX file.

* **Payload Too Large Response (`413 Payload Too Large`)**:
  * **Headers**: `Content-Type: application/json`
  * **Body**:
    ```json
    {
      "statusCode": 413,
      "message": "Payload Too Large: The requested export contains 68,412 rows, which exceeds the limit of 50,000. Please narrow your selection using filters.",
      "error": "Payload Too Large"
    }
    ```

---

## 3. Voiding Posted Documents (TASK-019)

### `POST /operations/:documentType/:id/void`
Initiates a chronological reversing transaction (Admin-only).

* **URI Variables**:
  * `documentType`: `goods-receipts` | `adjustments` | `issues`
  * `id`: UUID of the posted document.

* **Request Headers**:
  * `Authorization: Bearer <token>`
  * `x-branch-id`: UUID (IDOR resolution)

* **Success Response (`200 OK`)**:
  ```json
  {
    "id": "e4b2d5a3-7649-4b2e-a579-8802d3345f89",
    "documentNumber": "GRN-2026-0042",
    "status": "VOIDED",
    "voidedAt": "2026-05-25T18:44:00.000Z",
    "voidedByUserId": "c6a7d5b1-0941-477c-bc22-3345e556fb98",
    "reversalStockLedgerCount": 12,
    "reversalCostLedgerCount": 12
  }
  ```

* **Negative Inventory Block Response (`400 Bad Request`)**:
  ```json
  {
    "statusCode": 400,
    "message": "Cannot void GRN: 20 units of SKU 'SKU-EGGS-30' have already been consumed. Please reverse downstream issues first.",
    "error": "Bad Request"
  }
  ```

---

## 4. SMTP Delivery Transparency Check (TASK-006)

### `GET /admin/system/email-status`
Returns delivery stats and tells if SMTP configuration is configured and healthy.

* **Success Response (`200 OK`)**:
  ```json
  {
    "smtpConfigured": true,
    "failedEventCount": 0,
    "lastFailureAt": null,
    "unconfiguredAlertsSent": 0
  }
  ```

* **SMTP Missing Warning Response (`200 OK`)**:
  ```json
  {
    "smtpConfigured": false,
    "failedEventCount": 14,
    "lastFailureAt": "2026-05-25T12:04:11.000Z",
    "unconfiguredAlertsSent": 1
  }
  ```
