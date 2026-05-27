# Research Notes: Sprint 2 Completion

This document outlines key technical decisions, rationale, and alternatives considered for Sprint 2 Quality Hardening & Completion.

---

## 1. Goods Receipt Note (GRN) Live API Integration

* **Decision**: Full removal of the simulated `mockGoodsReceipts` and `setTimeout` delays in `useGoodsReceipts.ts`. Transition the purchasing feature directly to backend REST endpoints (`GET /grn`, `GET /grn/:id`, `POST /grn`, `POST /grn/:id/post`, `POST /grn/lines/update`) using the workspace `apiClient`.
* **Rationale**: Production readiness demands authentic data integration. The backend endpoints for Goods Receipt Note creation, detailing, line updating, and posting already exist in the NestJS backend, meaning the frontend mock was purely a placeholder.
* **Alternatives Considered**: 
  * *Bypassing mock with file-based mock databases*: Rejected, as it still doesn't verify correct client-server contracts and schema validations.
  * *Deferring to Sprint 3*: Rejected. Having mock-backed code in core procurement flows is a CRIT-0 blocker.

---

## 2. Goods Receipt Note (GRN) Void WAC Recalculation Strategy

* **Decision**: Sequentially replay all Cost Ledger entries for the target item and warehouse that occur *after* the voided GRN's posting timestamp to recalculate WAC downstream.
* **Rationale**: LogiRest relies on double-entry ledger auditing for financial compliance. When a GRN is voided, it negates an historical cost basis. If subsequent stock issue transactions or transfers occurred *after* that GRN, their cost basis was calculated using the now-voided rate. Replaying downstream cost entries sequentially corrects the WAC timeline accurately, avoiding silent gross margin or stock valuation drift.
* **Alternatives Considered**:
  * *Current Ratio Adjustment*: Formula `(Current Value - Voided Value) / (Current Qty - Voided Qty)`. Highly efficient but mathematically flawed if subsequent stock consumption has already occurred, as it does not correct the cost basis of the consumed stock.
  * *Full Historical Rebuild*: Recalculating from inception. Mathematically identical but computationally expensive; replaying only downstream entries from the voided GRN timestamp is far more optimal ($O(N)$ where $N$ is post-void events).

---

## 3. Expiry Alert Debounce Caching Duration

* **Decision**: 7-Day Redis debounce cache TTL. Once an `EXPIRY_WARNING` notification is sent for a specific lot, it is debounced in Redis for 7 days (or until the lot is consumed/removed).
* **Rationale**: The warning threshold is configured to alert when a lot is within 7 days of expiration. A 7-day debounce ensures that managers receive exactly one warning notification per warning period for a specific lot. This prevents daily duplicate email spam while ensuring a new warning is dispatched if a different lot of the same item approaches expiration.
* **Alternatives Considered**:
  * *24-Hour Debounce*: Rejected, as daily warning notifications for the same expiring lot create unnecessary noise.
  * *Permanent Debounce*: Rejected. If details of the lot change or if it is partially consumed and then restocked, managers should still be notified when the expiry is reached.

---

## 4. Stock Transfer Void Notification Policy

* **Decision**: Log void actions strictly in the central immutable `AuditLog` and `ApprovalEvent` tables, with no active UI notifications pushed to warehouse keepers.
* **Rationale**: Document voiding is an administrative override action performed only by `ADMIN` or `INV_MGR` roles. Since warehouse keepers (`Role.WH_KEEPER`) do not perform or manage voids, pushing bell notifications to them causes unnecessary notification noise. Standard immutable audit trails are sufficient for full tracking and compliance.
* **Alternatives Considered**:
  * *Notify Both Keepers*: Pushing in-system notifications informing them of the voided transfer. Rejected to prevent notification fatigue.

---

## 5. System Settings Update Validation

* **Decision**: NestJS `ValidationPipe` with `whitelist: true` configured globally, supported by a typed `UpdateSettingsDto` containing strict parameter constraints (`smtp_port` min/max, `smtp_encryption` in-list, `IsEmail`, etc.).
* **Rationale**: Secure-by-default administration demands server-side input sanitation. Silently stripping unwhitelisted properties prevents parameter injection, mass assignment, and denial of service attacks.
* **Alternatives Considered**:
  * *Forbid Non-Whitelisted (Strict 400)*: Rejected, as it can break minor client API additions. Silently stripping remains the standard NestJS monorepo convention.
