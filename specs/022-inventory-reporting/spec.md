# Feature Specification: Inventory Query, Reporting, & Administrative Jobs

**Feature Branch**: `022-inventory-reporting`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "Phase 9: Inventory Query & Reporting, Lock Expiry Background Job, Notification Dispatch"

## Clarifications

### Session 2026-05-23

- Q: Stale Lock Representation in DB → A: Explicitly update a status field/flag on the WarehouseLock record using a background job.
- Q: In-App Notification Marking as Read → A: Support both individual mark-read (PATCH /notifications/:id/read) and bulk mark-all-read (POST /notifications/read-all) endpoints.
- Q: Data Export Support (CSV/Excel) → A: Out-of-scope for the backend API; standard JSON is returned, and any file generation/downloads are handled client-side by the frontend.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inventory Balance, Lot & Movement Queries (Priority: P1)

As a Warehouse Keeper or Warehouse Manager, I want to view my warehouse's current stock levels, lot details, and history of stock movements.

**Why this priority**: It is the core operational capability that allows users to see stock status.

**Independent Test**: Can be verified by calling `/inventory/balance` and `/inventory/lots` after seeding stock, checking that only authorized warehouse items are visible.

**Acceptance Scenarios**:

1. **Given** a Warehouse Keeper authorized for Warehouse A, **When** they request `/inventory/balance`, **Then** they receive a list of items and on-hand quantities for Warehouse A only.
2. **Given** a Warehouse Keeper authorized for Warehouse A, **When** they request `/inventory/balance` with `x-warehouse-id` for Warehouse B, **Then** the request is rejected with `403 Forbidden`.
3. **Given** posted inventory transactions (GRN, Issue), **When** a user requests `/inventory/movements`, **Then** they receive a paginated, read-only list of corresponding `StockLedger` entries.

---

### User Story 2 - Warehouse Lock Management & Expiry (Priority: P2)

As an Administrator or Warehouse Manager, I want stale warehouse locks to require manual deactivation so that operations can safely resume after a stalled stocktake.

**Why this priority**: Blocks on inventory updates must be cleared safely.

**Independent Test**: Simulate an expired lock and attempt a GRN post; ensure it is still blocked, then verify that an Admin calling the unlock endpoint deactivates the lock and allows the post.

**Acceptance Scenarios**:

1. **Given** a `WarehouseLock` that has passed its `expiresAt` timestamp, **When** the background job runs, **Then** the lock's `status` is explicitly set to `STALE` in the database, while keeping `isActive = true` to continue blocking write operations.
2. **Given** a STALE warehouse lock, **When** a Warehouse Keeper attempts a stock mutation, **Then** they receive a `423 Locked` response.
3. **Given** a STALE warehouse lock, **When** an Admin or Manager calls the unlock endpoint, **Then** the lock is deactivated and writes are permitted.

---

### User Story 3 - Role-Based Workflow Notifications (Priority: P3)

As a system user (Approver, Procurement Officer, or Warehouse Keeper), I want to receive in-app notification alerts for workflow events relevant to my role.

**Why this priority**: Drives workflow efficiency by alerting users to action items.

**Independent Test**: Trigger a document state change and check that a corresponding entry is added to the `NotificationLog` table for the correct role.

**Acceptance Scenarios**:

1. **Given** a PR is submitted, **When** the workflow state changes, **Then** a `NotificationLog` entry is created targeting the `APPROVER` role.
2. **Given** a PR is approved, **When** the state transitions, **Then** a `NotificationLog` entry is created targeting the `PROC_OFFICER` role.
3. **Given** a Transfer is shipped, **When** the state changes, **Then** a `NotificationLog` is created targeting the destination `WH_KEEPER` role.
4. **Given** unread notifications, **When** the user requests `PATCH /notifications/:id/read` or `POST /notifications/read-all`, **Then** those notifications are marked as read in the database and omitted from default unread queries.

---

### User Story 4 - Optimized Barcode Scan API (Priority: P2)

As a Warehouse Keeper in scan mode, I want a single fast barcode lookup that returns all item information, conversion factors, and lots.

