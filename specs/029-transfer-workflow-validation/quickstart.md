# Quickstart & Developer Guide: Fix Transfer SHIP/RECEIVE Workflow Role Validation

## Setup & Code Guidelines

This feature enhances security and segment of duties for transfer shipping and receiving actions. 

### Centralized Role Validation Check
The method `canPerformActionV2` is imported from `@logirest/shared-types`:
```ts
import { canPerformActionV2 } from '@logirest/shared-types';
```
It is called inside the service layer as:
```ts
const canShip = canPerformActionV2('TRANSFER', transfer.status as DocumentStatus, 'SHIP', userRole);
```

### Warehouse Branch Scope Validation
The user's branch scope permissions are queried directly inside the operational service database transaction `tx`:
```ts
const userScope = await tx.userWarehouseScope.findUnique({
  where: {
    userId_warehouseId: {
      userId,
      warehouseId: transfer.fromWarehouseId,
    },
  },
});
if (!userScope && userRole !== 'ADMIN') {
  throw new ForbiddenException('User is not authorized for the origin warehouse branch');
}
```

---

## Technical Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / Keeper
    participant API as NestJS API Gateway
    participant TS as TransferPostService
    participant DB as PostgreSQL (Prisma)
    
    User->>API: POST /operations/transfers/:id/ship (Headers: x-warehouse-id, x-branch-id)
    API->>API: Verify activeScope Interceptor
    API->>API: WorkflowStateGuard checks global capabilities
    API->>TS: ship(transferId, userId, role)
    TS->>DB: Open Transaction
    TS->>DB: Fetch transfer details (fromWarehouseId, status)
    
    rect rgb(240, 240, 240)
        note over TS, DB: Zero-Trust Security Gates
        TS->>TS: canPerformActionV2('TRANSFER', status, 'SHIP', role)
        TS->>DB: Query UserWarehouseScope (userId, fromWarehouseId)
        TS->>TS: Validate Lifecycle Status == 'DRAFT'
    end
    
    alt Unauthorized Attempt
        TS->>DB: Abort/Rollback Transaction
        TS->>DB: Write persistent AuditLog record
        TS->>TS: Logger.warn('Unauthorized attempt blocked')
        TS-->>User: Throw 403 Forbidden
    else Authorized Request
        TS->>DB: Progressive Lot Allocation (FEFO)
        TS->>DB: Insert StockLedger negative movement
        TS->>DB: Update status to 'IN_TRANSIT' & increment version
        TS->>DB: Write success AuditLog & ApprovalEvent
        TS->>DB: Commit Transaction
        TS-->>User: Return 200 OK (updatedTransfer)
    end
```

---

## Verifying with Automated Tests

Run the backend test suite:
```bash
# Run unit and E2E tests for the operations modules
npm run test --filter=api
```
To run the specific workflow roles E2E test suite:
```bash
npx jest apps/api/test/workflow-roles.e2e-spec.ts
```
