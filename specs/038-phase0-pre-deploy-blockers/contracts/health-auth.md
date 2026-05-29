# Endpoint Interface Contracts: Phase 0 — Pre-Deploy Blockers

**Branch**: `038-phase0-pre-deploy-blockers` | **Date**: 2026-05-29

This document outlines the API contracts for the public/internal readiness probes and refresh token authentication endpoints that are impacted by Phase 0 reliability hardening.

---

## 1. System Readiness Health Probe
Used by the Docker healthcheck commands inside the containers and reverse proxy status listeners.

* **Path**: `/api/v1/health`
* **Method**: `GET`
* **Access**: Public (Internal or loopback authorized)
* **Response Timeout Constraint**: Must respond or reject within `2500ms` (guaranteed by internal `Promise.race` timeout).

### Success Response
* **Status**: `200 OK`
* **Headers**: `Content-Type: application/json`
* **Payload**:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-29T19:00:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "latencyMs": 4
    },
    "redis": {
      "status": "healthy",
      "latencyMs": 1
    },
    "stockLedger": {
      "status": "healthy",
      "recordCount": 45108
    }
  }
}
```

### Unhealthy Response (e.g. Database connection hung/failed)
* **Status**: `503 Service Unavailable`
* **Headers**: `Content-Type: application/json`
* **Payload**:
```json
{
  "status": "unhealthy",
  "timestamp": "2026-05-29T19:02:15.000Z",
  "error": "database health check timed out after 2000ms",
  "services": {
    "database": {
      "status": "unhealthy",
      "error": "TimeoutError"
    },
    "redis": {
      "status": "healthy",
      "latencyMs": 1
    },
    "stockLedger": {
      "status": "unhealthy",
      "error": "Database unreachable"
    }
  }
}
```

---

## 2. Refresh Token Rotation (RTR)
Used for renewing access tokens securely using short-lived rotation refresh tokens.

* **Path**: `/api/v1/auth/refresh`
* **Method**: `POST`
* **Headers Required**: 
  * `Authorization: Bearer <refresh_token>`
* **Payload**: None (Session identified via Bearer token hash validation)

### Success Response
* **Status**: `201 Created`
* **Headers**: `Content-Type: application/json`
* **Payload**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d8a1f73b9e4c5b2a0c7e8f1a3d9b6c2e..."
}
```

### Failure Responses

#### 1. Version Conflict Error (Concurrency Race condition)
* **Status**: `400 Bad Request`
* **Headers**: `Content-Type: application/json`
* **Payload**:
```json
{
  "statusCode": 400,
  "code": "VERSION_CONFLICT",
  "message": "Version conflict detected. Please refresh and retry."
}
```

#### 2. Revoked Token Replay Attack (Breach attempt or token hijack)
* **Status**: `401 Unauthorized`
* **Headers**: `Content-Type: application/json`
* **Payload**:
```json
{
  "statusCode": 401,
  "code": "TOKEN_REVOKED",
  "message": "This refresh token has already been used and is revoked. All sessions for this user have been terminated for security."
}
```
