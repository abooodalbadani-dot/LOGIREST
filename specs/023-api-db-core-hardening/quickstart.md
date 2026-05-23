# Quickstart Guide: Database & API Core Hardening (Phase 1)

This guide helps you set up and verify the changes implemented in Phase 1.

## 1. Apply Schema Migrations
Run the delta migration on your PostgreSQL instance to align schemas:
```bash
npx prisma migrate dev --name drift_delta_hardening --schema=apps/api/prisma/schema.prisma
```

## 2. Configuration Validation Setup
Ensure all mandatory environment variables are present in your active `.env` file under `apps/api/.env`.
You can copy `.env.example` as a starting point.

To test validation crashes:
1. Temporarily comment out `JWT_ACCESS_SECRET` in `apps/api/.env`.
2. Start the API:
   ```bash
   npm run dev --filter=api
   ```
3. Assert that the server process crashes immediately with a structured FATAL log detailing the missing config parameters.

## 3. Run Automated Tests

To run typechecking:
```bash
npm run typecheck --filter=api
```

To run lint check:
```bash
npm run lint --filter=api
```

To run reports controller tests:
```bash
npx jest apps/api/src/modules/reports
```
