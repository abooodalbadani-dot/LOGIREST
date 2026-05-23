# Quickstart: API Controllers (Phase 8)

This guide helps you test and verify the Phase 8 API controllers and security guards.

## 1. Prerequisites
Ensure you have the backend dependencies and database migrations applied:
```bash
npm install
npx prisma generate --schema=apps/api/prisma/schema.prisma
```

## 2. Running Verification Checks
To verify compilation and testing:
```bash
# Build the NestJS API
npm run build --filter=api

# Run NestJS API unit and integration tests
npm run test --filter=api
```

## 3. Manual Verification Steps
You can run manual verification against the controller endpoints:
1. **Authentication**:
   - Send `POST /api/v1/auth/login` to obtain the secure HttpOnly cookie.
2. **Scope Validation**:
   - Make a request to a scoped endpoint (e.g. `GET /api/v1/master-data/warehouses`) without `x-warehouse-id` or with an unauthorized scope to confirm it returns `403 Forbidden`.
3. **Workflow Guards**:
   - Create a PR/PO draft, and verify that attempting to run state transitions (like approving a draft or submitting a posted record) returns a workflow validation error.
4. **Archiving Rules (Soft-Delete)**:
   - Archive a warehouse with active inventory and confirm it returns `400 Bad Request`.
   - Archive an empty warehouse and confirm `isActive` is set to `false`.
   - Verify that operational requests exclude the archived warehouse, while historical reports still show it.
