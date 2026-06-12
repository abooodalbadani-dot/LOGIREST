# Quickstart & Verification: RBAC Master-Data Controller Guards

This quickstart guides you through running, verifying, and testing the role-based guards.

## 1. Running the System

Start the development environments for both backend and frontend:

```bash
# Start backend api
npm run dev --workspace=apps/api

# Start frontend web (if not already running)
npm run dev --workspace=apps/web
```

## 2. Running Automated Verification

Run the verification commands to check linting, types, and existing tests:

```bash
# Backend typecheck
npm run type-check --workspace=apps/api

# Frontend typecheck
npm run type-check --workspace=apps/web

# Backend unit tests
npx jest --config apps/api/jest.json --passWithNoTests

# Run RBAC E2E tests
npx jest --config apps/api/test/jest-e2e.json workflow-roles.e2e-spec.ts
```

## 3. Manual Verification Steps

### Test A: Backend Write Endpoint Rejection
1. Authenticate as a user with the role `WH_KEEPER`.
2. Send a `POST` request to `/api/master-data/items` with a valid item payload.
3. Verify the server returns `403 Forbidden`.
4. Check the application logs. Verify that a warning log entry is printed in the following format:
   ```text
   [Nest] WARN [...] RolesGuard: Unauthorized access attempt. Role: WH_KEEPER | Method: POST | Path: /api/master-data/items
   ```

### Test B: Backend FX Rates Read Rejection
1. Authenticate as a user with the role `KITCHEN_CHIEF`.
2. Send a `GET` request to `/api/currencies/fx-rates`.
3. Verify the server returns `403 Forbidden` and logs a structured warning.

### Test C: Valuation Report Column Masking
1. Log in to the web application as a `WH_KEEPER` user.
2. Navigate to the Inventory Valuation Report page.
3. Confirm that the `Unit Cost` and `Total Value` columns are **completely hidden**.
4. Log in as an `INV_MGR` user and confirm both columns are **visible**.