**Why this priority**: Required for smooth scanner integration without slow loading times.

**Independent Test**: Query `/items/scan?barcode=X` and verify that the response returns the item details, UoM conversion, and active lot listings in a single transaction.

**Acceptance Scenarios**:

1. **Given** a registered barcode mapping, **When** a barcode is scanned, **Then** the API returns the mapped item details, default UoM conversion factor, and list of active lot records.
2. **Given** an unregistered barcode, **When** queried, **Then** the API returns `404 Not Found`.

---

### Edge Cases

- **Lock deactivation race**: What happens if an Admin manually unlocks a warehouse while a keeper is in the middle of counting? The system should warn the user, but allow the unlock. The counting session will not be able to auto-post if the lock is no longer owned by it.
- **High movement volume pagination**: The stock ledger movement API must enforce mandatory paging limit (default 50 records) and cursor/offset parameters to prevent memory exhaustion.
- **Inactive users receiving notifications**: Notifications must only target active users with the specified authorized role scope.
- **Scan lookup for non-existent barcode**: Returns 404 with a clear message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `GET /inventory/balance` endpoint scoped to the caller's warehouse (via `ScopeInterceptor`), returning live on-hand quantities and item details.
- **FR-002**: System MUST provide a `GET /inventory/lots` endpoint returning item lot allocations for the active warehouse scope.
- **FR-003**: System MUST provide a paginated `GET /inventory/movements` endpoint returning read-only stock ledger entries.
- **FR-004**: System MUST provide a `GET /reports/dashboard` endpoint returning aggregate KPI counts (pending PR, open PO, in-transit transfers, overdue transfers).
- **FR-005**: System MUST run a background job every minute to update the database status of locks that have exceeded `expiresAt` to `STALE` while maintaining `isActive = true`.
- **FR-006**: System MUST provide a dedicated unlock endpoint `/warehouse-locks/:id/unlock` restricted to `ADMIN` and `MANAGER` roles to manually deactivate a lock.
- **FR-007**: System MUST write notification logs to `NotificationLog` table for events `PR_SUBMITTED`, `PR_APPROVED`, `TRANSFER_IN_TRANSIT`.
- **FR-008**: System MUST provide an optimized `GET /items/scan` endpoint for scanner UI lookup.
- **FR-009**: System MUST support marking an individual notification as read via `PATCH /notifications/:id/read`.
- **FR-010**: System MUST support marking all notifications for the user's active role/warehouse scope as read via `POST /notifications/read-all`.

### Key Entities *(include if feature involves data)*

- **WarehouseLock**: Represents the locked state of a warehouse during stocktake.
  - Attributes: `id`, `warehouseId`, `isActive`, `status` (ACTIVE, STALE, RELEASED), `sessionId`, `expiresAt`, `lockedAt`, `lockedBy`.
- **NotificationLog**: Represents an in-app notification alert for users of a specific role.
  - Attributes: `id`, `targetRole`, `message`, `isRead`, `createdAt`, `documentType`, `documentId`.
- **AuditLog**: Represents historical mutation log records.
  - Attributes: `id`, `beforeStateJson`, `afterStateJson`, `performedByUserId`, `performedByRole`, `warehouseId`, `branchId`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of inventory and ledger queries are scope-filtered, preventing any unauthorized cross-warehouse data exposure.
- **SC-002**: Barcode scan lookup endpoint responds in under 100ms on a database of 10,000 items.
- **SC-003**: Background lock sweep job executes in under 2 seconds and accurately updates stale locks.
- **SC-004**: Users are able to query notification logs with pagination in under 150ms.

## Assumptions

- Standard pagination page size is 50 items.
- Overdue transfers are defined as transfers that remain `IN_TRANSIT` beyond the configurable threshold `TRANSFER_OVERDUE_DAYS` (default 7 days).
- In-app notification polling frequency by frontend will not exceed once every 30 seconds.
- AuditLog and StockLedger records are read-only and cannot be updated or deleted.
- Native backend file generation (CSV/Excel exports) is out of scope; all reporting endpoints return JSON payloads.
