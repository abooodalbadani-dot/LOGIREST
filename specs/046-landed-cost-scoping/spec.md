# Feature Specification: Landed Cost & Scoping (Sprint 3)

**Feature Branch**: `046-landed-cost-scoping`  
**Created**: 2026-06-01  
**Status**: Approved  
**Input**: User description: "read this file and create a specification for the Sprint 3: Landed Cost & Scoping only"

## Clarifications

### Session 2026-06-01

- Q: Can a posted LandedCostVoucher be voided or reversed, and how should WAC and ledger entries be handled on reversal? → A: LandedCostVoucher is immutable once posted; errors must be corrected by posting a new corrective/adjusting Landed Cost Voucher.
- Q: Can a single Landed Cost Voucher allocate and distribute costs across multiple different Goods Received Notes (GRN) simultaneously, or is it strictly limited to a one-to-one mapping? → A: A single Landed Cost Voucher can distribute costs across any arbitrary set of posted GRNs.
- Q: Should retrospective WAC revaluations execute synchronously inside the request-response lifecycle or asynchronously via background queue workers? → A: Landed cost revaluations will run asynchronously in a background job queue, returning an immediate status of processing, and notifying the user upon completion.
- Q: How should the system handle "global" warehouse access for central users (e.g. executives, system administrators)? → A: Central roles (e.g. ADMIN, PROCUREMENT_DIR) bypass warehouse scope checks automatically, granting them global visibility across all locations.
- Q: Which system roles are authorized to view roles and modify user-to-role mappings in user management? → A: Only users explicitly holding the static ADMIN role can view roles and assign/modify role settings for other users.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Landed Cost Allocation & Retrospective WAC Recalculation (Priority: P1)

As a financial auditor or procurement manager, I want to allocate additional import costs (freight, duties, customs, handling) to posted goods received, so that the true landed cost is accurately calculated and reflected in inventory valuations.

**Why this priority**: Accurate Weighted Average Cost (WAC) is the cornerstone of inventory valuation, profitability reports, and financial compliance (COGS). It ensures the organization does not under-report or over-report asset values.

**Independent Test**: Can be fully tested by creating a Goods Received Note (GRN), posting it, checking the initial WAC, allocating a Landed Cost Voucher to that GRN (e.g. adding 150 SAR freight charges), and verifying that the WAC of the affected item lots is retrospectively updated and recorded in the Cost Ledger.

**Acceptance Scenarios**:

1. **Given** a posted Goods Received Note with multiple items (Item A worth 100 SAR, Item B worth 200 SAR), **When** a Landed Cost Voucher of 30 SAR is allocated pro-rata by item value, **Then** Item A's cost basis increases by 10 SAR, Item B's increases by 20 SAR, and their WAC values are updated accordingly.
2. **Given** a lot that has been partially issued (e.g. 5 out of 10 items issued), **When** a Landed Cost Voucher is allocated to the original GRN, **Then** the WAC is retrospectively recalculated, the remaining stock value is updated, and a cost adjustment transaction is written to the Cost Ledger for the issued portion to correct the historical Cost of Goods Sold.
3. **Given** multiple concurrent revaluations or issues on the same item lot, **When** WAC recalculation is triggered, **Then** the database schedules an asynchronous recalculation using serialized background queues to prevent race conditions and lock-contention drifts.

---

### User Story 2 - Warehouse Scope-Filtered Search and Reports (Priority: P1)

As a warehouse keeper or operations manager, I want all searches and reports to automatically filter records based on my assigned warehouse scope, so that I cannot view or mutate inventory data of other warehouses or branches.

**Why this priority**: Data segregation is a critical security and operational requirement. Warehouse personnel must only have access to information relevant to their physical locations to prevent data leaks.

**Independent Test**: Can be tested by logging in as a user assigned only to "Warehouse A", performing an inventory search, running a stock movement report, and verifying that zero records or balances from "Warehouse B" are visible.

**Acceptance Scenarios**:

