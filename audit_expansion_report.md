# Enterprise Full-System Production Readiness: Phase 1 Audit Expansion Report
**System:** LogiRest Kitchen-Store Inventory System  
**Auditors:** Principal Systems Architect, Enterprise ERP Technical Lead, Production Reliability Engineer, and Transactional Systems Auditor  
**Status:** Phase 1 Complete (Audit Expansion & Gap Detection)  
**Date:** 2026-05-23  

---

## 1. EXISTING FINDINGS SUMMARY

A review of the initial production readiness audit (`production_readiness_audit.md`) highlights the following:
*   **Database Schema Drift:** The live InsForge database lacks the `status` (LockStatus) and `isActive` (Boolean) columns in the `warehouse_locks` table, as well as the entire `notification_logs` table. This causes server-side crashes during lock checking, lock creation, and notification logging.
*   **Missing API Endpoints:** The backend lacks implementations for 6 reports requested by the frontend (`reports/available-inventory`, `/reports/movements`, `/reports/expiry`, `/reports/stocktake-variance`, `/reports/procurement-status`, `/reports/currency-summaries`).
*   **Default-On Mock Data:** The frontend default configurations enable local storage API mocking in development, posing a promotion risk if deployed incorrectly.
*   **Audit-Vulnerable Document Numbering:** Document numbers are generated using `Date.now() + Math.random()`, which is non-sequential and non-compliant with standard auditing requirements.
*   **Client-Side Cookie Session Handling:** Auth tokens are exposed to JavaScript via `document.cookie` instead of using secure `HttpOnly` backend cookies.

---

## 2. NEWLY DISCOVERED GAPS (PHASE 1 DEEP OPERATIONAL AUDIT)

Following the audit protocol, we performed a deep operational inspection of the 8 mandatory categories. The newly identified gaps are detailed below:

### 2.1 Runtime Integrity & Reconciliation Audit
*   **No Periodic Reconciliation:** There are no automated processes, cron tasks, or scripts designed to verify stock balance consistency.
*   **Orphan Lot Balances:** No validation ensures that the sum of quantities in `WarehouseItemLot` equals the `qtyOnHand` in `WarehouseItem`.
*   **Ledger Drift Detection:** The system lacks verification to check if the sum of all historical transactions in `StockLedger` matches the current `qtyOnHand` in `WarehouseItem`. If a database record is modified manually, the system will not detect it, creating a high risk of silent inventory drift.
*   **Transfer Balance Reconciliation:** No automated checks reconcile the quantity shipped from a source warehouse against the quantity received at a destination warehouse across all historical transfer lines.

### 2.2 Disaster Recovery & Backup Audit
*   **No Automated Backup Infrastructure:** The codebase contains no backup scripts, cron definitions, or recovery procedures for database snapshots.
*   **Lack of Migration Rollback Safety:** Prisma migrations (`prisma/migrations`) are executed using standard forward-only SQL files. There are no reverse SQL files or procedures to safely roll back tables if a migration fails on the production database.
*   **Point-in-Time Recovery (PITR) Readiness:** No configuration or documentation defines PITR thresholds, leaving the platform vulnerable to data loss during physical infrastructure failures.

### 2.3 Environment & Configuration Audit
*   **Unvalidated Environment Configuration:** NestJS `ConfigModule` loads variables directly without schema validation. If `DATABASE_URL`, `JWT_ACCESS_SECRET`, or `JWT_REFRESH_SECRET` are missing or malformed, the application will startup blindly and crash at runtime during request resolution.
*   **Missing Deployment Templates:** No infrastructure templates (like `.env.production` or `.env.staging`) exist in the repository to outline environment-specific parameters.
*   **Exposed Secret Defaults:** Default development keys are hardcoded in `.env.example` and `apps/api/.env`, presenting security risks if promoted without changes.

### 2.4 Financial Consistency Audit
*   **Critical Cost Basis/WAC Transfer Bug:**  
    In `transfer-post.service.ts` (lines 324–344), when stock is received at a destination warehouse, the system performs an `upsert` on the `WarehouseItem` table:
    ```typescript
    await tx.warehouseItem.upsert({
      where: { warehouseId_itemId: { warehouseId: transfer.toWarehouseId, itemId: item.id } },
      create: {
        warehouseId: transfer.toWarehouseId,
        itemId: item.id,
        qtyOnHand: receivedQty,
        qtyAllocated: 0,
        wac: 0, // <--- CRITICAL BUG: WAC is set to 0 in target warehouse!
      },
      update: {
        qtyOnHand: { increment: receivedQty },
        // Note: WAC is NOT updated in the update branch!
      },
    });
    ```
    *   **Impact:** If Warehouse B receives its first transfer of an item, its cost basis (WAC) is initialized to **0**, erasing the inventory's financial value. If the item record already exists in Warehouse B, the WAC is **left unchanged**, ignoring the cost basis of the incoming units. This leads to inaccurate inventory valuations.
