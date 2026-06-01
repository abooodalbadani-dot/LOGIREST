# Internal Endpoint Security Contracts

This document specifies the exact request and response validation behavior for the hardened Sprint 1 endpoints.

---

## 🔒 Hardened Controller Endpoints

All draft modification (PUT / DELETE) and workflow transition (POST) endpoints are bound to the authenticated user's warehouse scope.

| Endpoint Pattern | Hardened Methods | Action Type | Scope Target |
| :--- | :--- | :--- | :--- |
| `/purchase-requests/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/purchase-requests/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |
| `/purchasing/purchase-orders/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/purchasing/purchase-orders/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |
| `/purchasing/grn/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/purchasing/grn/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |
| `/operations/transfers/:id` | `PUT`, `DELETE` | Draft Modification | `document.fromWarehouseId` |
| `/operations/transfers/:id/ship` | `POST` | Workflow Transition | `document.fromWarehouseId` |
| `/operations/transfers/:id/receive` | `POST` | Workflow Transition | `document.toWarehouseId` |
| `/operations/transfers/:id/cancel` | `POST` | Workflow Transition | `document.fromWarehouseId` |
| `/operations/transfers/:id/post` | `POST` | Workflow Transition | `document.toWarehouseId` |
| `/operations/issues/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/operations/issues/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |
| `/operations/adjustments/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/operations/adjustments/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |
| `/kitchen-requests/:id` | `PUT`, `DELETE` | Draft Modification | `document.warehouseId` |
| `/kitchen-requests/:id/*` | `POST` | Workflow Transition | `document.warehouseId` |

---

## 🚫 Standard Security Failure Responses

### 1. Scope Bypass Response (403 Forbidden)
When an authenticated user attempts to update, delete, or transition a document belonging to a warehouse outside their assigned scope, the system immediately rejects the request.

- **HTTP Status Code**: `403 Forbidden`
- **Response Headers**: `Content-Type: application/json`
- **Response Payload**:
```json
{
  "statusCode": 403,
  "message": "Access to this warehouse is not authorized.",
  "error": "Forbidden"
}
```

### 2. State Transition Lock Bypass (400 Bad Request)
When any user role attempts to perform an invalid workflow action on a document in a locked status (e.g. attempting to re-approve a Posted document):

- **HTTP Status Code**: `400 Bad Request`
- **Response Headers**: `Content-Type: application/json`
- **Response Payload**:
```json
{
  "statusCode": 400,
  "message": "Invalid status transition: Action APPROVE is not allowed on purchase-request in status POSTED",
  "error": "Bad Request"
}
```
