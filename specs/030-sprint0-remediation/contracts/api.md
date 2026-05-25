# API Interface Contracts: Sprint 0 Readiness Hardening

This document defines the REST API interfaces introduced or updated as part of the Sprint 0 readiness features.

---

## 1. SMTP Delivery Health Dashboard (TASK-006)

Provides administrators with delivery metrics and setup verification.

### Endpoint: `GET /admin/system/email-status`

- **Role Requirement**: `ADMIN`
- **Response Headers**: `Content-Type: application/json`
- **Response Payload (`200 OK`)**:
  ```json
  {
    "smtpConfigured": false,
    "failedEventCount": 12,
    "lastFailureAt": "2026-05-25T14:30:00.000Z"
  }
  ```
- **Response Payload (`403 Forbidden`)**:
  ```json
  {
    "statusCode": 403,
    "message": "Forbidden resource"
  }
  ```

---

## 2. Document Cancellation Transition (TASK-009)

Triggers the state machine transition to cancel a DRAFT-stage purchase request.

### Endpoint: `POST /purchase-requests/:id/cancel`

- **Parameters**: `id` (UUID of the Purchase Request)
- **Role Requirement**: Creator or `ADMIN`
- **Request Payload**: None
- **Response Payload (`200 OK`)**:
  ```json
  {
    "id": "7f8b9e0a-1c2d-3e4f-5a6b-7c8d9e0a1b2c",
    "requestNumber": "PR-2026-0004",
    "status": "CANCELLED",
    "version": 2,
    "updatedAt": "2026-05-25T17:05:00.000Z"
  }
  ```
- **Response Payload (`400 Bad Request` - State Guard Violation)**:
  ```json
  {
    "statusCode": 400,
    "message": "Cannot cancel document in state SUBMITTED"
  }
  ```
- **Response Payload (`403 Forbidden` - Role Guard Violation)**:
  ```json
  {
    "statusCode": 403,
    "message": "Forbidden resource"
  }
  ```
