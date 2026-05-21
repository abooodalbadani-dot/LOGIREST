# Data Model Design: Shared Package Setup & Scaffolding

This document describes the design of shared data structures, schemas, and state transition maps that will reside in `@logirest/shared-types`.

## 1. Document Payload Validation Schemas (Zod definitions)

Consuming applications (`apps/web` and `apps/api`) import these schemas to enforce structural validation. All inventory document updates share a base set of fields, with specific schema validation overrides for each document type.

### Base Document Schema

| Field Name | Type | Validation Rule | Description |
|---|---|---|---|
| `id` | `string` | UUIDv4 | Unique identifier for the document |
| `documentNumber` | `string` | Regex: `/^[A-Z]{2,4}-\d{6,}$/` | Human-readable unique serial number |
| `status` | `string` | Enum of status keys | Current state in lifecycle |
| `version` | `number` | Minimum: `1` | Optimistic concurrency control version |
| `createdBy` | `string` | UUIDv4 | Author user ID |
| `createdAt` | `string` | ISO8601 DateTime | Record creation time |
| `updatedAt` | `string` | ISO8601 DateTime | Record update time |

### Document Types & Validation Rules

*   **Purchase Request (PR)**
    *   `warehouseId` (UUID, required): Origin requesting warehouse.
    *   `items` (Array, min length 1): List of requested inventory items and quantities.
*   **Purchase Order (PO)**
    *   `vendorId` (UUID, required): Selected supplier.
    *   `purchaseRequestId` (UUID, optional): Associated request.
*   **Goods Received Note (GRN)**
    *   `purchaseOrderId` (UUID, required): Reference order.
    *   `receivedItems` (Array): Quantities received, batch details, and expiry dates.
*   **Inventory Issues / Transfers / Adjustments / Stocktakes**
    *   Type-specific fields (e.g. source/destination warehouse IDs, lot IDs, serial numbers, audit reasons).

---

## 2. Shared Workflow State Map

LogiRest enforces document progression via state transition maps. These maps determine:
1. Valid transitions (e.g., a `DRAFT` can transition to `SUBMITTED`, but a `POSTED` document is immutable).
2. The user roles authorized to trigger a specific transition.

### State Transition Schema Definition

```typescript
export interface StateTransition {
  from: string;
  to: string;
  authorizedRoles: string[];
  requiresReason?: boolean;
}

export interface WorkflowMap {
  documentType: string;
  states: string[];
  transitions: StateTransition[];
}
```

### Transition Matrix Template

```typescript
export const transitionMapV2: Record<string, WorkflowMap> = {
  PURCHASE_REQUEST: {
    documentType: 'PURCHASE_REQUEST',
    states: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
    transitions: [
      { from: 'DRAFT', to: 'SUBMITTED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
      { from: 'SUBMITTED', to: 'APPROVED', authorizedRoles: ['MANAGER', 'ADMIN'] },
      { from: 'SUBMITTED', to: 'REJECTED', authorizedRoles: ['MANAGER', 'ADMIN'], requiresReason: true },
      { from: 'DRAFT', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] },
      { from: 'SUBMITTED', to: 'CANCELLED', authorizedRoles: ['REQUESTER', 'MANAGER'] }
    ]
  }
  // GRN, Stocktake, and other workflow mappings will be appended following this schema.
};
```
