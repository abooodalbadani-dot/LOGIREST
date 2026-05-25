# Feature Specification: Wire Admin Roles UI to Real Backend API

**Feature Branch**: `027-wire-admin-roles-ui`  
**Created**: 2026-05-25  
**Status**: Draft  
**Input**: User description: "TASK-001 Wire Admin Roles UI to Real Backend API"

## Clarifications

### Session 2026-05-25
- Q: Where should the canonical mapping of role display names and descriptions live? → A: Single Source in `shared-types` (defined as a static map in the shared package and imported by both backend and frontend).


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viewing Role Profiles & User Counts (Priority: P1)

As an Admin, I want to visit the admin roles page and see all defined roles in the system, each showing its correct user count, description, and permission mapping, so that I can audit who has what access in the store.

**Why this priority**: Crucial first step for security and administration. Admins must have an accurate overview of who occupies which administrative/operational roles.

**Independent Test**: Can be fully tested by loading the `/admin/roles` page and verifying that roles are fetched dynamically from the database (via a real `GET /admin/roles` request) with accurate user counts instead of using static mock arrays.

**Acceptance Scenarios**:

1. **Given** that there are 2 active administrators and 5 inventory managers in the database, **When** an Admin loads the `/admin/roles` page, **Then** they should see the "Administrator" role with user count `2` and "Inventory Manager" role with user count `5`.
2. **Given** the page renders successfully, **When** checking the network traffic, **Then** there should be a real API call to `/admin/roles` with no simulated 500ms delay and no static mock references.

---

### User Story 2 - Role Capabilities & Permissions Overview (Priority: P2)

As an Admin, I want to verify role permissions and understand the capability matrix so that I know exactly what actions each role is authorized to perform on Adjustments, Transfers, Issues, and other operational documents.

**Why this priority**: High value for transparency and compliance. Admins need to know the capabilities of each role to prevent operational gaps and ensure proper delegation.

**Independent Test**: Can be tested by clicking on a specific role in the UI and checking that the permissions grid renders exactly according to the capability definitions in the shared package.

**Acceptance Scenarios**:

1. **Given** the Administrator role has full capabilities on all document types, **When** looking at the permissions grid in the UI, **Then** it should show all capability checkboxes/indicators as enabled.
2. **Given** the role permissions display, **When** trying to save or edit permissions, **Then** the UI shows that permissions are statically code-managed for security compliance and does not submit any change mutations.

---

### User Story 3 - Role Identification & Visual Polish (Priority: P3)

As an Admin, I want the roles UI to display user-friendly names and descriptions for technical keys (e.g. WH_KEEPER displayed as "Warehouse Keeper") so that I don't have to decipher database enum codes.

**Why this priority**: Medium priority; significantly improves usability and avoids cognitive load for business operators.

**Independent Test**: Can be verified by reviewing each role's label and description in the UI and confirming it matches business-level nomenclature.

**Acceptance Scenarios**:

1. **Given** a raw database user role of `WH_KEEPER`, **When** the page displays the roles table, **Then** it should show the user-friendly name "Warehouse Keeper" and description "Operational execution of transfers and goods receiving".

---

### Edge Cases

- **Zero-User Roles**: If a role has `0` active users assigned in the database, the system must display `0` rather than crashing, omitting the role, or displaying empty space.
- **Unauthorized API Query**: If a logged-in user without `ADMIN` credentials attempts to access the roles endpoint `/admin/roles` directly or via the UI, the API must reject with `403 Forbidden` and the frontend must show an appropriate unauthorized warning.
- **Disabled Users**: Users marked as `isActive: false` must be excluded from the role user counts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement a backend endpoint `GET /admin/roles` that is accessible only to users with the `ADMIN` role.
- **FR-002**: The `GET /admin/roles` endpoint MUST aggregate and return active user counts per role using `prisma.user.groupBy({ by: ['role'], _count: true, where: { isActive: true } })`.
- **FR-003**: The roles endpoint MUST return structured role descriptors adhering to the `RoleDescriptor` contract. Role display names and descriptions MUST be resolved dynamically on the backend from a static map defined in the shared package (`@logirest/shared-types`).
- **FR-004**: The `/admin/roles` frontend features MUST consume the real `GET /admin/roles` API endpoint using React Query (`useAdminRoles` and `useAdminRole` hooks) and entirely remove the hardcoded `MOCK_ROLES` array.
- **FR-005**: The system MUST implement a read-only role permissions grid. The UI MUST display the static capability matrix derived from `canPerformActionV2` in `@logirest/shared-types` and include a clear user interface notice indicating that role permissions are code-managed for security and compliance.
- **FR-006**: Unit tests in `admin.service.spec.ts` MUST verify that role lists and user counts are correctly queried from the database.
- **FR-007**: E2E tests in `admin-roles.e2e-spec.ts` MUST verify authorization guards and correct API responses.

### Key Entities *(include if feature involves data)*

- **RoleDescriptor**: A contract representing details of a role in the system.
  - `id` (Role Enum): Unique role identifier (e.g. `ADMIN`, `INV_MGR`).
  - `displayName` (string): Human-readable name.
  - `description` (string): Plain language summary of role responsibilities.
  - `userCount` (number): Number of active users assigned to this role.
  - `permissions` (array): List of module-level permissions currently held.
- **User**: The system operator model representing an account.
  - `role` (Role Enum): The security role assigned to the user.
  - `isActive` (boolean): Flag indicating whether the account is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Real user counts are loaded from the database and rendered on `/admin/roles` in under 1 second under normal network conditions.
- **SC-002**: Standard non-admin users (e.g. Warehouse Keepers) are strictly blocked with a `403 Forbidden` response from requesting `/admin/roles`.
- **SC-003**: Zero mock data remains in `useAdminRoles.ts` or related page features.
- **SC-004**: 100% pass rate on newly introduced unit and E2E tests for roles query and controller layer.

## Assumptions

- Standard role metadata (display names and descriptions) can be derived statically using mappers or translations because the role set is fixed by the system's auth and DB schemas.
- The `Role` enum is fully and correctly exported by `@logirest/shared-types`.
- Standard session-based or token-based authentication guards are working and can be reused.
