# Quickstart & Verification Guide: Sprint 0 Readiness Hardening

This guide helps you verify and test the implemented Sprint 0 readiness features.

---

## Prerequisites & Initial Startup

Make sure your environment is up and running:

1. **Start the API Server**:
   ```bash
   npm run start:dev --workspace=apps/api
   ```
2. **Start the Web App**:
   ```bash
   npm run dev --workspace=apps/web
   ```

---

## 1. Verify Daily Reconciliation Job Scheduler (TASK-005)

### Verification
Run the unit tests targeting the new `@Cron` scheduling logic:
```bash
npm run test -- apps/api/src/modules/ledger/reconciliation.job.spec.ts
```

---

## 2. Verify SMTP Delivery health & Dashboard (TASK-006)

### Local Configuration Test
1. Set the email server to an unconfigured state in `.env` (remove `SMTP_HOST` or set it to an empty value).
2. Trigger an outbox event (e.g. login security warning or mock replay attack).
3. Query the status endpoint to verify the health dashboard displays unconfigured state:
   ```bash
   curl -X GET http://localhost:3000/admin/system/email-status -H "Authorization: Bearer <ADMIN_TOKEN>"
   ```
4. Verify the database `outbox_events` table contains status `FAILED` and `lastError: 'SMTP_NOT_CONFIGURED'`.

---

## 3. Verify Database Positive Constraints (TASK-007)

### Verification
Execute the automated E2E tests checking positive constraint enforcement:
```bash
npx jest --config apps/api/test/jest-e2e.json apps/api/test/db-integrity.e2e-spec.ts
```

### Manual Database Check
Attempt to insert a negative quantity on hand directly:
```sql
INSERT INTO "warehouse_items" ("warehouseId", "itemId", "qty_on_hand", "qty_allocated")
VALUES ('wh-uuid-1', 'item-uuid-1', -5, 0);
-- Expected: Error constraint "warehouse_items_qty_on_hand_nonneg" violation
```

---

## 4. Verify Currency Configuration Rendering (TASK-008)

### Verification
1. Access the Store Manager Dashboard page.
2. In database settings, change `base_currency` to `'AED'`.
3. Reload the browser and verify that all currency numbers render as `XXX AED` dynamically.

---

## 5. Verify Document Cancellation (TASK-009)

### Automated Test
Run the E2E tests:
```bash
npx jest --config apps/api/test/jest-e2e.json apps/api/test/workflow-transitions.e2e-spec.ts
```

### Manual verification
1. Open a saved draft Purchase Request.
2. Verify the "Cancel" button is visible.
3. Click "Cancel". The page should redirect to the lists, and the document status must read "Cancelled" and be read-only.
