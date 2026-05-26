# Quickstart: Sprint 1 — High-Priority Hardening

## 1. Apply Database Migrations
Run the migrations to create constraints:
```bash
npx prisma migrate dev --name sprint1_hardening
```

## 2. Test SMTP Settings UI
1. Navigate to `/admin/settings` as an Admin user.
2. Fill SMTP details, click "Send Test Email".
3. Check status indicators in the dashboard.

## 3. Verify Rate Limiting Configuration
Run rate limit integration checks:
```bash
npx jest apps/api/test/rate-limiting.e2e-spec.ts
```

## 4. Run Batch Reconciliation Job
Execute the reconciliation schedule manually to check O(1) batch-update execution:
```bash
npx jest apps/api/src/modules/ledger/reconciliation.job.spec.ts
```
