# Data Model Design: Security Replay Attack Alerts

This document defines the database schemas, relationships, and validations required to support **Security Replay Attack Alerts**.

---

## 1. Primary Entities

### `OutboxEvent`
The event-logging table governing outbox dispatch processes.

| Field Name | Type | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Primary Key, UUID | Unique event identifier. |
| `eventType` | `String` | Required | Type of event (e.g., `SECURITY_ALERT_REPLAY_ATTACK`). |
| `payload` | `Json` | Required | Custom payload containing User ID, Session ID, Timestamp, IP Address. |
| `status` | `Enum` | `PENDING`, `SUCCEEDED`, `FAILED` | Process status. |
| `attempts` | `Int` | Default: `0`, Max: `5` | Tracking retry dispatches. |
| `lastError` | `String` | Nullable | Records stack traces or SMTP errors on failure. |
| `createdAt` | `DateTime` | Default: `now()` | Time event was generated. |
| `processedAt`| `DateTime` | Nullable | Time event successfully processed. |

---

### `NotificationLog`
The in-system operational alert table.

| Field Name | Type | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Primary Key, UUID | Unique notification identifier. |
| `targetRole` | `Enum` | Required (matches `Role` enum) | Target permission role (e.g., `ADMIN`). |
| `warehouseId` | `String` | Nullable, Foreign Key | Optional scoping to specific branch/warehouse. |
| `message` | `String` | Required | Alert notification text showing incident details. |
| `isRead` | `Boolean` | Default: `false` | Read tracking indicator. |
| `documentType`| `Enum` | Nullable | Associated document model (e.g., `N/A`). |
| `documentId` | `String` | Nullable | Associated document record ID. |
| `createdAt` | `DateTime` | Default: `now()` | Alert generation timestamp. |

---

## 2. Validation & Flow Constraints

* **Atomic Session Revocation & Logging**:
  * Upon replay detection, all session refresh tokens are flagged with `isRevoked: true`.
  * An immutable `AuditLog` entry is appended to track target IDs.
  * The `SECURITY_ALERT_REPLAY_ATTACK` outbox event is registered.
  * The `NotificationLog` entry is written with target role `Role.ADMIN` and description message.
  * All these operations execute inside a single transactional block (`tx`), ensuring complete consistency.

* **Nodemailer Template Formatting**:
  * If `payload.ipAddress` is null, the outbox template resolves it to `"Unknown"`.
  * Email wrapper incorporates standard LogiRest brand templates.
