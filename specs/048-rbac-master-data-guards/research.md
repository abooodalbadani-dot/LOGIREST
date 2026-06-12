# Research and Key Decisions: RBAC Master-Data Controller Guards

This document outlines the design decisions and architectural trade-offs resolved during the planning phase of the RBAC Master-Data Controller Guards feature.

## 1. VIEWER Role Read Access
* **Decision**: Grant `VIEWER` role read access (`GET`) to all master-data endpoints, but deny mutating operations.
* **Rationale**: The `VIEWER` role is intended for read-only audit and analysis. Completely blocking access to master data would prevent viewers from loading reference dropdowns and lists in tables.
* **Alternatives Considered**: Completely blocking `VIEWER` access. Rejected because it breaks read-only UI workflows.

## 2. APPROVER Role Financial read access
* **Decision**: Grant `APPROVER` role read access to master-data endpoints and FX rates (`GET`), but deny mutating operations.
* **Rationale**: Approvers evaluate cost-sensitive procurement documents (e.g., Purchase Orders). They require access to FX rates to calculate valuations and verify exchange differences before approval, but they must not be allowed to define or update rates.
* **Alternatives Considered**: Keeping `APPROVER` excluded from FX rates. Rejected because it would leave them blind to foreign currency conversions in PO approvals.

## 3. FX Rate Write Permissions
* **Decision**: Write access to FX rates is restricted strictly to `ADMIN`, `GM`, and `PROC_MGR`.
* **Rationale**: FX rates are critical financial variables. Allowing lower management (like `STORE_MGR`) to modify these rates could corrupt cost reports. Store managers only need to consume this data, not write it.
* **Alternatives Considered**: Adding `STORE_MGR` to the write allowlist. Rejected to preserve financial data integrity.

## 4. Structured Warning Logs on Guard Denials
* **Decision**: Log a `WARN` message on every 403 response inside `RolesGuard` containing requesting role, method, path, and timestamp, with absolutely no PII (no usernames, emails, or IPs).
* **Rationale**: Provides clear audit trails for potential privilege escalation or broken links while remaining fully compliant with data privacy/PII standards.
* **Alternatives Considered**: Logging request body / user identity. Rejected due to PII compliance risks.

## 5. Atomic Deployment Strategy
* **Decision**: Deploy all 7 changes (TASK-01 to TASK-07) together in a single atomic release.
* **Rationale**: A partially secured master-data layer exposes holes that could be exploited. An atomic deploy ensures a unified and consistent security posture.
* **Alternatives Considered**: Incremental deployment per controller. Rejected due to high vulnerability window.
