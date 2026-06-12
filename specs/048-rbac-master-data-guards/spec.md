# Feature Specification: RBAC Master-Data Controller Guards

**Feature Branch**: `048-rbac-master-data-guards`  
**Created**: 2026-06-12  
**Status**: Draft  
**Input**: Phase 1 — Critical: Unprotected Master-Data Controllers (from RBAC Synchronization Audit)

---

## Clarifications

### Session 2026-06-12

- Q: Should the `VIEWER` role be treated as having read-only access to all master-data endpoints, or be blocked entirely? → A: `VIEWER` can read all master-data (`GET` allowed); cannot mutate any (`POST`/`PUT`/`PATCH`/`DELETE` denied) — consistent with their role name and FR-010.
- Q: Should the `APPROVER` role have read access to master-data and FX rate data alongside other financial roles? → A: `APPROVER` can read all master-data (same as `VIEWER`) and can read FX rates (added to FR-007 allowlist); cannot mutate anything.
- Q: Should the system produce a structured audit/security log entry whenever the new guard denies access to a master-data endpoint? → A: Yes — the guard MUST emit a structured warning log entry on every `403` rejection, including role, HTTP method, and endpoint path (no PII).
- Q: Should `STORE_MGR` be granted write access to FX rates in addition to the read access already defined in FR-007? → A: No — `STORE_MGR` is read-only for FX rates. FX rate write access remains restricted to `ADMIN`, `GM`, and `PROC_MGR` (FR-006 unchanged). This is an explicit, deliberate design decision.
- Q: Should all 7 changes (6 backend controller guards + 1 frontend column mask) be deployed atomically or independently? → A: Atomic — all 7 changes MUST be released in a single deployment unit. Partial deployment is not acceptable as it creates an inconsistent security posture.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Role-Based Write Protection on Master-Data (Priority: P1)

As a system administrator responsible for data integrity, I need all master-data mutation operations (create, update, delete) to be accessible only to users with `ADMIN` or `GM` roles, so that warehouse keepers, kitchen chiefs, and procurement officers cannot corrupt foundational reference data.

**Why this priority**: Master-data records (items, departments, barcodes, units of measure, FX rates, variance reasons) are referenced by every transaction in the system. Unauthorized mutation of these records creates cascading data integrity failures across all inventory, procurement, and reporting workflows. This is a critical security vulnerability that is already present in production.

**Independent Test**: Can be fully tested by issuing a `POST` or `PUT` request to any master-data endpoint while authenticated as a `WH_KEEPER` user. The system must return `403 Forbidden` on all such requests without requiring any other feature to be in place.

**Acceptance Scenarios**:

1. **Given** a user authenticated with role `WH_KEEPER`, **When** they send `POST /master-data/items` with valid payload, **Then** the system returns `403 Forbidden` and the record is not created.
2. **Given** a user authenticated with role `KITCHEN_CHIEF`, **When** they send `PUT /master-data/departments/:id`, **Then** the system returns `403 Forbidden`.
3. **Given** a user authenticated with role `ADMIN`, **When** they send `POST /master-data/items` with valid payload, **Then** the system returns `201 Created` and the record is persisted.
4. **Given** a user authenticated with role `GM`, **When** they send `DELETE /master-data/barcodes/:id`, **Then** the system returns `200 OK` and the record is removed.
5. **Given** a user authenticated with role `WH_KEEPER`, **When** they send `GET /master-data/items`, **Then** the system returns `200 OK` — read access is preserved for all authenticated roles.

---

### User Story 2 — FX Rate Financial Access Restriction (Priority: P1)

As a finance manager, I need FX rate data (cost-sensitive financial information) to be readable only by roles with financial access (ADMIN, GM, INV_MGR, STORE_MGR, BRANCH_MGR, PROC_MGR, PROC_OFFICER, AUDITOR) and writable only by ADMIN, GM, and PROC_MGR, so that operational roles like `WH_KEEPER` and `KITCHEN_CHIEF` cannot view or manipulate cost data.

