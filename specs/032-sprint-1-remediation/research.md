# Research: Sprint 1 — High-Priority Hardening

## 1. Document Sequence Uniqueness (TASK-008)
* **Decision**: Add a composite unique constraint at the database layer.
* **Rationale**: The database layer is the absolute source of truth. Composite unique key `(document_type, year, branch_id)` prevents race conditions from producing duplicate numbers.
* **Implementation**: We will create a Prisma migration with:
  ```sql
  ALTER TABLE "document_sequences"
    ADD CONSTRAINT "uq_document_sequences_type_year_branch"
    UNIQUE ("document_type", "year", "branch_id");
  ```

## 2. SMTP Config Settings & Test UI (TASK-009)
* **Decision**: Wire Next.js client inputs to `GET /admin/settings` and `PUT /admin/settings`, and bind "Send Test Email" to `POST /admin/settings/test-email`.
* **Rationale**: The backend endpoints already encrypt/decrypt passwords correctly via `crypto.util.ts`. Test endpoint `testEmail()` exists in `AdminController`.
* **Details**: Mask existing passwords by returning `'********'` from settings queries. If user sends `'********'`, retrieve the previously encrypted password from database value rather than overwriting it with asterisks.

## 3. Adjustment IN Zero-Cost Prevention (TASK-010)
* **Decision**: Block Adjustment IN postings with `unitCost <= 0` at both controller validation and database transaction level.
* **Rationale**: Stock additions must have a cost layer to avoid dividing by zero or setting WAC to zero.
* **Implementation**: Throw a `BadRequestException` if `line.type === 'IN'` and `line.unitCost` is absent/zero.

## 4. Rate Limiting Custom Configurations (TASK-011)
* **Decision**: Implement per-endpoint overrides on top of NestJS `ThrottlerGuard` to prevent throttling barcode scanners.
* **Rationale**: Barcode scanners trigger rapid sequential request bursts. Raising global limit to 100 req/minute while narrowing auth endpoints (Login/Refresh) to 5 req/minute shields the app while keeping operations smooth.

## 5. CsrfGuard Global Verification (TASK-012)
* **Decision**: Register `CsrfGuard` globally as `APP_GUARD` in `app.module.ts` and configure `api-client.ts` client to parse standard XSRF cookies and send them via `X-XSRF-TOKEN` headers.
* **Rationale**: Protects mutating API actions from cross-site request forgery attacks.

## 6. Reports Hub Additions (TASK-013)
* **Decision**: Add cards to the dashboard hub and create two dedicated reports pages: `/reports/wac-history` and `/reports/lot-trace`.
* **Rationale**: The backend endpoints exist but are currently orphaned from UI navigation. Hyperlinking document cells to details views completes the loop.

## 7. Reconciliation N+1 Query Batching (TASK-014)
* **Decision**: Refactor the discrepancy loop to accumulate IDs and perform a single `updateMany` database transaction call instead of O(N) database queries.
* **Rationale**: Reduces lock contention and database CPU spikes when freezing discrepant warehouse items.

## 8. Excel Streaming & Payload Guards (TASK-015)
* **Decision**: Stream workbook creation chunk-by-chunk using `exceljs` cursor queries instead of loading all movements to memory. Cap max rows to 50,000 to prevent OOM errors.
* **Rationale**: Streaming avoids memory spikes and makes report exporting scalable.
