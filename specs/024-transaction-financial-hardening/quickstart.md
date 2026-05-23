# Developer Quickstart: Phase 2 Hardening

This guide helps developers run, test, and verify the changes introduced in Phase 2: Transactional & Financial Hardening.

---

## 1. Database Migrations

After pulling the changes, generate and apply the database migrations:

```bash
# Generate the migration
npx prisma migrate dev --name add_document_sequence_and_is_frozen --schema=apps/api/prisma/schema.prisma

# Verify schema state
npx prisma validate --schema=apps/api/prisma/schema.prisma
```

---

## 2. Running Tests

Run the new unit and integration tests specifically written for WAC precision, document numbering, and SKU-level freezing:

```bash
# Run unit tests
npm run test --filter=api -- src/modules/ledger/wac.service.spec.ts
npm run test --filter=api -- src/modules/sequencing/document-sequence.service.spec.ts

# Run integration/E2E tests
npm run test:e2e --filter=api
```

---

## 3. Triggering Reconciliation Manually

A utility endpoint or NestJS command can be used to run the daily reconciliation cron job during testing:

```bash
# Run the reconciliation script or NestJS console command
npm run console -- --cmd=reconcile
```
