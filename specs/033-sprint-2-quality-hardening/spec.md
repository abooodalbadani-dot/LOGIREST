# Feature Specification: Sprint 2 Quality Hardening

**Feature Branch**: `033-sprint-2-quality-hardening`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "Sprint 2 — Medium-Priority Quality Items only"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Operations Hub for Frozen Items and Failed Notifications (Priority: P1)

As an Inventory Administrator, I want a centralized dashboard where I can view items frozen by the reconciliation engine, unfreeze them with a single click, and review and retry any failed outgoing system notifications so that warehouse operations can run smoothly without manual database intervention.

**Why this priority**: Extremely high operational value. Unlocks locked items and retries critical business notifications directly from the UI, removing the reliance on database administrators to execute manual SQL scripts during operations.

**Independent Test**: An administrator can log in, navigate to the Admin Settings, see a list of currently frozen items, unfreeze one, and see it disappear from the table. They can also view failed outbox notifications and retry them successfully.

**Acceptance Scenarios**:

1. **Given** there are frozen items in the warehouse, **When** the Administrator views the Admin Frozen Items page, **Then** they see a table containing each frozen item's SKU, name, warehouse location, and date it was frozen.
2. **Given** a frozen item in the table, **When** the Administrator clicks the "Unfreeze" button, **Then** the item is unfrozen, removed from the active frozen table, and an audit trail log is created.
3. **Given** there are failed system notifications, **When** the Administrator views the Outbox Failures page, **Then** they see the list of failed notifications, the attempted count, and the specific failure reason.
4. **Given** a list of failed notifications, **When** the Administrator clicks "Retry" or "Retry All", **Then** the selected notifications are queued for immediate retry, and their status changes back to pending.

---

### User Story 2 - System Auditing and Security Monitoring (Priority: P2)

As a Security Auditor or SRE, I want the system to automatically log failed login attempts and monitor notification processing failures in real time so that we can proactively detect brute-force attacks and email server configuration issues.

**Why this priority**: Essential for security and operational compliance, ensuring no silent security breaches or hidden system-to-user communication blockages.

**Independent Test**: Simulate a failed login and verify a security audit event is logged. Simulate a notification failure and verify it is exposed to the central metrics dashboard.

**Acceptance Scenarios**:

1. **Given** a user attempts to log in with invalid credentials or an inactive account, **When** the login attempt fails, **Then** the system logs a permanent audit trail record of type `LOGIN_FAILED` containing the email address attempted, the IP address, and the failure timestamp.
2. **Given** an outgoing notification fails to process, **When** the worker processes the failure, **Then** a global metrics counter for failed notifications is incremented and exposed via the system monitoring endpoint.

---

### User Story 3 - Persistent Background Job Resilience (Priority: P3)

As a System Operator, I want background jobs (such as inventory lock cleanups and low-stock alerts) to run on a predictable schedule and survive server restarts without generating spam or duplicate notifications.

**Why this priority**: Important for long-term system stability and user experience, avoiding duplicate email noise and leaked system resources.

**Independent Test**: Verify that expired locks are cleaned up every minute on the dot, and that a low-stock alert is only sent once per day even if the server restarts.

**Acceptance Scenarios**:

1. **Given** the system is running, **When** inventory locks expire, **Then** a background cleanup job executes automatically every minute to release the locked stock.
2. **Given** a warehouse item drops below its low-stock threshold, **When** the low-stock alert job executes, **Then** it sends a single notification and registers a persistent 24-hour block that survives server restarts to prevent duplicate alerts.

---

### Edge Cases

- **Non-Existent User Login Failures**: If a user attempts a failed login with an email that does not exist in the system, the system logs the failure under the non-existent email as target ID but sets the user ID reference to null.
- **Concurrent Reconciliation Lock**: If the Administrator attempts to unfreeze a frozen item while a reconciliation run is currently active on that item's warehouse, the system blocks the unfreeze operation and warns the administrator.
- **Notification State Guard**: If the notification retry console is used to retry an event that has already succeeded, the system rejects the request with an error indicating that only failed events can be retried.
- **Debounce Cache Outages**: If the persistent shared caching system is temporarily unavailable, background alert jobs log a warning and bypass the debounce cache to guarantee that low-stock alerts are sent rather than failing silently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record a `LOGIN_FAILED` audit log entry on any unsuccessful authentication attempt.
- **FR-002**: The `LOGIN_FAILED` audit entry MUST contain the attempted username/email, IP address, and timestamp, with the user ID set to null if the user does not exist in the system.
- **FR-003**: System MUST expose a Prometheus-compatible metrics counter tracking the total number of failed outgoing outbox notifications.
- **FR-004**: System MUST execute a background inventory lock cleanup task exactly once every minute using a standardized cron-based scheduler.
- **FR-005**: System MUST provide an Admin Frozen Items user interface displaying all items currently frozen due to stock discrepancies.
- **FR-006**: System MUST allow Administrators to unfreeze a frozen item via the Admin Frozen Items UI, immediately updating the item's state and logging the unfreeze event in the audit trail.
- **FR-007**: System MUST provide an Admin Outbox Console displaying a paginated list of failed outbox notifications with error details.
- **FR-008**: System MUST allow Administrators to retry failed outbox notifications individually or in bulk via the Admin Outbox Console.
- **FR-009**: System MUST enforce database-level validation to prevent outbox events from being saved with invalid statuses.
- **FR-010**: System MUST persist the low-stock alert debounce state in a shared, persistent cache to prevent duplicate alerts across server restarts.

### Key Entities

- **AuditLog**: Represents system security and operational events (actions, target table, target ID, IP address, state change, and timestamp).
- **WarehouseItem**: Represents a stock item in a specific warehouse, which can have an `isFrozen` status flag.
- **OutboxEvent**: Represents an asynchronous system event/notification to be sent (type, status [Pending, Succeeded, Failed], retry attempts, and last error message).
- **InventoryLock**: Represents a temporary reservation of stock that expires and must be cleaned up if not finalized.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: System administrators can view, locate, and unfreeze a frozen item in less than 3 clicks.
- **SC-002**: The background lock cleanup task runs reliably every 60 seconds with zero manual intervention.
- **SC-003**: Administrators can retry a batch of failed notifications in a single action, and the system queues them within 1 second.
- **SC-004**: Low-stock alert duplicate notifications are reduced to zero over any 24-hour period, even in the event of multiple server restarts.
- **SC-005**: All unsuccessful login attempts are logged in the audit trail within 100 milliseconds of the failed request.

## Assumptions

- **A-001**: The system has an existing Redis-based or equivalent shared caching infrastructure to persist low-stock alert debounces.
- **A-002**: The existing Next.js admin frontend layout and sidebar can accommodate new navigation items for Frozen Items and Outbox.
- **A-003**: System administrators have appropriate administrative roles (`ADMIN` or `INV_MGR`) to perform unfreeze and retry operations.
- **A-004**: Prometheus scraping infrastructure is configured to collect application metrics.