**Why this priority**: FX rates directly affect all cost valuations and procurement pricing. Unrestricted read access exposes financially sensitive data to operational staff who have no legitimate business need for it. This is a compliance and confidentiality risk.

**Independent Test**: Authenticate as `WH_KEEPER` and issue `GET /master-data/fx-rates`. The system must return `403 Forbidden`. Then authenticate as `PROC_MGR` and issue the same request — must return `200 OK`.

**Acceptance Scenarios**:

1. **Given** a user authenticated with role `WH_KEEPER`, **When** they send `GET /master-data/fx-rates`, **Then** the system returns `403 Forbidden`.
2. **Given** a user authenticated with role `KITCHEN_CHIEF`, **When** they send `GET /master-data/fx-rates`, **Then** the system returns `403 Forbidden`.
3. **Given** a user authenticated with role `PROC_MGR`, **When** they send `GET /master-data/fx-rates`, **Then** the system returns `200 OK`.
4. **Given** a user authenticated with role `PROC_OFFICER`, **When** they send `POST /master-data/fx-rates`, **Then** the system returns `403 Forbidden` — write is restricted to ADMIN, GM, PROC_MGR.
5. **Given** a user authenticated with role `PROC_MGR`, **When** they send `POST /master-data/fx-rates` with valid payload, **Then** the system returns `201 Created`.

---

### User Story 3 — Variance Reason Management Restricted to Inventory Managers (Priority: P2)

As an inventory manager, I need control over variance reasons so that only ADMIN, GM, and INV_MGR roles can create, update, or delete variance reason records, ensuring that the vocabulary used in stocktake discrepancy reporting remains controlled and auditable.

**Why this priority**: Variance reasons are used to categorize discrepancies in stocktake sessions. If any authenticated user can add or modify reasons, the audit trail loses its integrity. This is a lower-priority concern than items/departments as variance reasons affect reporting quality rather than transactional safety.

**Independent Test**: Authenticate as `PROC_OFFICER` and issue `POST /master-data/variance-reasons`. The system must return `403 Forbidden`. Authenticate as `INV_MGR` and issue the same request — must return `201 Created`.

**Acceptance Scenarios**:

1. **Given** a user authenticated with role `PROC_OFFICER`, **When** they send `POST /master-data/variance-reasons`, **Then** the system returns `403 Forbidden`.
2. **Given** a user authenticated with role `INV_MGR`, **When** they send `POST /master-data/variance-reasons` with valid payload, **Then** the system returns `201 Created`.
3. **Given** a user authenticated with role `WH_KEEPER`, **When** they send `GET /master-data/variance-reasons`, **Then** the system returns `200 OK` — read access remains open to all authenticated roles.

---

### User Story 4 — Financial Column Masking in Valuation Reports (Priority: P2)

As a warehouse keeper, I should not see unit cost or total value columns in the inventory valuation table, even if the underlying API response contains that data, so that cost information remains confidential to financially authorized roles only.

**Why this priority**: Data present in an API response but displayed to an unauthorized user still constitutes a data exposure. Client-side column masking, coordinated with the existing role-based column visibility system, closes this gap without requiring a separate API endpoint.

**Independent Test**: Log in as `WH_KEEPER`, navigate to the inventory valuation report. The `Unit Cost` and `Total Value` columns must not be visible. Log in as `INV_MGR` — both columns must be visible.

**Acceptance Scenarios**:

1. **Given** a user with role `WH_KEEPER` viewing the valuation table, **When** the table renders, **Then** the `Unit Cost` column is absent from the view.
2. **Given** a user with role `WH_KEEPER` viewing the valuation table, **When** the table renders, **Then** the `Total Value` column is absent from the view.
3. **Given** a user with role `INV_MGR` viewing the valuation table, **When** the table renders, **Then** both `Unit Cost` and `Total Value` columns are visible with correct values.
4. **Given** a user with role `AUDITOR` viewing the valuation table, **When** the table renders, **Then** both financial columns are visible.

