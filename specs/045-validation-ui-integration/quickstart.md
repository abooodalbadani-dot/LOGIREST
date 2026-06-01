# Quickstart & Verification Guide: Sprint 2

This document provides quickstart instructions, manual verification steps, and automated command suites to validate the Sprint 2 deliverables.

---

## 1. Local Database Setup & Seed

Ensure the database schema has the new quarantine fields:
```bash
# Apply schema changes (Prisma compile)
npx prisma generate

# Reset the database to ensure clean, consistent starting data
npx prisma migrate reset --force

# Seed the database
npm run db:seed
```

---

## 2. Testing the Consistency Validation Engine (ENG-NEW-001)

### Automated Jest Tests
Run the unit test suite targeting the validation engine logic:
```bash
# Run backend validation test suites
npm run test:api -- src/modules/admin/tests/inventory-validation.spec.ts
```

### Manual API Verification
Trigger validation manually via curl:
```bash
# Perform an on-demand audit scan
curl -X GET http://localhost:3000/api/admin/inventory/validate \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## 3. Verifying the "Confirm Receipt" UI Action (ENG-0005)

### Playwright E2E Test
```bash
# Execute transfer viewer E2E test
npx playwright test tests/e2e/operations/transfer-receive.spec.ts
```

### Manual Visual Steps
1. Login to the application as a Warehouse Keeper.
2. Navigate to **Stock Transfers** and select a transfer in `IN_TRANSIT` status.
3. Verify that the **Confirm Receipt** button is rendered prominently in the action toolbar.
4. Click the button, accept the modal dialog, and verify that status immediately updates to `RECEIVED` and the button disappears.

---

## 4. Verifying the "Submit Issue" Form Action (ENG-0006)

### Playwright E2E Test
```bash
# Execute inventory issue post E2E test
npx playwright test tests/e2e/operations/issue-submission.spec.ts
```

### Manual Visual Steps
1. Login as an Inventory Manager and navigate to **Inventory Issues**.
2. Create or open a `DRAFT` issue.
3. Verify that the **Submit** button is visible next to the Save draft action.
4. Add line items, click **Submit**, and confirm the action. The form will lock, showing a read-only state.

---

## 5. Verifying Form Locks for Procurement Documents (ENG-0019)

### Playwright E2E Test
```bash
# Execute procurement forms lock check
npx playwright test tests/e2e/procurement/form-locking.spec.ts
```

### Manual Visual Steps
1. Open an approved Purchase Order (`PO`) or approved Purchase Request (`PR`).
2. Verify that the entire page renders with a **Lock Banner** indicating "Approved & Locked".
3. Check that all fields, selectors, item counts, and action buttons are fully disabled (grayed-out).