*   **Floating-Point Math Vulnerability:**  
    WAC calculations (`wac.service.ts` lines 47–54) utilize standard JavaScript floating-point numbers (`Number()`). Floating-point arithmetic is prone to rounding errors that compound over high-volume transactions, creating ledger drift. Big decimal arithmetic (e.g., via `decimal.js`) is not used.
*   **Lack of Negative Cost Validation:**  
    The system does not check if cost inputs (such as GRN unit prices or adjustment costs) are negative. Negative values would corrupt WAC calculations and could lead to negative warehouse valuations.
*   **No Cost-Adjustment Ledger Logs for Variances:**  
    When transit losses occur (`receivedQty < shippedQty`), the difference is deducted from the source warehouse but not received at the destination. The system does not write a corresponding cost adjustment or write-off ledger entry to account for the lost inventory value.

### 2.5 Async Reliability & Outbox Audit
*   **No Transactional Outbox:**  
    Notifications are created directly in the database (`tx.notificationLog.create`) within the main database transaction. If third-party integrations (like SMTP email dispatch, SMS, or Push notifications) are added to the transaction flow, they will block database threads, increase latency, and cause status transitions to fail if the third-party API is slow or offline.
*   **No Messaging Queue:**  
    The system lacks a message broker or queue manager (such as BullMQ, RabbitMQ, or Redis) to handle background retries, rate limits, or dead-letter queues.

### 2.6 Operational Metrics & Observability Audit
*   **Useless Health Endpoint:**  
    The `/health` endpoint in `health.controller.ts` simply returns `{ status: 'OK' }` without checking database connectivity, memory usage, or queue backlogs. If the PostgreSQL database crashes, the health check will continue to return `200 OK`, preventing load balancers or orchestrators from detecting the failure.
*   **Missing Performance Telemetry:**  
    The application lacks APM integrations (like OpenTelemetry or Prometheus) to track transaction durations, connection pool usage, lock wait times, or rollback counts.
*   **No Request/Transaction Correlation:**  
    API logs lack correlation IDs (trace IDs), making it difficult to trace a request through controllers, guards, services, and database queries.

### 2.7 Incident Investigation Audit
*   **Limited Audit Log Search:**  
    The `AuditLogsController` only permits filtering by `userId` and simple pagination. Operators cannot filter audit logs by target table, target record ID, action type, date range, or IP address, which hampers security and operational investigations.
*   **No Dispute Resolution Interface:**  
    There is no dashboard to view and track discrepancies in transfers or cost ledgers over time.

### 2.8 Deployment & Runtime Readiness Audit
*   **No Containerization Config:**  
    The repository lacks a `Dockerfile` or `docker-compose.yml`, which increases deployment complexity and the risk of environment drift.
*   **Incomplete CI/CD Pipeline:**  
    The `frontend-ci.yml` workflow runs checks only on frontend code (`apps/web`). There is **no CI pipeline for the backend NestJS service**, meaning backend tests and type checks are never executed automatically on pull requests.
*   **No Database Connectivity Checks on Startup:**  
    The backend starts up blindly without validating database connectivity or checking for unapplied migrations, which can lead to runtime crashes.

---

## 3. MISSING OPERATIONAL SAFEGUARDS
1.  **Startup Dependency Check:** A validation hook on application bootstrap to ping the database and verify schema migrations.
2.  **Out-of-Sync Alarms:** Automated alarms that trigger when a reconciliation job detects a drift between the stock ledger history, lot tables, and warehouse item summaries.
3.  **Active Lock Indicators:** Proactive logging and alert indicators to notify administrators of locks that have been `STALE` for over 24 hours.

---

## 4. HIDDEN PRODUCTION RISKS
1.  **Silent Connection Pool Starvation:** In high-concurrency environments, nested transactions (`tx.$transaction`) with a 20-second timeout could exhaust the database connection pool (which is limited to 3 connections in the `.env` configuration: `connection_limit=3`). This would cause incoming API requests to hang and eventually time out.
2.  **Unprotected Negative Valuations:** A negative value input on adjustments or GRNs could reduce a warehouse item's WAC to negative values, causing inventory reports to show negative asset values.

---

## 5. RUNTIME INTEGRITY WEAKNESSES
*   **Ledger Independence:** The system lacks validation to ensure `StockLedger` and `CostLedger` balances align with active `WarehouseItem` records. The ledgers operate independently without reconciliation.
*   **Manual Override Exposure:** Direct manual changes to SQL database records will go undetected, potentially causing inventory discrepancies that are difficult to reconcile.

---

## 6. DEPLOYMENT RISKS
*   **No Infrastructure-as-Code (IaC):** Deployments rely on manual commands, increasing the risk of configuration errors.
*   **Missing Backend CI Validation:** Unchecked backend code changes could be merged directly into the `main` branch, potentially introducing bugs or compilation failures that go unnoticed until deployment.

---

