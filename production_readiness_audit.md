# Enterprise Full-System Production Readiness Audit Report
**System:** LogiRest Kitchen-Store Inventory System  
**Auditors:** Principal Software Architect, Enterprise Systems Auditor, Database Reliability Engineer, and ERP Operations Consultant  
**Date:** 2026-05-23  

---

## 1. SYSTEM READINESS OVERVIEW

*   **Operational Maturity Level:** **MEDIUM-LOW**  
    While the system features highly disciplined transaction boundaries, row-level locking (`SELECT FOR UPDATE`), and clean separation of concerns, it suffers from critical operational gaps. The most severe issues are **live database schema drift** (which completely breaks the warehouse lock/unlock flow) and **unimplemented reporting endpoints** on the NestJS backend that cause the frontend Reports hub to fail.
*   **Architecture Quality:** **HIGH**  
    The codebase is structured as a clean Monorepo (`apps/api` for NestJS, `apps/web` for Next.js, and `packages/shared-types` for shared Zod schemas). The frontend utilizes a Feature-Sliced Design (FSD) approach, and the backend isolates services cleanly. The AST dependency mapping (via Graphify) is well-defined.
*   **Deployment Readiness:** **LOW**  
    The application cannot be safely deployed in its current state. Attempting to run operations like stocktaking, adjustments, or GRN posts will cause server-side crashes due to missing database columns and tables. Additionally, there is no automated database migration pipeline for deployment.
*   **Production Confidence Level:** **LOW-MEDIUM**  
    We have 100% confidence in the *logical correctness* of the stock allocation, WAC calculation, and lock services (which have excellent test coverage of 216 passing tests). However, operational confidence is low due to schema drift, the lack of real SMTP/email integrations, random document numbering instead of sequential auditing, and the default-on mock api adapter on the frontend.

---

## 2. FRONTEND AUDIT REPORT

*   **Screens & Operational UX:**  
    The frontend core screens (Purchase Requests, Purchase Orders, GRNs, Issues, Transfers, Adjustments, Stocktakes, and Kitchen Requests) are well-organized. Key features include the `useAlwaysFocused` hook to capture wedge scanner inputs cleanly and the `FEFOLotAllocator` dialog. Alternating row colors (`bg-surface/50`) satisfy the "no-line" clean styling guideline.
*   **Reports & Exports:**  
    The frontend has a Reports Hub (`ReportsHubClient.tsx`) linking to Available Inventory, Movements, Expiry, Stocktake Variance, Procurement Status, and Currency Summaries. It implements client-side CSV, Excel (using SheetJS `xlsx`), and PDF (using `jsPdf` + `jspdf-autotable`) export utilities via `ReportExportMenu.tsx`.
*   **Missing UI Functionality:**  
    The frontend reports hub successfully triggers downloads, but the underlying API hooks in `useReports.ts` fetch from `/reports/...` backend routes that return 404 errors because the NestJS controllers for these reports do not exist.
*   **Mobile Responsiveness & RTL/LTR:**  
    Logical properties (e.g., `ps-`, `me-`, `text-start`) are used correctly. Direction is controlled at the root `<html>` tag based on the active locale (`ar` for RTL, `en` for LTR). The `globals.css` file uses standard typography variables.
*   **Accessibility & Virtualization:**  
    The custom `<DataTable>` wraps TanStack table components but does not utilize virtual scrolling. Processing high-item stocktakes or large GRNs (500+ items) will cause substantial DOM lagging on mobile tablets or POS terminal screens.

---

## 3. BACKEND AUDIT REPORT

*   **Modules & Services:**  
    The NestJS backend has modules for `admin`, `inventory`, `kitchen-requests`, `ledger`, `master-data`, `notifications`, `operations`, `purchase-requests`, `purchasing`, `reports`, `stocktake`, `warehouse-lock`, and `workflow`.
*   **Guards & Interceptors:**  
    `ScopeInterceptor` correctly intercepts requests to enforce branch/warehouse isolation by validating the `x-warehouse-id` and `x-branch-id` headers. `IdempotencyGuard` checks `X-Idempotency-Key` and uses `IdempotencyLog` to prevent duplicate submissions. `WarehouseLockGuard` intercepts all mutating methods (POST, PUT, PATCH) to ensure the target warehouse is not undergoing stocktake.
