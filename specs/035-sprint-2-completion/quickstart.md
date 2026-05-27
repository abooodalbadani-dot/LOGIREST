# Developer Quickstart Guide: Sprint 2 Completion

This document guides developers on starting, compiling, and testing the Sprint 2 Completion features.

---

## 1. Setup & Environment

Ensure you are inside the repository workspace:
```bash
# Verify you are on the feature branch
git branch
# Output should show: 035-sprint-2-completion
```

### Apply Database Migrations
Run the Prisma migrations to apply the composite uniqueness constraint on sequence numbering:
```bash
# Run migration dev command
npx prisma migrate dev --name add_document_sequence_unique_constraint
```

---

## 2. Running the Applications

### Start the NestJS API Backend
To run the API server locally in development mode:
```bash
npm run dev --filter=api
```
The API is available at `http://localhost:3000`.

### Start the Next.js Frontend
To run the Next.js web application locally in development mode:
```bash
npm run dev --filter=web
```
The web application is available at `http://localhost:3001`.

---

## 3. Running Verification & Tests

### Execute Void Service Unit Tests
Run the five newly created void unit spec files under the operations module:
```bash
# Run operations void tests
npm run test --filter=api -- grn-void.service.spec.ts
npm run test --filter=api -- issue-void.service.spec.ts
npm run test --filter=api -- adjustment-void.service.spec.ts
npm run test --filter=api -- transfer-void.service.spec.ts
npm run test --filter=api -- kitchen-request-void.service.spec.ts
```

### Run Expiry Worker and Settings Controller Tests
```bash
# Test the OutboxWorker EXPIRY_WARNING handler
npm run test --filter=api -- outbox.worker.spec.ts

# Test the settings controller validation
npm run test --filter=api -- admin.controller.spec.ts
```

### Lint and Typecheck Validation
Before submitting any commits, execute the monorepo validation suite:
```bash
# Typecheck Next.js web application
npm run typecheck --filter=web

# Compile NestJS API backend
npm run build --filter=api
```
Verify that there are zero compilation or typecheck errors across both packages.
