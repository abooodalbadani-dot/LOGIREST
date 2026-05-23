# Research Notes: Database & API Core Hardening (Phase 1)

This document outlines the findings and decisions for Phase 1 of the Production Hardening roadmap.

## 1. Database Schema Drift Verification

### Findings
Prisma tracks migrations inside the PostgreSQL database in a default metadata table named `_prisma_migrations`.
The table structure contains the following columns:
- `id` (Primary Key, UUID/string format matching folder names, e.g., `20260523200000_init`)
- `checksum` (SHA-256 hash of the migration)
- `finished_at` (Timestamp when the migration finished running)
- `migration_name` (Name of the migration file)
- `applied_steps_count` (Number of steps applied; > 0 represents a complete migration)

### Decision & Rationale
We will run a startup validation check directly inside NestJS (`PrismaService.onModuleInit()`) after the Prisma Client establishes connection:
1. Fetch all migration folders in the project's local migration directory `apps/api/prisma/migrations/`.
2. Query the database: `SELECT migration_name FROM _prisma_migrations WHERE applied_steps_count > 0;`.
3. Compare the local folders list to the database results.
4. If there are migration folders locally that are not present in the `_prisma_migrations` table, throw a fatal error: `Error: Database is out of sync. Unapplied migrations detected.` and exit the process.

This strict verification runs across **ALL** environments (including development, test, and production), enforcing database sync and preventing silent drifts immediately.

---

## 2. Startup Environment Variables Validation

### Findings
Standard NestJS environment variables can be loaded using `@nestjs/config`. By default, NestJS doesn't enforce schema constraints at boot, leading to runtime failures under load if configs are missing.

### Decision & Rationale
We will define a strict validation schema using Zod in `apps/api/src/config/env.validation.ts` and pass the `validate` function to `ConfigModule.forRoot({ validate })`.
If Zod validation fails, we will construct a structured JSON log entry containing:
- Failure timestamp.
- Log level: `FATAL`.
- Context: `ConfigModule`.
- A clean array of missing/invalid field keys and their issues (excluding the actual config values to prevent credentials leaks).
We then call `process.exit(1)` immediately. This signals a boot crash to container orchestrators like Kubernetes or Docker without exposing credentials in exceptions.

---

## 3. Reports API Architecture & Security

### Findings
The Reports hub requires secure endpoints that avoid IDOR (Insecure Direct Object Reference) vulnerabilities.

### Decision & Rationale
The reporting routes inside `ReportsController` will use the `@ActiveScope('warehouseId')` decorator to load the warehouse context securely from the request credentials (supplied via `ScopeInterceptor`), completely ignoring any client-provided `warehouseId` query parameters.

For the `movements` report, we support:
- Standard offset pagination using `page` and `limit` query parameters (default limit is 50).
- Filtering by `itemId`, `startDate`, `endDate`, and `transactionType` (matching `documentType`).
- Output format: `{ total: number, page: number, limit: number, data: StockLedger[] }`.
