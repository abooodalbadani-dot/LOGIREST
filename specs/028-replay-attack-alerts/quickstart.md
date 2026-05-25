# Developer Quickstart: Security Replay Attack Alerts

This guide explains how to local-test and verify the refresh token replay attack alerting system in LogiRest.

---

## 1. Local Testing Environment Setup

Ensure your local Postgres database and Redis instances are running.
```bash
# Start Docker services
docker-compose up -d redis db
```

---

## 2. Triggering a Refresh Token Replay Attack

To simulate a token hijack / replay attack:

1. **Obtain a valid refresh token**:
   * Perform a standard login request to `POST /api/v1/auth/login`.
   * Capture the `logirest_refresh` cookie set by the server.

2. **Revoke the token (simulated hijack)**:
   * Perform a refresh token request to rotate the token: `POST /api/v1/auth/refresh`.
   * The server will set a new cookie and mark the previous token as `isRevoked: true` (used) in the database.

3. **Replay the old token**:
   * Make a second request to `POST /api/v1/auth/refresh` sending the **first** (now revoked) cookie.
   * The server will identify this rotation violation (Family Rotation Replay), revoke the entire session tree, and trigger the security alerts.

---

## 3. Verifying Alerts

### In-System Notification Verification
Verify that a new unread admin notification is created:
```sql
SELECT * FROM "notification_logs" 
WHERE "target_role" = 'ADMIN' 
ORDER BY "created_at" DESC 
LIMIT 1;
```

### Outbox Event Verification
Verify that the `SECURITY_ALERT_REPLAY_ATTACK` outbox event is successfully queued:
```sql
SELECT * FROM "outbox_events" 
WHERE "event_type" = 'SECURITY_ALERT_REPLAY_ATTACK' 
ORDER BY "created_at" DESC 
LIMIT 1;
```

---

## 4. Running Automated Tests

To validate functionality via the test suite:

```bash
# Run unit tests for outbox worker
npm run test --apps/api src/modules/outbox/outbox.worker.spec.ts

# Run E2E tests for refresh token rotation replay
npm run test --apps/api test/rtr.e2e-spec.ts
```
