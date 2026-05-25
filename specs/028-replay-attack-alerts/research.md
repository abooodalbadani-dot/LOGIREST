# Research Notes: Security Replay Attack Alerts

This document records the architectural research and technical decisions resolved during Phase 0 of the **Security Replay Attack Alerts** implementation.

---

## 1. Dynamic Recipient Resolution Strategy

### Decision
Query active users matching the `Role.ADMIN` role dynamically at dispatch time from the database during outbox worker processing:
```ts
const users = await this.prisma.user.findMany({
  where: {
    role: Role.ADMIN,
    isActive: true,
  },
  select: { email: true, name: true },
});
```

### Rationale
* **Security & Access Control**: If an administrator's account is compromised and subsequently deactivated, dynamic resolution prevents sensitive security alerts containing system payloads from being delivered to their inbox.
* **Operational Accuracy**: If new administrators are added after the event is queued but before it is fully dispatched, they will correctly receive the notification.

### Alternatives Considered
* **Static Snapshotting**: Capturing email addresses at detection time and storing them in the event payload. 
  * *Rejected because*: Creates a data security risk of sending alerts to accounts that might be deactivated during high-severity system investigations.

---

## 2. In-System Notification Integration

### Decision
Write directly to `prisma.notificationLog` inside the same Prisma database transaction block in `rtr.service.ts` where session token revocation and outbox event writing are executed:
```ts
await tx.notificationLog.create({
  data: {
    targetRole: 'ADMIN',
    message: `Replay attack detected for user ${existingToken.userId} on session ${existingToken.sessionId}`,
  },
});
```

### Rationale
* **Atomic Integrity**: If the database transaction commits, BOTH the outbox email event AND the in-system dashboard notification are guaranteed to be created. If it rolls back, no half-alerts occur.
* **Transaction Compatibility**: Invoking the external `NotificationService` would create a separate transactional connection, violating isolation rules and exposing the system to partial failure states.

### Alternatives Considered
* **Injecting `NotificationService` outside transaction**:
  * *Rejected because*: Can cause unsynchronized states where token revocation rolls back due to a constraint, but an admin notification is still pushed.

---

## 3. Outbox Failure & Retry Policy

### Decision
Configure the outbox worker processing loop to handle SMTP network errors with an exponential backoff policy up to 5 attempts over 1 hour.
* **Attempts <= 5**: Mark status as `PENDING` and increment `attempts`.
* **Attempts > 5**: Mark status as `FAILED`, write error logs to database, and throw a critical server log warning.

### Rationale
* Prevents infinite retry loops which degrade system performance.
* Provides operational visibility into delivery errors.

### Alternatives Considered
* **Immediate Fail (0 Retries)**:
  * *Rejected because*: Temporary network drops or SMTP provider rate limits would immediately discard critical security notifications.
