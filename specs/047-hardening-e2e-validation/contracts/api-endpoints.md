# API Contracts: Hardening & Route Diagnostic Security (Sprint 4)

This contract defines the public HTTP interfaces, query parameters, authorization levels, request schemas, and response footprints for Sprint 4 hardening features.

---

## 🏥 1. Split Health Diagnostics & Metrics

### GET `/health`
Public uptime health check for load balancers.

* **Authorization**: `Public` (No Authentication Required)
* **Response Body (`200 OK`)**:
  ```json
  {
    "status": "ok"
  }
  ```

---

### GET `/health/backup`
Fetch detailed database backup schedules, backup file keys, and Recovery Point Objective (RPO) latency calculations.

* **Authorization**: `Role IN ['ADMIN', 'AUDITOR']` (JWT Verification Required)
* **Response Body (`200 OK`)**:
  ```json
  {
    "lastBackupTimestamp": "2026-06-01T22:00:00.000Z",
    "rpoDeltaSeconds": 2700,
    "backups": [
      {
        "fileKey": "db-backup-20260601-220000.sql.gz",
        "sizeBytes": 45120300,
        "isEncrypted": true,
        "status": "COMPLETED"
      }
    ]
  }
  ```
* **Error States**:
  - `401 Unauthorized`: No valid authorization JWT cookie (`logirest_token`) provided.
  - `403 Forbidden`: The user is authenticated but does not hold the `ADMIN` or `AUDITOR` role.

---

### GET `/metrics`
Prometheus system metrics scraper dump.

* **Authorization**: Require `X-Metrics-Token` header key validation against static system configuration.
* **Headers**:
  * `X-Metrics-Token`: `SystemSecretTokenString`
* **Response Body (`200 OK`, `text/plain`)**:
  ```text
  # HELP node_cpu_seconds_total Seconds the CPUs spent in each mode.
  # TYPE node_cpu_seconds_total counter
  node_cpu_seconds_total{cpu="0",mode="idle"} 36201.21
  node_cpu_seconds_total{cpu="0",mode="system"} 124.50
  node_cpu_seconds_total{cpu="0",mode="user"} 512.43
  # HELP node_memory_MemTotal_bytes Memory size in bytes.
  # TYPE node_memory_MemTotal_bytes gauge
  node_memory_MemTotal_bytes 16723492864
  # HELP node_memory_MemFree_bytes Memory free in bytes.
  # TYPE node_memory_MemFree_bytes gauge
  node_memory_MemFree_bytes 410294812
  ```
* **Error States**:
  - `403 Forbidden`: The request lacks the `X-Metrics-Token` header or the token matches incorrectly.

---

## 🛡️ 2. CSRF Handshake Handlers

### POST / PUT / DELETE `/*` (State-Changing Mutations)
All state-changing mutations must pass the global `CsrfGuard`.

* **Validation Rules**:
  * If request method is POST, PUT, PATCH, or DELETE, check that the incoming HTTP header `X-XSRF-TOKEN` matches the decrypted `XSRF-TOKEN` session cookie value.
* **Error States**:
  - `403 Forbidden`: Handshake verification failed:
  ```json
  {
    "statusCode": 403,
    "message": "CSRF token mismatch. Mutation blocked by security guard."
  }
  ```