1. **Given** a user scoped strictly to Warehouse A, **When** they perform a global inventory search or view the dashboard, **Then** the system filters out all items, lots, and stock levels located in Warehouse B.
2. **Given** a user scoped strictly to Warehouse A, **When** they request an inventory valuation or stock movement report, **Then** the aggregated data and detailed ledger lines only represent stock movements within Warehouse A.
3. **Given** a user with no assigned warehouse scope, **When** they attempt to access search or reporting routes, **Then** the system denies access and returns empty/unauthorized results by default.
4. **Given** a user with a global system role (e.g., ADMIN, PROCUREMENT_DIR), **When** they perform a search or run an inventory report, **Then** the system returns data for all warehouses, completely bypassing physical scope restrictions.

---

### User Story 3 - Admin Roles Matrix and User Role Assignment (Priority: P2)

As a system administrator, I want to view a read-only list of hardcoded system roles and their permissions, and be able to assign or update any user's role, so that access control can be managed transparently.

**Why this priority**: Managing user access permissions is a key administrative task, but because permissions are hardcoded by design, editing permission mappings dynamically is out of scope. Assigning users to predefined roles meets the business requirement safely.

**Independent Test**: Can be tested by opening the roles viewer, verifying that the hardcoded capabilities of the "Approver" role are accurately displayed, modifying a user's role to "Approver", and verifying that they immediately gain document approval capabilities.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they open the Roles section, **Then** they see a read-only matrix of system roles (e.g., WH_KEEPER, APPROVER, ADMIN) and their hardcoded capabilities dynamically loaded from the backend.
2. **Given** an administrator, **When** they update a user's role assignment from "Warehouse Keeper" to "Admin" and save, **Then** the user's role is updated instantly in the user registry and their security context reflects the new permissions on their next action.
3. **Given** a user who does not hold the static "ADMIN" role, **When** they attempt to load the roles matrix or update a user's role, **Then** the system blocks the request and returns a 403 Forbidden response.

---

### User Story 4 - Dynamic Base Currency from Settings (Priority: P3)

As a business executive or manager, I want the dashboard and reports to display the correct currency labels dynamically based on global settings, rather than displaying hardcoded currency symbols.

**Why this priority**: Supports localization and multi-currency operations, ensuring reports match the organization's legal base currency.

**Independent Test**: Can be tested by changing the system's base currency setting in settings, navigating to the dashboard, and verifying all currency-denominated cards and tables display the new currency label.

**Acceptance Scenarios**:

1. **Given** the global base currency is set to "SAR", **When** a user views the dashboard or stock valuation report, **Then** all financial values are labeled with "SAR".
2. **Given** the global base currency is changed to "USD", **When** a user opens the dashboard or reports, **Then** the system displays all cost totals with "$" or "USD" labels instead of "SAR".

---

### Edge Cases

