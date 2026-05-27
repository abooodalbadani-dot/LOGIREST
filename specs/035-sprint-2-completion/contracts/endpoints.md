# API Endpoints & Interface Contracts

This document outlines the API request/response structures modified or introduced for Sprint 2 Completion.

---

## 1. System Settings API

### Update System Settings
Updates global system configuration values. Whitelists inputs and strips unknown fields silently.

* **Endpoint**: `PUT /admin/settings`
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "system_name": "LogiRest Kitchen Core",
    "timezone": "Asia/Riyadh",
    "base_currency": "SAR",
    "language": "ar",
    "mail_provider": "smtp",
    "smtp_host": "smtp.mailtrap.io",
    "smtp_port": 587,
    "smtp_user": "user-12345",
    "smtp_password": "password-abcde",
    "smtp_encryption": "tls",
    "smtp_from": "no-reply@logirest.com"
  }
  ```
* **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "data": {
      "system_name": "LogiRest Kitchen Core",
      "timezone": "Asia/Riyadh",
      "base_currency": "SAR",
      "language": "ar",
      "mail_provider": "smtp",
      "smtp_host": "smtp.mailtrap.io",
      "smtp_port": 587,
      "smtp_user": "user-12345",
      "smtp_encryption": "tls",
      "smtp_from": "no-reply@logirest.com"
    }
  }
  ```
* **Validation Error Response** (`400 Bad Request`):
  ```json
  {
    "statusCode": 400,
    "message": [
      "smtp_port must be an integer number",
      "smtp_encryption must be one of the following values: none, tls, ssl"
    ],
    "error": "Bad Request"
  }
  ```

---

## 2. Goods Receipt Note (GRN) APIs

### List Goods Received Notes (Real paginated API)
* **Endpoint**: `GET /grn?page=1&limit=10`
* **Success Response** (`200 OK`):
  ```json
  {
    "data": [
      {
        "id": "grn-abc12345",
        "documentNumber": "GRN-2026-0001",
        "supplierName": "Hala Food Supplies",
        "status": "POSTED",
        "postedAt": "2026-05-27T12:00:00Z",
        "totalAmount": 1500.00,
        "supplierCurrency": "USD",
        "baseCurrency": "SAR"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
  ```

### View Goods Received Note details
* **Endpoint**: `GET /grn/:id`
* **Success Response** (`200 OK`):
  ```json
  {
    "id": "grn-abc12345",
    "documentNumber": "GRN-2026-0001",
    "purchaseOrderId": "po-12345",
    "supplierName": "Hala Food Supplies",
    "supplierCurrency": "USD",
    "baseCurrency": "SAR",
    "status": "POSTED",
    "items": [
      {
        "id": "line-1",
        "itemId": "item-999",
        "itemName": "Extra Virgin Olive Oil",
        "sku": "EVOO-1L",
        "qtyReceived": 100,
        "unitCost": 15.00
      }
    ]
  }
  ```

### Post Goods Received Note
* **Endpoint**: `POST /grn/:id/post`
* **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "documentNumber": "GRN-2026-0001",
    "status": "POSTED",
    "postedAt": "2026-05-27T18:02:00Z"
  }
  ```

---

## 3. Operations Void APIs

* **Endpoints**:
  * `POST /operations/grn/:id/void`
  * `POST /operations/transfer/:id/void`
  * `POST /operations/issue/:id/void`
  * `POST /operations/adjustment/:id/void`
  * `POST /operations/kitchen-request/:id/void`
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>`
* **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "documentId": "grn-abc12345",
    "status": "VOIDED",
    "message": "Document successfully voided and ledger entries reversed."
  }
  ```
* **Conflict / State Guard Error Response** (`400 Bad Request`):
  ```json
  {
    "statusCode": 400,
    "message": "Only POSTED documents can be voided.",
    "error": "Bad Request"
  }
  ```