## 7. SCALABILITY RISKS
*   **Database Connection Limit:** The connection limit is hardcoded to 3 in the `.env` URL (`connection_limit=3`). Under production load, this will cause bottlenecking and connection timeouts.
*   **Lack of Pagination on Reports:** Frontend reports load entire datasets in a single API call, which can lead to memory pressure and browser performance degradation as data grows.
*   **Virtualization Absence:** The UI's `<DataTable>` renders all records directly into the DOM, which can cause DOM lagging on mobile tablets or POS terminal screens during high-item stocktakes or large GRNs.

---

## 8. FINANCIAL CONSISTENCY RISKS
*   **Cost Evaporation in Transfers:** The transfer receive logic sets WAC to 0 for new warehouse item records and leaves it unchanged for existing ones, which can distort inventory valuation.
*   **Decimal Precision Issues:** Floating-point math is used for decimal quantities and financial unit prices, which can introduce rounding errors.

---

## 9. OBSERVABILITY GAPS
*   **Opaque Database Transactions:** Slow query logs, database locks, and rollback details are not logged or tracked, leaving operators with no visibility during transaction blockages.
*   **Lack of Traceability:** API request errors are logged without a trace ID, making it difficult to link errors to specific user sessions or API payloads.

---

## 10. DISASTER RECOVERY GAPS
*   **No Point-in-Time Recovery:** If a hardware failure occurs on the database server, restoring data will depend on the last manual backup, which could result in data loss.
*   **No Migration Rollback Strategy:** If a migration fails during deployment, the database will be left in an inconsistent state without an automated rollback procedure.

---

## 11. MISSING AUTOMATION
*   **Periodic Stale Session Cleanup:** Stale user sessions and expired refresh tokens are not cleaned up automatically, which can lead to table bloat over time.
*   **Active Lock Alerts:** No system automatically alerts warehouse managers of active locks that block warehouse operations.

---

## 12. FINAL EXPANDED RISK MATRIX

We have compiled a comprehensive list of all production risks, categorized by severity:

| ID | Category | Severity | Target File / Component | Operational Impact |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | Database | **CRITICAL** | `prisma/schema.prisma` | **Schema Drift on Locks:** Live DB misses `status` and `isActive` columns. Mutating requests crash with `P2022` errors. |
| **R-02** | Database | **CRITICAL** | `prisma/schema.prisma` | **Schema Drift on Notifications:** `notification_logs` table does not exist. All notification logging fails. |
| **R-03** | Backend | **CRITICAL** | `apps/api/src/modules/reports` | **Missing Endpoints:** Report hooks return 404 errors. Reports Hub is completely broken. |
| **R-04** | Finance | **CRITICAL** | `apps/api/src/.../transfer-post.service.ts` | **Cost Evaporation:** Transfer receive upsert sets WAC to 0 or ignores incoming unit costs, distorting valuations. |
| **R-05** | Security | **HIGH** | `apps/web/src/lib/api/cookies.ts` | **Session Storage Vulnerability:** Auth tokens are stored in JavaScript-accessible cookies, exposing them to XSS attacks. |
| **R-06** | Audit | **HIGH** | `apps/api/src/.../purchase-requests.service.ts` | **Random Numbering:** Uses `Date.now() + Math.random()` for document numbering, which is non-compliant with auditing standards. |
| **R-07** | DevOps | **HIGH** | `.github/workflows` | **Missing Backend CI:** NestJS backend tests are not executed automatically on PRs or merges. |
| **R-08** | Ops | **HIGH** | `apps/api/src/health/health.controller.ts` | **Useless Health Endpoint:** Returns `200 OK` even if database connection is lost, blocking container orchestration recovery. |
| **R-09** | Configuration | **HIGH** | `apps/api/src/app.module.ts` | **Unvalidated Config:** Startup continues even if required environment variables are missing or invalid, causing crashes. |
| **R-10** | Finance | **HIGH** | `apps/api/src/.../wac.service.ts` | **Decimal Precision Risk:** Uses JS floating-point arithmetic for WAC calculations, exposing the ledger to rounding errors. |
| **R-11** | Reliability | **MEDIUM** | `apps/api/src/.../notification.service.ts` | **Synchronous Notification Dispatch:** Blocks database transactions during external integrations and increases latency. |
| **R-12** | Ops | **MEDIUM** | `apps/api/src/modules/admin/audit-logs.controller.ts`| **Limited Logs Search:** Audit logs cannot be filtered by action type, target ID, date range, or table name, hindering audits. |
| **R-13** | Scalability | **MEDIUM** | `apps/web/src/components/shared/DataTable/DataTable` | **Virtualization Absence:** Rendering large inventories (500+ items) in a stocktake or GRN will lag client devices. |
| **R-14** | DevOps | **MEDIUM** | Root directory | **No Containerization:** Repository lacks a `Dockerfile` or `docker-compose.yml`, which increases deployment complexity. |
| **R-15** | Automation | **MEDIUM** | `apps/api/src/jobs/lock-cleanup.job.ts` | **Missing Reconciliation:** No automated checks reconcile lot and ledger balances to detect drift. |
