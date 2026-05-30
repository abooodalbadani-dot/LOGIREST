# Feature Specification: LogiRest Phase 1 — Master Issue Registry

**Feature Branch**: `041-master-issue-registry`  
**Created**: 2026-05-30  
**Status**: Clarified  
**Input**: User description: "read this file @[c:\Users\Qursan\.gemini\antigravity-ide\brain\a331d170-7cf4-4faa-8e1d-d8987e3212b4\logirest_recovery_plan.md] and creat a specification for the Phase 1 — Master Issue Registry only"

## Clarifications

- **Q1 (Default Department Configuration for Seed)**: Option A — "Main Kitchen" / "MAIN-KIT" (Creates a realistic starting department for a culinary/kitchen ERP).
- **Q2 (Frontend Loading State During Scope Restore)**: Option A — Global Loading Spinner until authentication and scope restoration are fully completed.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Data Loading Across All System Screens (Priority: P1)

As a kitchen manager or inventory accountant, I want all list screens in the application (Inventory Balance, PR, PO, GRN, Transfers, Issues, Adjustments, Stocktakes, Kitchen Requests) to load and display data successfully, so that I can monitor and manage kitchen stock without seeing application crashes or parsing errors.

**Why this priority**: Directly resolves the critical P0 launch blocker where 21 out of 25 API endpoints have broken response contracts, causing Zod errors and blocking basic application usage.

**Independent Test**: Can be verified by navigating to each of the 10 core listing screens in the frontend. When data is fetched, the frontend Zod schemas must successfully parse the API response without throwing validation errors, and the correct table rows and pagination controls must render.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Inventory Balance listing, **When** the page sends a GET request to the backend, **Then** the backend returns the results wrapped in a standardized `{ data: T[], meta: { total, page, page_size, total_pages } }` envelope, and the frontend parses it correctly.
2. **Given** a paginated operational list request (e.g., Purchase Orders), **When** requesting page 2 with a limit of 10, **Then** the backend returns data for that page range and metadata indicating the correct total records, current page, page size, and total pages.

---

### User Story 2 - Deterministic Warehouse Operations (Priority: P1)

As a warehouse worker, I want my warehouse-related actions (selection, locking, CRUD) to behave deterministically and route to a single, stable controller path, so that my work context is always preserved and operations do not fail randomly.

**Why this priority**: Resolves the P0-003 route collision where two controllers are mapped to `@Controller('warehouses')`, making API responses non-deterministic depending on NestJS module loading order.

**Independent Test**: Perform CRUD actions (create, read, update, delete) and scoping operations on warehouses multiple times across fresh application boots. Verify that all warehouse API calls route to a consolidated endpoint and return the correct paginated envelope.

**Acceptance Scenarios**:

1. **Given** two competing warehouse controllers in the codebase, **When** the application starts up and registers routes, **Then** only one consolidated, deterministic route is exposed for `/warehouses` which supports all CRUD and retrieval operations.
2. **Given** a client requests `/warehouses`, **When** the request is resolved, **Then** the API returns a paginated list with correct `{ data, meta }` structure instead of a flat array or throwing a route collision error.

---

### User Story 3 - Secure Session Initialization (Priority: P1)

As a system administrator, I want the application to reject startup if required security secrets (JWT access/refresh) are not configured in the environment, so that the system is never exposed in a vulnerable state using public fallback keys.

**Why this priority**: Resolves the P0-002 security risk where the JWT module silently uses a hardcoded fallback string if the environment variables are missing, exposing the system to token forgery.

**Independent Test**: Attempt to start the backend application without defining `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` in the environment. The system must fail-fast and exit immediately during boot.

**Acceptance Scenarios**:

1. **Given** the backend is starting up, **When** any mandatory JWT secret environment variable is missing, **Then** the application logs a fatal error and terminates execution immediately.

---

### User Story 4 - Scope Integrity on Profile Edit and Page Reload (Priority: P1)

As a multi-warehouse user, I want to edit my user profile and reload my browser tab without losing my active branch/warehouse scope, so that I do not experience unexpected session interruptions or invalid lock requests.

**Why this priority**: Resolves P0-004 (profile update wipes scopes) and P1-004 (race condition sending `null` to `useWarehouseLock` on reload), which break the session and lead to invalid API requests.

**Independent Test**: Update user profile details via the user profile form, then navigate the app. Also, reload the page on a warehouse-specific view. Verify that the active scope is retained, and no API calls are sent to `/inventory/warehouses/null/lock`.

**Acceptance Scenarios**:

1. **Given** a user is logged in with an active warehouse scope, **When** they submit a profile update, **Then** their user scopes are preserved in the response and session, and they do not lose access to their active scope.
2. **Given** a user reloads the dashboard page, **When** the application restores the active session scope from local storage, **Then** the frontend guards any warehouse lock requests from firing with `null` or empty parameters.

