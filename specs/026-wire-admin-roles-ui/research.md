# Research & Decision Log: Wire Admin Roles UI to Real Backend API

This document details the architectural research and tech design decisions for **TASK-001**.

## Decisions Summary

### 1. Master Source of Truth for Role Metadata

- **Decision**: Define a static `ROLE_METADATA` map within `packages/shared-types` (specifically under `contracts/role-capabilities.ts` or a new file in contracts).
- **Rationale**: Keeps role display names and descriptions completely DRY across frontend client rendering and backend validation endpoints. It avoids unnecessary database lookups, simplifies localization in the future, and is extremely maintainable.
- **Alternatives Considered**: 
  - *Database-driven dynamic configuration (Option C)*: Rejected because the system's operational roles are statically bound by the security authentication guards and Prisma schemas. Introducing database tables would add zero-value complexity.
  - *Hardcoding in NestJS local service (Option B)*: Rejected as it duplicates display details that the frontend may need directly, violating strict DRY axioms.

### 2. User Aggregate Query Strategy

- **Decision**: Perform database grouping with Prisma's `groupBy`:
  ```typescript
  const userCounts = await this.prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
    where: { isActive: true },
  });
  ```
  Merge this with a static list of all roles in `shared-types` so that even roles with `0` active users are returned with userCount `0` rather than omitted from the list.
- **Rationale**: Grouping is highly performant and aggregates counts on the database side. Pre-merging with the complete `Role` enum list guarantees edge-case stability (empty roles).
- **Alternatives Considered**: 
  - *Fetching all active users and counting in memory*: Rejected because it is O(N) memory scaling and is highly inefficient for large user lists in enterprise environments.

### 3. Read-Only Permissions Display

- **Decision**: Expose the static capability matrix directly in the `/admin/roles` frontend UI by calling the static `ROLE_CAPABILITIES` dictionary imported from `@logirest/shared-types`.
- **Rationale**: Eliminates dynamic permissions database drift and prevents security vulnerabilities from dynamic roles tamper. Under the Active Recovery phase, keeping authorization code-managed enforces zero-trust architecture. A visual banner tells users that permissions are statically code-managed.

---

## Technical Mappings

### Role Metadata Static Dictionary

Add to `packages/shared-types/src/contracts/role-capabilities.ts` (or a dedicated file re-exported by `index.ts`):

```typescript
export interface RoleDescriptor {
  id: UserRole;
  displayName: string;
  description: string;
  userCount: number;
}

export const ROLE_METADATA: Record<UserRole, { displayName: string; description: string }> = {
  ADMIN: { displayName: 'Administrator', description: 'Full system access with immutable security protocols' },
  GM: { displayName: 'General Manager', description: 'Cross-branch operational visibility and system oversight' },
  INV_MGR: { displayName: 'Inventory Manager', description: 'Manages stock levels, adjustments and stocktake workflows' },
  WH_KEEPER: { displayName: 'Warehouse Keeper', description: 'Operational execution of transfers and goods receiving' },
  PROC_OFFICER: { displayName: 'Procurement Officer', description: 'Handles purchase requests and order cycles' },
  APPROVER: { displayName: 'Executive Approver', description: 'Strategic approval authority for procurement and financial documents' },
  AUDITOR: { displayName: 'System Auditor', description: 'Read-only access to all modules for compliance tracking' },
  VIEWER: { displayName: 'System Viewer', description: 'Read-only access to basic dashboards and operational modules' },
  KITCHEN_CHIEF: { displayName: 'Kitchen Chief', description: 'Manages kitchen-level requests and direct consumption issues' },
  STORE_MGR: { displayName: 'Store Manager', description: 'Branch-level operational management and cost analysis' },
};
```