*   **Background Jobs:**  
    `LockCleanupJob` runs every 60 seconds to scan for expired locks. It marks locks as `STALE` in the database, but leaves `isActive = true` to preserve the mutating block until an administrator manually unlocks it.
*   **Operational Correctness & Concurrency:**  
    Excellent transactional design. Row-level locks are obtained deterministically using sorted IDs (in `LedgerLockService.lockLots`) to prevent database deadlocks. However, the background lock status sweeper will fail on database execution because the columns it updates are missing on the live PostgreSQL server.

---

## 4. DATABASE AUDIT REPORT

*   **Schema Quality & Indexing:**  
    The Prisma schema (`schema.prisma`) is well-designed. Database indexes are optimized for operational patterns:
    *   `lots_itemId_expiryDate_idx` is defined on `lots` to support FEFO sorting.
    *   `stock_ledger_warehouseId_itemId_postedAt_idx` supports movements history pagination.
    *   `cost_ledger_warehouseId_itemId_postedAt_idx` supports efficient WAC scans.
*   **Live Database Drift (CRITICAL FINDING):**  
    There is a severe drift between the live PostgreSQL schema and the Prisma migrations:
    1.  **Missing columns in `warehouse_locks`:** The live table contains only `id`, `warehouseId`, `lockType`, `lockedById`, `expiresAt`, and `createdAt`. The columns **`status`** (LockStatus) and **`isActive`** (Boolean), along with the index on `[isActive, expiresAt]`, are completely missing.
    2.  **Missing table `notification_logs`:** The database has no record of the `notification_logs` table (mapping to the `NotificationLog` model).
    *   **Root Cause:** These models/fields were added in `schema.prisma` during subsequent phases, but no SQL migrations were generated (the `prisma/migrations` folder contains only `0001_init`) or applied to the live InsForge PostgreSQL database.
*   **Scalability & locking correctness:**  
    Row-level locking is correct but currently unusable due to the missing `isActive` column required by the lock check queries.

---

## 5. WORKFLOW AUDIT REPORT

*   **Completeness:**  
    All core documents utilize the central state machine inside the backend's `workflow.service.ts` (`executeTransition`), which calls the shared Zod status-transition helper `getNextStatusV2`.
*   **Approval Safety:**  
    `ApprovalEvent` records are written for every status transition, creating a clear audit trail.
*   **Rollback Safety:**  
    Status transitions and ledger mutations run within nested database transactions (`tx.$transaction`), ensuring complete rollbacks on failure.
*   **Orphan Transitions:**  
    No orphan transitions are present. However, the system lacks automated notifications/alerts when a document is rejected or stuck in `PENDING_APPROVAL` status.

---

## 6. REPORTING & EXPORT AUDIT

*   **Export Support:**  
    Client-side exports (PDF, CSV, Excel) are fully supported.
*   **Formatting Quality:**  
    The reports render neatly, but do not contain company headers, branch names, generation timestamps, or the name of the user who generated them. 
*   **Branding & Enterprise Readiness:**  
    **FAIL.** The report layouts are generic. Restaurant logos, branch details, tax IDs, and official headers required for corporate compliance are missing.
*   **Missing Information:**  
    The reports hub in the UI is a facade. None of the detailed report pages fetch live database data; they trigger 404 API errors because the `/reports/available-inventory`, `/reports/movements`, `/reports/expiry`, `/reports/stocktake-variance`, and `/reports/procurement-status` endpoints do not exist on the NestJS backend.

---

## 7. DOCUMENT NUMBERING AUDIT

*   **Automatic Numbering:**  
    Document numbers are generated automatically on the backend during creation.
*   **Uniqueness & Collision Safety:**  
    Uniqueness is enforced at the database level by unique constraints (e.g., `requestNumber String @unique`).