---

### Edge Cases

- What happens when an unauthenticated request reaches a master-data endpoint? → The existing `JwtAuthGuard` returns `401 Unauthorized` before role evaluation occurs. This behaviour must not regress.
- What happens if a new role is added to the system in the future without being included in any master-data guard? → The guard must fail-closed: a role not listed in `@Roles()` must receive `403`, not `200`.
- What happens if the same user token has a role that falls on the boundary (e.g., `PROC_MGR` for FX rates)? → The role is in the explicit allowlist for FX read access and write access; the request proceeds normally.
- What happens to existing `GET` endpoints on guarded controllers? → All `GET` (read) endpoints on items, departments, barcodes, UoM, and variance-reasons remain accessible to all authenticated roles — only mutating endpoints are restricted.
- What is logged when the guard rejects a request? → A `WARN`-level structured log entry containing role, HTTP method, path, and timestamp only. No request body, no user name or email, no IP address — strictly non-PII fields.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST deny `POST`, `PUT`, `PATCH`, and `DELETE` requests to `/master-data/items` for any role that is not `ADMIN` or `GM`, returning `403 Forbidden`.
- **FR-002**: The system MUST deny mutating requests to `/master-data/departments` for any role that is not `ADMIN` or `GM`.
- **FR-003**: The system MUST deny mutating requests to `/master-data/barcodes` for any role that is not `ADMIN` or `GM`, while barcode lookup (`GET`) remains open to all authenticated roles.
- **FR-004**: The system MUST deny mutating requests to `/master-data/units-of-measure` for any role that is not `ADMIN` or `GM`.
- **FR-005**: The system MUST deny all requests (read and write) to `/master-data/fx-rates` for roles `WH_KEEPER` and `KITCHEN_CHIEF`.
- **FR-006**: The system MUST restrict write access to `/master-data/fx-rates` to roles `ADMIN`, `GM`, and `PROC_MGR` only.
- **FR-007**: The system MUST restrict read access to `/master-data/fx-rates` to roles with financial access: `ADMIN`, `GM`, `INV_MGR`, `STORE_MGR`, `BRANCH_MGR`, `PROC_MGR`, `PROC_OFFICER`, `AUDITOR`, and `APPROVER`. `APPROVER` requires FX rate visibility to make informed decisions on cost-sensitive procurement documents.
- **FR-008**: The system MUST deny mutating requests to `/master-data/variance-reasons` for any role that is not `ADMIN`, `GM`, or `INV_MGR`.
- **FR-009**: The inventory valuation report MUST hide the `Unit Cost` and `Total Value` columns from users whose role does not have financial data visibility (i.e., `WH_KEEPER`, `KITCHEN_CHIEF`, `VIEWER`).
- **FR-010**: All `GET` endpoints on items, departments, barcodes, units-of-measure, and variance-reasons controllers MUST remain accessible to all authenticated users regardless of role — including `VIEWER` and `APPROVER` — role guards must not break read access.
- **FR-011**: Role enforcement MUST be implemented via declarative guard decorators (`@UseGuards`, `@Roles`) at the controller level, not via ad-hoc role checks inside handler bodies.
- **FR-012**: The system MUST continue to return `401 Unauthorized` for unauthenticated requests — the `JwtAuthGuard` must remain the outer guard and must not be removed or bypassed by this change.
- **FR-013**: The `RolesGuard` MUST emit a structured `WARN`-level log entry on every `403` rejection from a master-data endpoint. The log entry MUST include: requesting role, HTTP method, endpoint path, and timestamp. The log entry MUST NOT include request body contents, user identity details (name, email), or any personally identifiable information (PII).

### Key Entities

