# API Contracts & Interface Definitions: Phase 3 Hardening

This document defines the interface contracts, request/response headers, schemas, and event payload shapes introduced in Phase 3.

## 1. Authentication Cookies & Headers Contract

All credentials propagation between `apps/web` and `apps/api` is transitioned to Secure Cookies.

### Cookie Headers Structure

#### POST `/auth/login` Response Headers
Upon successful user login, the server must issue cookies in the following format:

```http
HTTP/1.1 200 OK
Set-Cookie: access_token=<jwt_token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
Set-Cookie: refresh_token=<rtr_token>; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Content-Type: application/json

{
  "user": {
    "id": "usr-92831",
    "name": "Jane Doe",
    "role": "STORE_SUPERVISOR"
  }
}
```

#### POST `/auth/refresh` Request Headers
The browser automatically propagates the refresh token cookie when calling the refresh endpoint:

```http
POST /auth/refresh HTTP/1.1
Host: api.logirest.internal
Cookie: refresh_token=<rtr_token>
```

#### POST `/auth/refresh` Response Headers
A successful refresh request updates both cookies and executes Refresh Token Rotation (RTR):

```http
HTTP/1.1 200 OK
Set-Cookie: access_token=<new_jwt_token>; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600
Set-Cookie: refresh_token=<new_rtr_token>; Path=/auth/refresh; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
Content-Type: application/json

{
  "success": true
}
```

---

## 2. Health Endpoint Contract

The `/health` route is used by containers and orchestrators to evaluate operational health.

### GET `/health` Success Response
When all check-flows (including Prisma database connectivity) are operational:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2026-05-24T04:20:00.000Z",
  "details": {
    "database": {
      "status": "up",
      "latencyMs": 4
    },
    "memory": {
      "status": "up",
      "heapUsedBytes": 42000000
    }
  }
}
```

### GET `/health` Failure Response
If database connectivity is lost or timed out:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "unhealthy",
  "timestamp": "2026-05-24T04:20:15.000Z",
  "details": {
    "database": {
      "status": "down",
      "error": "PrismaClientKnownRequestError: Can't reach database server at localhost:5432"
    },
    "memory": {
      "status": "up",
      "heapUsedBytes": 45000000
    }
  }
}
```

---

## 3. Outbox Event Notification Payload

Outbox events written in the `OutboxEvent` table contain raw payload shapes parsed by asynchronous workers.

### Event Format Schema: `PO_APPROVED` (Purchase Order Approval)

```json
{
  "eventId": "evt-77a8b-90f1",
  "eventType": "PO_APPROVED",
  "createdAt": "2026-05-24T04:19:30.000Z",
  "data": {
    "purchaseOrderId": "po-2026-HQ-00042",
    "approverId": "usr-88123",
    "approverEmail": "supervisor@logirest.com",
    "branchCode": "HQ",
    "totalValue": "25000.00",
    "itemsCount": 12,
    "recipient": "supplier-procure@external-partner.com"
  }
}
```

### Event Format Schema: `TRANSFER_SHIPPED` (Stock Transfer Dispatch)

```json
{
  "eventId": "evt-88c9a-99f2",
  "eventType": "TRANSFER_SHIPPED",
  "createdAt": "2026-05-24T04:19:45.000Z",
  "data": {
    "transferId": "tr-2026-HQ-00018",
    "shipperId": "usr-92831",
    "sourceWarehouse": "WH-HQ-MAIN",
    "destinationWarehouse": "WH-DXB-OUTLET",
    "shippedItems": [
      { "itemId": "sku-1002", "shippedQty": 50 },
      { "itemId": "sku-1005", "shippedQty": 20 }
    ],
    "recipient": "wh-manager-dxb@logirest.com"
  }
}
```
