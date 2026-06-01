# Research & Architectural Analysis: Landed Cost & Scoping (Sprint 3)

This document maps out the core architectural, transactional, and security decisions required to deliver the features in Sprint 3 safely.

---

## ⚖️ Decision Log & Rationales

### 1. Retrospective WAC Recalculation Boundaries
* **Decision**: Landed cost allocations and retrospectively altered Weighted Average Cost (WAC) calculations are restricted strictly to Goods Received Notes (GRN) within **open financial periods** (e.g., the current active month/quarter). Allocations to locked or closed fiscal periods are hard-blocked by the application API.
* **Rationale**: Opening historical ledgers from closed fiscal periods to recalculate item costs retrospectively violates financial audit standards, invalidates previously reported Cost of Goods Sold (COGS), and would require complex, high-risk lock acquisitions on highly nested database records.
* **Alternatives Considered**: 
  - *No limits (recalculate all historical data)*: Rejected. Creates severe concurrent deadlock risks on heavily transacted item lots and introduces massive compliance audit vulnerabilities.

### 2. Immutability of Posted Landed Cost Vouchers
* **Decision**: A `LandedCostVoucher` is fully immutable once transitioned to `POSTED` status. Editing, voiding, or deleting posted vouchers is strictly prohibited.
* **Rationale**: Reversing retrospective revaluations retrospectively is extremely high risk: subtracting cost basis from lots that have already been issued/moved introduces WAC drift. Erroneous postings must be corrected by issuing offsetting adjustment vouchers, creating a clean audit trail.
* **Alternatives Considered**: 
  - *Full Voiding Support*: Rejected. Re-recalculating costs backward on already shipped/issued quantities causes high risk of negative balances, financial cost drifts, and concurrent row-locking deadlocks.

### 3. Asynchronous Revaluation Execution Pattern
* **Decision**: Cost revaluation and ledger adjustments are processed asynchronously in the background via a NestJS BullMQ queue when a voucher is posted. The client receives an immediate `202 Accepted` status with a `PROCESSING` voucher state, and updates are tracked via status polling or WebSockets.
* **Rationale**: Serializable database transactions running complex cost calculations across thousands of historical entries will exceed standard 30-second gateway request timeouts. Moving this to a serialized background queue isolates database load, prevents lock contention on the main web request thread, and prevents HTTP gateways from terminating mid-transaction.
* **Alternatives Considered**: 
  - *Synchronous Execution*: Rejected. Heavy row locks on items and lots block other operational web requests, degrading responsiveness and risking gateway timeout failures.

### 4. Global Warehouse Scope Bypass
* **Decision**: Users holding administrative or central roles (e.g., `ADMIN`, `PROCUREMENT_DIR`) automatically bypass physical warehouse scoping filters, giving them global visibility.
* **Rationale**: Central operations managers, procurement officers, and system administrators require centralized aggregation across all warehouse nodes to manage inventory levels, execute bulk allocations, and audit balances. Requiring explicit mapping to every warehouse generates excessive administrative overhead and database redundancy.
* **Alternatives Considered**: 
  - *Explicit DB Mapping Only*: Rejected. Every new warehouse creation would require database scripts to associate all administrator and executive accounts manually, creating an operational bottleneck.

### 5. Role Management Authorization Constraints
* **Decision**: Access to role listings (`/admin/roles`) and role assignments (`PUT /admin/users/:id/role`) is restricted strictly to users with the static `ADMIN` role.
* **Rationale**: Managing access control parameters is a critical administrative function. Restricting access strictly to administrators prevents privilege escalation vectors where non-admin users could elevate their own roles or scope boundaries.
* **Alternatives Considered**: 
  - *HR and Admin Access*: Rejected. HR roles should not have full system admin rights on role capabilities by default.

---

## 🗃️ Cost Allocation Mathematics

During Landed Cost allocation, additional charges are distributed across target GRN line items using one of three formulas:

### A. Value Pro-rata (Default)
$$\text{Allocated Cost}_i = \text{Total Landed Cost} \times \left( \frac{\text{Line Item Value}_i}{\text{Total GRN Items Value}} \right)$$

### B. Quantity Pro-rata
$$\text{Allocated Cost}_i = \text{Total Landed Cost} \times \left( \frac{\text{Line Item Qty}_i}{\text{Total GRN Items Qty}} \right)$$

### C. Weight / Volume Pro-rata
$$\text{Allocated Cost}_i = \text{Total Landed Cost} \times \left( \frac{\text{Line Item Weight}_i}{\text{Total GRN Items Weight}} \right)$$

Once allocated, the **Adjusted Unit Cost** for GRN Line $i$ is calculated as:
$$\text{Adjusted Unit Cost}_i = \text{Original Unit Cost}_i + \frac{\text{Allocated Cost}_i}{\text{Received Qty}_i}$$

This adjusted cost basis is then dispatched to the background queue worker to update the affected Lot's WAC.