- **Role**: An enumerated permission level assigned to each authenticated user (e.g., `ADMIN`, `GM`, `WH_KEEPER`, `INV_MGR`, `PROC_MGR`, `PROC_OFFICER`, `KITCHEN_CHIEF`, `STORE_MGR`, `BRANCH_MGR`, `AUDITOR`, `VIEWER`).
- **Master-Data Resource**: A foundational reference record that is referenced by transactional documents. Includes: Items, Departments, Barcodes, Units of Measure, FX Rates, Variance Reasons.
- **Mutating Endpoint**: Any HTTP endpoint that creates, modifies, or deletes data (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Read Endpoint**: Any HTTP endpoint that retrieves data without modification (`GET`).
- **Column Visibility Rule**: A per-role rule that determines whether a specific data column is rendered in the user interface.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a non-administrative role (e.g., `WH_KEEPER`) receives `403 Forbidden` on 100% of mutating requests to all six master-data resources without exception.
- **SC-002**: A user with role `ADMIN` or `GM` can successfully create, update, and delete records on all six master-data resources — zero regression in administrative workflows.
- **SC-003**: A user with role `WH_KEEPER` or `KITCHEN_CHIEF` receives `403 Forbidden` on both read and write requests to the FX rates endpoint.
- **SC-004**: A user with role `PROC_MGR` can read and write FX rate records without receiving any error response.
- **SC-005**: The `Unit Cost` and `Total Value` columns are invisible to `WH_KEEPER` users in the valuation report UI — verified by visual inspection across at least two different browser sessions.
- **SC-006**: All existing read (`GET`) endpoints on guarded controllers continue to return `200 OK` for any authenticated user, with zero regression in read access for any role.
- **SC-007**: The backend type-checker passes with zero errors after all guard changes are applied.
- **SC-008**: The frontend type-checker passes with zero errors after the column visibility change is applied.
- **SC-009**: Every `403 Forbidden` response returned by a master-data guard produces exactly one corresponding `WARN`-level log entry in the application log, with role, HTTP method, and path fields present and no PII fields present.
- **SC-010**: All 7 changes (TASK-01 through TASK-07) pass the full verification suite — backend type-check, frontend type-check, lint, and unit tests — before any single change is deployed to production. No partial deployment is acceptable.

---

## Assumptions

- The `RolesGuard` and `@Roles()` decorator infrastructure already exist in the codebase and are used by other controllers — this feature extends their usage, not introduces them.
- The `JwtAuthGuard` is already applied at the controller level on all affected controllers; this feature adds `RolesGuard` alongside it.
- The `useColumnVisibility` hook already exists in the frontend codebase and correctly maps role-based visibility rules — this feature calls it for two additional column keys.
- The `canViewFinancialData` utility function already exists and correctly identifies roles with financial data access.
- All six master-data controllers (`items`, `departments`, `barcodes`, `uom`, `fx-rates`, `variance-reasons`) currently have zero role guards on mutating endpoints — the entire protection layer is absent and must be added from scratch.
- The `PROC_OFFICER` role does not have financial access and must not be granted FX rate write access.
- Read access to items, departments, barcodes, UoM, and variance-reasons is intentionally open to all authenticated roles including `VIEWER` and `APPROVER` — this is a business decision, not an oversight. Neither `VIEWER` nor `APPROVER` must ever appear in any `@Roles()` allowlist for mutating endpoints.
- The `APPROVER` role requires read access to FX rates (added to FR-007) because approvers evaluate cost-sensitive procurement documents. They have no write access to any master-data resource.
- `STORE_MGR` has read-only access to FX rates (FR-007) but is intentionally excluded from the FX rate write allowlist (FR-006). Store managers consume FX data for cost awareness but do not own the FX rate definition process — that responsibility belongs to `PROC_MGR`.
- Mobile or external client applications are not in scope; only the internal web application and REST API are affected.
- No database schema changes are required — this feature is purely a security hardening of existing API controllers and a UI column-masking change.
- All 7 changes (6 backend controller guards + 1 frontend column mask) MUST be deployed as a single atomic unit. Deploying a subset is explicitly out of scope and must be blocked at the release gate. A mixed security posture — where some master-data resources are guarded and others are not — is not an acceptable intermediate state.
