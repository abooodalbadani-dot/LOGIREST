# API Contract: Void Endpoints

This document defines the REST API contract for voiding posted inventory documents.

## Endpoints Summary

- `POST /api/v1/grn/:id/void` - Void a posted Goods Received Note.
- `POST /api/v1/issues/:id/void` - Void a posted Stock Issue.
- `POST /api/v1/adjustments/:id/void` - Void a posted Inventory Adjustment.
- `POST /api/v1/kitchen-requests/:id/void` - Void a posted Kitchen Request.
- `POST /api/v1/transfers/:id/void` - Void a received Inventory Transfer.

---

## Shared Request & Response Shapes

### HTTP Headers:
- `Authorization: Bearer <JWT>` (Required: Role must be `ADMIN` or `INV_MGR`)
- `X-XSRF-TOKEN: <token>` (Required for CSRF prevention)
- `x-branch-id: <branchId>` (Required context header)

### Request Body:
```json
{
  "comments": "Mandatory explanation of why this document is being voided (min 5 chars)."
}
```

### Response Body (200 OK):
Returns the updated document details.
```json
{
  "id": "clxb123450000xx1a",
  "documentNumber": "GRN-2026-0001",
  "status": "VOIDED",
  "comments": "Entering void comments reason here",
  "updatedAt": "2026-05-26T15:40:00.000Z",
  "updatedBy": "user_id_here"
}
```

### Error Responses:

#### 400 Bad Request (Missing/Short Comment or Stock Depleted):
```json
{
  "statusCode": 400,
  "message": "Reversal failed: Reversing this document would result in negative quantity on hand for item SKU-001.",
  "error": "Bad Request"
}
```

#### 403 Forbidden (Unauthorized Role or missing CSRF token):
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

#### 404 Not Found (Document does not exist):
```json
{
  "statusCode": 404,
  "message": "Goods Received Note clxb123450000xx1a not found.",
  "error": "Not Found"
}
```