- **Retrospective Landed Cost Allocation**: Retrospective landed cost allocations and WAC recalculations are strictly restricted to Goods Received Notes (GRN) within open financial periods (e.g., the current active month/quarter). Allocating landed costs to documents in closed or locked financial periods is blocked.
- **Lot Already Exhausted**: How does the system handle landed cost allocation when the affected item lot has already been 100% issued or transferred?
- **Multi-Currency Landed Costs**: When a landed cost invoice is in a foreign currency, it is converted to the system's base currency (SAR) using the official exchange rate active on the transaction/invoice date of the Landed Cost Voucher itself.
- **Scoped User URL Manipulation**: How does the system handle a scoped user manually entering a URL path with a query parameter for a warehouse they are not authorized to view?
- **Voucher Voiding and Reversals**: A posted LandedCostVoucher is immutable and cannot be deleted, edited, or voided. Any valuation errors or cost corrections must be resolved by creating and posting a new adjusting Landed Cost Voucher that offsets the incorrect amounts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Landed Cost Module must allow authorized finance users to create a Landed Cost Voucher linked to one or more posted Goods Received Notes (GRN).
- **FR-002**: The Landed Cost allocation wizard must support multiple allocation methods: by Value (pro-rata), by Quantity, and by Weight/Volume.
- **FR-003**: The system must retrospectively recalculate the Weighted Average Cost (WAC) of the affected item lots when landed costs are allocated.
- **FR-004**: Recalculating the WAC for already issued quantities must adjust the Cost Ledger to balance the cost of goods sold (COGS) without altering physical stock counts.
- **FR-005**: All search, report, and dashboard queries must automatically apply a filter restricting records and stock levels to the logged-in user's assigned warehouse scope(s).
- **FR-006**: A user with no warehouse scope assignment must be restricted from viewing any inventory search results or reports.
- **FR-007**: The dashboard, inventory valuation cards, and cost columns in reports must dynamically display the currency label retrieved from the system's active base currency configuration.
- **FR-008**: The Admin Roles interface must display a read-only list of all system roles and their associated hardcoded permissions/capabilities.
- **FR-009**: The Admin interface must allow administrators to assign or update the role of any user, which immediately takes effect upon saving.
- **FR-010**: All database transactions for landed cost allocation and WAC recalculations must be executed under a `Serializable` isolation level and utilize appropriate row locking (`SELECT FOR UPDATE`) to prevent concurrent state drifts.
- **FR-011**: The system must enforce that a Landed Cost Voucher in `POSTED` status is strictly immutable and cannot be edited, voided, or deleted. All financial corrections must be performed using corrective offset vouchers.
- **FR-012**: When allocating a Landed Cost Voucher across multiple GRNs, the wizard must support cost distribution across all line items from the selected GRNs using the chosen allocation method (Value, Quantity, Weight, or Volume) as a consolidated pool.
- **FR-013**: When a Landed Cost Voucher is posted, the WAC recalculation and ledger adjustments must be queued and processed asynchronously in the background. The system must immediately transition the voucher to a 'PROCESSING' status, return a success response to the client, and notify the user when the recalculation is complete.
- **FR-014**: The warehouse scope filtering logic must automatically grant unrestricted access across all warehouses if the logged-in user possesses a global role (e.g., ADMIN, PROCUREMENT_DIR), bypassing physical `WarehouseScope` mapping records.
- **FR-015**: The `/admin/roles` and `PUT /admin/users/:id/role` endpoints, as well as the matching user-role management UI components, must be strictly restricted to users with the `ADMIN` role. Unauthorized requests must return a `403 Forbidden` error.

### Key Entities *(include if feature involves data)*

- **LandedCostVoucher**: Represents a financial document that aggregates additional costs (e.g., shipping, customs, handling fees) to be allocated to one or more Goods Received Notes. Attributes: voucherNumber, allocationMethod, totalAllocatedCost, status (DRAFT, PROCESSING, POSTED; fully immutable once posted), transactionDate.
- **LandedCostAllocationLine**: Represents the allocated cost portion assigned to a specific GRN line item. Attributes: grnLineId, allocatedCost, adjustedUnitCost.
- **WarehouseScope**: Represents the access boundaries for a user, mapping them to one or more warehouses. Attributes: userId, warehouseId, isPrimary.
- **SystemSetting**: Represents global configurations, including base currency and localization. Attributes: settingKey, settingValue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of landed cost allocations mathematically match the sum of allocated line costs and are correctly reflected in the WAC of the corresponding lots.
- **SC-002**: Users scoped to a specific warehouse see 0% data leakage from other warehouses in all searches and reporting outputs.
- **SC-003**: The dashboard and reports load currency-denominated data and dynamic currency symbols/labels in under 1 second.
- **SC-004**: System administrators can update a user's role and have the changes take effect in real-time, verifying permissions within 1 API handshake.

## Assumptions

- All cost recalculation operations run under high database isolation (`Serializable`) to prevent race conditions during bulk cost revaluations.
- User scopes are synchronized and validated at the application gate before any reporting or search logic executes.
- Statically defined roles are sufficient for current access control, and dynamic permissions editing is out of scope for Sprint 3.
- All monetary conversions for landed costs use exchange rates defined in the system's FX registry as of the transaction date.