*   **Format Integrity Check:**  
    **FAIL.** Document numbers are generated using the following pattern:  
    `const requestNumber = 'PR-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);`  
    This approach yields values like `PR-1716480112345-4819`. This is not enterprise-grade:
    *   It is not sequential (auditors cannot easily identify missing documents).
    *   It is not branch-aware.
    *   It exposes internal timestamps in an unreadable format.
    *   It is vulnerable to collision under highly concurrent threads, despite the random suffix.

---

## 8. EMAIL & AUTOMATION AUDIT

*   **Notification Coverage:**  
    The backend writes events (`PR_SUBMITTED`, `PR_APPROVED`, `TRANSFER_IN_TRANSIT`) into the `NotificationLog` table.
*   **SMTP & Provider Configuration:**  
    **MISSING.** There is no SMTP provider module, nodemailer integration, or third-party mailing service (like SendGrid or SES) configured in NestJS.
*   **Template Support:**  
    There is no HTML/text email template engine for multi-language alerts.
*   **Operational Alerts:**  
    Critical events like low-stock alerts, transfer arrival delays, and item expiry warnings are frontend-only calculations and are not processed or emailed asynchronously on the backend.

---

## 9. MOCK DATA AUDIT

*   **Mock APIs & Adaptors:**  
    The frontend `client.ts` uses an automated mock interceptor:
    `const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true' || (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'false');`  
    If `NEXT_PUBLIC_USE_MOCKS` is not explicitly set to `false`, the app defaults to mocking in development.
*   **Fake Inventory & Hardcoded Data:**  
    The frontend runs `seedDatabase` upon startup in the browser, storing dozens of static records in `localStorage` under keys like `mock_items`, `mock_warehouses`, and `mock_lots`.
*   **Production Risk:**  
    If a developer deploys the frontend without setting `NEXT_PUBLIC_USE_MOCKS=false`, the client application will run entirely offline on local mock storage without warning the operator.

---

## 10. INVENTORY SAFETY REPORT

*   **Ledger Immutability:**  
    All posts write to `StockLedger` and `CostLedger`. These tables have no update or delete endpoints, ensuring ledger immutability.
*   **FEFO Correctness:**  
    `AllocationService.allocate` sorts lots by `expiryDate ASC` and `receivedDate ASC` for items with expiry dates, matching FEFO rules. Non-expiry items use `receivedDate ASC` (FIFO).
*   **Lock Enforcement:**  
    Locked warehouses restrict mutations through the `WarehouseLockGuard`. However, because the database lacks the `isActive` column, this guard cannot perform database queries and crashes during execution.
*   **Negative Stock Prevention:**  
    `AllocationService` throws an exception if available lot inventory is less than the requested amount. Unbatched items are protected via `lockService.assertItemBalance`.

---

## 11. SECURITY REPORT

*   **Auth Quality:**  
    Authentication uses JWT access tokens and refresh tokens.
*   **Cookie Security:**  
    Tokens are stored in client-accessible cookies (`document.cookie`), leaving them vulnerable to XSS. They should instead be served as `HttpOnly`, `Secure` cookies by the backend.
*   **RBAC Quality:**  
    The backend uses `RolesGuard` and the frontend checks `PERMISSION_MATRIX` and `ROLE_CAPABILITIES`. This ensures consistent authorization scopes.
*   **Scope Isolation:**  
    `ScopeInterceptor` prevents IDOR vulnerabilities by validating warehouse headers.

---

## 12. PERFORMANCE REPORT

*   **Transaction Efficiency:**  
    Transactions are scoped tightly. WAC recalculations and allocations are processed in single transactions, keeping lock duration minimal.
*   **Lock Contention:**  
    `SELECT FOR UPDATE` is applied selectively, which minimizes lock contention.
*   **Missing Indexes:**  
    No indexes are missing except those affected by the schema drift (such as `warehouse_locks_isActive_expiresAt_idx` on the missing `isActive` column).

---

## 13. OBSERVABILITY REPORT

*   **Structured Logging:**  
    The backend uses NestJS `Logger`. However, it does not log request payloads, query durations, or database locks.
*   **Error Tracking:**  
    There is no error tracking (e.g. Sentry) or alerting mechanism.
*   **Audit Trails:**  
    Manual unlocks and document transitions write states into `AuditLog`.