---

### User Story 5 - Automatic Kitchen Requisition Setup (Priority: P2)

As an IT deployment engineer, I want the system seed script to automatically provision default kitchen departments, so that the application is operational immediately after initial setup without manual database patching.

**Why this priority**: Resolves P0-005 (missing department in seed) which blocks the creation of inventory issues and kitchen requests on a fresh system because `departmentId` is a required foreign key.

**Independent Test**: Run the database seed command on a clean database and verify that a default kitchen department exists and can be selected in the inventory issue creation flow.

**Acceptance Scenarios**:

1. **Given** a clean database installation, **When** the production seed script `seed.prod.ts` is executed, **Then** a default department is successfully created in the database and is linked to the primary branch.

---

### Edge Cases

- **What happens if the frontend page reloads before the scope is restored from localStorage?**
  The system MUST prevent triggering dependent API calls (like warehouse locking or scope validations) with a `null` or empty identifier. Any hook requesting lock status must be disabled until a valid ID is present.
- **What happens when a user updates their profile but the backend database update fails?**
  The user's active session scope MUST remain untouched, and a user-friendly error message must be shown, preventing the frontend from falling back to empty scopes.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend MUST wrap all flat-array list responses in a standardized `{ data: T[], meta: { total: number, page: number, page_size: number, total_pages: number } }` envelope across all 21 broken endpoints (Inventory Balance, Lots, Movements, Branches, Warehouses, Departments, Categories, Suppliers, UoM, Barcodes, Currencies, Purchase Requests, Purchase Orders, GRNs, Transfers, Issues, Adjustments, Stocktakes, Kitchen Requests, Audit Logs, Notification Templates, and Outbox).
- **FR-002**: The backend services MUST rename metadata fields `limit` to `page_size` and `totalPages`/`last_page` to `total_pages` to conform with the frontend API response standard.
- **FR-003**: The NestJS application MUST validate JWT access and refresh secret configurations asynchronously at startup, throwing a fatal error and refusing to boot if they are not provided, eliminating default fallback string keys.
- **FR-004**: The backend MUST resolve the controller route conflict under `@Controller('warehouses')` by consolidating all operations into a single controller file and deleting the duplicate legacy controller.
- **FR-005**: The `updateProfile` endpoint service handler MUST return the user's authentic database scopes instead of returning an empty array `scopes: []`.
- **FR-006**: The database seed script `seed.prod.ts` MUST seed at least one default kitchen department with the name "Main Kitchen" and code "MAIN-KIT".
- **FR-007**: The frontend `useWarehouseLock` hook MUST guard against sending requests with `null` or empty warehouse IDs during page reload initialization, and the application MUST display a global loading spinner until authentication and scope restoration are fully completed.
- **FR-008**: The frontend MUST remove all inline paginated schema definitions from individual hook files (`useBranches.ts`, `useWarehouses.ts`, `useDepartments.ts`) and use the central `paginatedSchema()` utility factory from `types/api.ts` to ensure schema consistency.
- **FR-009**: The frontend `AuthProvider` state management MUST initialize cleared scopes using `null` instead of empty strings `""` to maintain strict type safety.

### Key Entities *(include if feature involves data)*

- **`Scope`**: Represents the user's authorized branch and warehouse access scope context. Attributes: `{ branchId: string | null, warehouseId: string | null }`.
- **`Department`**: Represents the kitchen department or cost center requesting ingredients. Attributes: `{ id, name, code, branchId, isActive }`.
- **`Warehouse`**: Represents a physical storage location where stock is held. Attributes: `{ id, name, code, branchId, isActive }`.
- **`PaginationMeta`**: Standardized metadata structure included in list query responses. Attributes: `{ total, page, page_size, total_pages }`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 21 audited endpoints return the standardized paginated payload envelope containing `data` and `meta` fields.
- **SC-002**: Zero Zod parsing errors in the browser console across all 10 core screens during navigation and listing actions.
- **SC-003**: Zero startup success logs if the backend is launched without setting `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` environment variables.
- **SC-004**: Zero invalid `null` requests sent to `/inventory/warehouses/null/lock` when reloading the browser page.

---

## Assumptions

- The frontend application has already standardized on using the `paginatedSchema` validation structure for handling listings.
- Only the monorepo's own web client consumes this API; no third-party clients require backwards compatibility with the legacy flat-array or different metadata shapes.
- Basic database seeding is sufficient to resolve the missing department dependency, and manual post-deployment workflows will be used for tenant-specific configuration.
- The environment configuration follows the `.env` configuration pattern defined in the monorepo root.


