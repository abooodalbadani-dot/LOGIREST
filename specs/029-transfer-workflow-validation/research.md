# Technical Research: Fix Transfer SHIP/RECEIVE Workflow Role Validation

## Centralized Transition Role Mapping Signature

### Decision
Use the correct, compiled type signature for `canPerformActionV2` imported from `@logirest/shared-types` instead of the pseudo-code signature listed in `engineering_tasks.md`.

*   **Audit Pseudo-code**: `canPerformActionV2(transfer.status, 'SHIP', userRole, { documentType: 'TRANSFER' })`
*   **Correct Call**: `canPerformActionV2('TRANSFER', transfer.status as DocumentStatus, 'SHIP', userRole)`

### Rationale
The shared library `packages/shared-types/src/workflow/document-engine.ts` defines the signature as:
```ts
export function canPerformActionV2(
  documentType: DocumentType,
  status: DocumentStatus,
  action: DocumentAction,
  role?: Role | string
): boolean
```
Altering this signature to match the pseudo-code would break extensive parts of the Next.js frontend and NestJS backend which rely on this core library function.

### Alternatives Considered
1.  **Overloading the signature**: Rejected. Adds unnecessary complexity to a critical, simple shared library.
2.  **Creating a custom helper wrapper**: Rejected. Directly using the standard API is cleaner and DRY.

---

## Security Audit Logging for Forbidden Actions

### Decision
When an unauthorized attempt is blocked, write a persistent record to the database `AuditLog` table using `prisma.auditLog.create()` and issue a standard application warning log via NestJS `Logger`.

### Rationale
Unauthorized actions on critical transfer transitions (SHIP/RECEIVE) represent serious operational anomalies. Persisting these failures ensures compatibility with standard security audit trails, while standard application warnings enable real-time detection by log aggregators.

### Alternatives Considered
1.  **Application log only**: Rejected. Application logs can be rotated, tampered with, or skipped, lacking the immutability/durability required for strict security auditing.
2.  **AuditLog entry only**: Rejected. Lacks real-time operational visibility for infrastructure monitoring tools.

---

## Warehouse Branch Scope Enforcement

### Decision
Strictly enforce user branch-scoping logic at the database level by comparing the user's active scoped warehouse branches (from their auth context/token) against the specific warehouse involved:
*   For a `SHIP` action: The user's scoped warehouse branch MUST include `transfer.fromWarehouseId`.
*   For a `RECEIVE` action: The user's scoped warehouse branch MUST include `transfer.toWarehouseId`.

### Rationale
Warehouse keepers are legally and operationally restricted to their physical branches. Allowing a keeper to ship from Warehouse A while they only manage Warehouse B bypasses physical chain-of-custody controls, presenting a major internal risk.

### Alternatives Considered
1.  **Global role permission check only**: Rejected. Violates the principle of least privilege, allowing any warehouse keeper to manipulate transfers globally across all branches.
