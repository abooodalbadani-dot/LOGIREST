# Database Schema & Data Models: Phase 3 Hardening

This document outlines the database schema additions and modifications required for Phase 3 Observability, Security & Deployment Hardening of the LogiRest System.

## 1. OutboxEvent Entity

To support the Transactional Outbox Pattern, a new `OutboxEvent` table is added to the Prisma database schema. This model logs all notifications and external events that must be processed asynchronously.

### Table / Model Definition: `OutboxEvent`

| Field Name | Data Type | Database Constraints | Description |
| :--- | :--- | :--- | :--- |
| **id** | UUID | Primary Key, Default: `gen_random_uuid()` | Unique identifier for the outbox event record. |
| **eventType** | String | Required | The classification of the event (e.g. `PO_APPROVED`, `TRANSFER_SHIPPED`). |
| **payload** | JSON | Required | The serialized payload data needed by the worker to process the event. |
| **status** | Enum | Required, Default: `PENDING` | The processing state of the event. Enum values: `PENDING`, `SENT`, `FAILED`. |
| **retryCount** | Integer | Required, Default: `0` | The number of failed processing attempts. Max value allowed is `5`. |
| **errorMessage** | String | Nullable | Details of the last failure error message if any processing error occurred. |
| **createdAt** | DateTime | Required, Default: `now()` | The timestamp when the event was initially queued/written. |
| **processedAt**| DateTime | Nullable | The timestamp when the event was successfully dispatched. |

### Indexes & Performance Optimizations

```prisma
model OutboxEvent {
  id           String    @id @default(uuid()) @db.Uuid
  eventType    String
  payload      Json
  status       OutboxStatus @default(PENDING)
  retryCount   Int       @default(0)
  errorMessage String?   @db.Text
  createdAt    DateTime  @default(now())
  processedAt  DateTime?

  @@index([status, createdAt])
  @@map("outbox_events")
}

enum OutboxStatus {
  PENDING
  SENT
  FAILED
}
```

### Purpose of the Compound Index: `[status, createdAt]`
- The background worker polls the `OutboxEvent` table looking for events where `status = 'PENDING'` ordered by `createdAt ASC`.
- The index `[status, createdAt]` prevents full table scans on high-volume environments, ensuring the worker query remains extremely fast.

## 2. Event Retention & Cleanup Job

Succeeded events (`status = 'SENT'`) are retained for exactly **7 days** for auditing and operational validation. After 7 days, they are deleted automatically. Failed events are retained indefinitely.

- **Reconciliation/Clean-up Cron (`OutboxCleanupJob`)**: Runs daily at `02:00` using a scheduled backend runner.
- **Cleanup Query**:
  ```sql
  DELETE FROM outbox_events 
  WHERE status = 'SENT' AND "processedAt" < NOW() - INTERVAL '7 days';
  ```
