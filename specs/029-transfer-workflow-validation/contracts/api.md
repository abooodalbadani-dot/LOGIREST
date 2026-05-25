# API Endpoint Contracts: Fix Transfer SHIP/RECEIVE Workflow Role Validation

## 1. Ship Transfer

**Endpoint**: `POST /api/v1/operations/transfers/:id/ship`  
**Description**: Triggers transfer shipment: locks items, updates status to `IN_TRANSIT`, decrements origin stock, and logs transitions.  

### Headers
*   `Authorization`: `Bearer <Token>` (Required)
*   `x-warehouse-id`: Active user warehouse ID context (Required)
*   `x-branch-id`: Active user branch ID context (Required)

### Path Parameters
*   `id`: `string` (UUID) - Transfer ID

### Request Body
```json
{
  "version": 1
}
```
*   `version` (optional): Numeric document version for optimistic concurrency control.

### Success Response
*   **Status**: `200 OK`
*   **Body**:
```json
{
  "id": "e44d567a-12bc-4def-90ab-1234567890ab",
  "transferNumber": "TR-2026-0001",
  "fromWarehouseId": "wh-origin-id-123",
  "toWarehouseId": "wh-dest-id-456",
  "status": "IN_TRANSIT",
  "version": 2,
  "createdAt": "2026-05-25T12:00:00.000Z"
}
```

### Error Responses

#### 403 Forbidden (Unauthorized Attempt)
Occurs when the user does not have permission in the centralized matrix or is not scoped to the origin warehouse branch.
```json
{
  "statusCode": 403,
  "message": "User with role WH_KEEPER is not authorized for the origin warehouse branch",
  "error": "Forbidden"
}
```

#### 400 Bad Request (Status Mismatch or Concurrency Conflict)
```json
{
  "statusCode": 400,
  "message": "Transfer must be in DRAFT status to be shipped",
  "error": "Bad Request"
}
```

---

## 2. Receive Transfer

**Endpoint**: `POST /api/v1/operations/transfers/:id/receive`  
**Description**: Receives the transfer at the target branch, updating status to `RECEIVED` and incrementing target stock.  

### Headers
*   `Authorization`: `Bearer <Token>` (Required)
*   `x-warehouse-id`: Active user warehouse ID context (Required)
*   `x-branch-id`: Active user branch ID context (Required)

### Path Parameters
*   `id`: `string` (UUID) - Transfer ID

### Request Body
```json
{
  "version": 2,
  "linesReceived": [
    {
      "lineId": "line-id-abc",
      "quantityReceived": 10
    },
    {
      "lineId": "line-id-xyz",
      "quantityReceived": 8,
      "varianceReason": "DAMAGED"
    }
  ]
}
```

### Success Response
*   **Status**: `200 OK`
*   **Body**:
```json
{
  "id": "e44d567a-12bc-4def-90ab-1234567890ab",
  "transferNumber": "TR-2026-0001",
  "fromWarehouseId": "wh-origin-id-123",
  "toWarehouseId": "wh-dest-id-456",
  "status": "RECEIVED",
  "version": 3,
  "createdAt": "2026-05-25T12:00:00.000Z"
}
```
