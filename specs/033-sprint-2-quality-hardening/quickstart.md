# Quickstart Guide: Sprint 2 Quality Hardening

This document provides quickstart and verification instructions for developers working on the Sprint 2 quality hardening feature.

## 1. Local Testing Environment Setup

Ensure the NestJS API and Next.js frontend are running locally:

```bash
# In the repository root
npm run dev
```

The services will be exposed at:
* NestJS API: `http://localhost:4000/api/v1`
* Next.js Web: `http://localhost:3000`

---

## 2. Verifying Background Tasks

### Lock Cleanup Job `@Cron`
To test that the lock cleanup background cron job runs every minute, observe the backend logs. You should see log outputs on a 60-second interval:

```text
[Nest] 12345  - 05/27/2026, 12:00:00 AM   LOG [LockCleanupJob] Starting expired inventory locks cleanup...
[Nest] 12345  - 05/27/2026, 12:00:00 AM   LOG [LockCleanupJob] Expired locks cleanup completed. Released 0 locks.
```

### Low Stock Alert Redis Debounce
To verify the Redis debounce on low stock alerts:
1. Trigger a low-stock alert event.
2. Confirm the alert is sent and a Redis key matching `alert:lowstock:debounce:<itemId>` is created.
3. Check Redis directly using your CLI or a client:
   ```bash
   redis-cli GET alert:lowstock:debounce:<itemId>
   # Returns "1"
   redis-cli TTL alert:lowstock:debounce:<itemId>
   # Returns a TTL under 86400 seconds (e.g., 86395)
   ```
4. Trigger the low-stock alert event again immediately. Verify that no email notification is sent and a log message warns about active debouncing.

---

## 3. Verifying Security & Observability

### Login Failure Auditing
1. Make a failed login attempt via the web interface or API:
   ```bash
   curl -X POST http://localhost:4000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"fakeuser@gmail.com", "password":"wrongpassword"}'
   ```
2. Verify an audit log record is created in the database:
   ```sql
   SELECT * FROM audit_logs WHERE action = 'LOGIN_FAILED' ORDER BY created_at DESC LIMIT 1;
   ```
3. Check that the row captures:
   * Target ID: `'fakeuser@gmail.com'`
   * Action: `'LOGIN_FAILED'`
   * Target Table: `'users'`
   * `userId`: `null` (since the email does not exist)

### Prometheus Outbox Failure Metrics
Verify that outbox failures are tracked in the metrics endpoint:
1. Simulate an outbox failure (e.g. inject an outbox event with bad format or SMTP unconfigured).
2. Query the metrics endpoint:
   ```bash
   curl http://localhost:4000/metrics | grep logirest_outbox_events_failed_total
   ```
3. Verify the metric counter increments by 1.

---

## 4. Admin Interfaces Manual Walkthrough

### Frozen Items Page
1. Force an item to be frozen in your PostgreSQL development database:
   ```sql
   UPDATE warehouse_items SET is_frozen = true WHERE sku = 'SKU-MILK-001';
   ```
2. Log into the application as an `ADMIN` or `INV_MGR`.
3. Navigate to **Admin Settings** > **Frozen Items**.
4. Confirm the item is listed with correct warehouse and SKU.
5. Click **Unfreeze** and verify the item is removed from the table.
6. Verify an audit log entry was created:
   ```sql
   SELECT * FROM audit_logs WHERE action = 'UNFREEZE_ITEM' ORDER BY created_at DESC LIMIT 1;
   ```

### Failed Outbox Events Console
1. Navigate to **Admin Settings** > **Outbox failures**.
2. Review failed outbox notification logs.
3. Click **Retry** on a row to trigger re-queuing, or click **Retry All** to requeue in bulk.