---

## 14. TESTING & RELIABILITY REPORT

*   **Test Coverage:**  
    Outstanding test coverage on both sides.
    *   **Backend:** 36 test suites, 216 tests passed.
    *   **Frontend:** 6 test files, 48 tests passed.
*   **Rollback Testing:**  
    Prisma transaction failures are tested, and rollback functionality is validated in integration tests.
*   **Operational Simulations:**  
    Concurrency tests are included in the test suites, verifying that optimistic lock checks (`version` updates) prevent race conditions.

---

## 15. PRODUCTION BLOCKERS

We have classified the production blockers into priority tiers:

### 🔴 CRITICAL BLOCKERS (Must fix to prevent crash/data corruption)
1.  **Database Drift - Missing Lock Columns:** The `isActive` and `status` columns are missing from the `warehouse_locks` table in the database. Any mutating request will crash the API.
2.  **Database Drift - Missing Notifications Table:** The `notification_logs` table does not exist in the PostgreSQL instance, crashing the notification logger during workflow transitions.
3.  **Missing Reporting Endpoints:** The backend lacks implementations for `/reports/available-inventory`, `/reports/movements`, `/reports/expiry`, `/reports/stocktake-variance`, `/reports/procurement-status`, and `/reports/currency-summaries`. The frontend Reports Hub will display 404 errors for all report pages.

### 🟡 HIGH BLOCKERS (Critical operational/compliance weaknesses)
4.  **Client-Side Cookie Session Handling:** Auth tokens are stored in standard cookies accessible to client-side scripts, creating an XSS security risk.
5.  **Random Document Numbering:** Document numbers are generated using `Date.now() + Math.random()`, resulting in unreadable values like `PR-1716480112345-4819` that break audit trail guidelines.
6.  **Mock Interceptor Default-On:** The frontend defaults to mock APIs in development if `NEXT_PUBLIC_USE_MOCKS` is omitted. This poses a risk of deploying mock data behavior to production.

### 🟢 MEDIUM BLOCKERS (Operational limitations)
7.  **No SMTP/Email sending service:** The notification engine writes to a database log but cannot send email notifications or alerts.
8.  **No Virtualization on Tables:** Rendering large inventories (500+ items) in a stocktake or GRN will lag client devices.

---

## 16. PRIORITIZED IMPROVEMENT ROADMAP

### Phase 1: Critical (Pre-release)
1.  Generate and apply a Prisma migration to resolve database drifts (adding `status` and `isActive` columns/indexes to `warehouse_locks` and creating `notification_logs`).
2.  Implement the missing `/reports` endpoints in the NestJS `ReportsController`.
3.  Refactor document numbering to a sequential, branch-aware generator (e.g. `PR-YYYY-BRANCH-0001`).

### Phase 2: High (Post-release stabilization)
4.  Refactor JWT delivery to use `HttpOnly`, `Secure`, `SameSite=Strict` cookies.
5.  Disable mock API fallbacks on the frontend by default, forcing explicit opt-in via environment variables.

### Phase 3: Medium (Feature enhancements)
6.  Integrate a NestJS mailer module (e.g., nodemailer with AWS SES or SendGrid) to send notification alerts.
7.  Add virtual scrolling (`@tanstack/react-virtual`) to the `<DataTable>` component to improve performance on large datasets.

---

## 17. FINAL GO-LIVE ASSESSMENT

*   **Go-Live Readiness Score:** **45 / 100**  
*   **Operational Risk Score:** **80 / 100** (Very High Risk)  
*   **Inventory Safety Confidence:** **90%** (Logical correctness is high, but blocked by database schema issues)  

### Recommendation
**❌ NOT READY FOR PRODUCTION**

**Reasoning:**  
The system's business logic, transaction locking, and FEFO sorting mechanisms are designed correctly and tested thoroughly. However, the application **cannot run in a live environment** because of database schema drift. The missing columns and tables cause database updates to fail, and the reporting endpoints are completely unimplemented on the backend. 

Applying the missing schema changes and implementing the report endpoints will allow the application to meet the requirements for a production release.
