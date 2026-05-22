# Research: Workflow Engine Implementation Details

This document records key technical decisions, rationales, and alternatives considered for implementing Phase 4 (Workflow Engine) of the LogiRest system.

## 1. Database Schema Update: ApprovalEvent Fields

* **Decision**: Update `ApprovalEvent` model in `apps/api/prisma/schema.prisma` to include `stepNumber: Int`, `userRole: Role`, and `comments: String?` fields.
* **Rationale**: These fields are necessary to capture exact approval steps, the role used to perform the action, and optional audit comments.
* **Alternatives Considered**: 
  * Storing extra fields in a JSON column (rejected because it bypasses relational database constraints and type-safety of Prisma).
  * Creating a separate `ApprovalComment` table (rejected as it adds unnecessary database complexity and joins; keeping comments optional on the event record is simpler and sufficient).

## 2. Dynamic Guard Resolution (WorkflowStateGuard)

* **Decision**: Implement a single, generic `WorkflowStateGuard` that parses metadata set by a `@WorkflowAction()` decorator.
  * The decorator metadata format:
    ```typescript
    export interface WorkflowActionMetadata {
      docType: DocumentType;
      action: DocumentAction;
      modelName: 'purchaseRequest' | 'purchaseOrder' | 'goodsReceivedNote' | 'inventoryIssue' | 'transfer' | 'adjustment' | 'stocktakeSession' | 'kitchenRequest';
      idParam?: string; // defaults to 'id'
    }
    ```
  * The guard dynamically retrieves the document using:
    ```typescript
    const doc = await this.prisma[metadata.modelName].findUnique({
      where: { id: documentId }
    });
    ```
* **Rationale**: Using a single generic guard avoids creating 8 identical guards, satisfying the DRY principle. Specifying the `modelName` and `idParam` allows flexibility when route param names differ (e.g., `:id` vs `:prId`).
* **Alternatives Considered**:
  * Writing custom guards for each controller/document (rejected due to code duplication and high maintenance overhead).
  * Mapping `docType` string to Prisma model names inside the guard (rejected as hardcoded mappings are fragile and route metadata is cleaner).

## 3. Concurrency Deferral

* **Decision**: The `WorkflowStateGuard` will only validate status transition rules and role capabilities. It will NOT perform concurrency version checks. The concurrency version validation will be deferred to the database update transaction (optimistic locking).
* **Rationale**: Concurrency conflicts are best resolved during the database write transaction itself to prevent race conditions between validation and update.
* **Alternatives Considered**:
  * Validating the version inside the guard (rejected because a concurrent request could still pass the guard check and write afterwards, causing a race condition).

## 4. Audit Log Integration

* **Decision**: The guard and the action handlers will log all transition attempts (successful and failed) directly to the `AuditLog` database table.
  * Successful transitions: Log `beforeStateJson` and `afterStateJson` (document state before and after).
  * Failed transitions: Log the attempt, error message in `afterStateJson`, and target action in the action field.
* **Rationale**: Ensures a complete audit trail of all status mutations and access violations directly in the main database.
* **Alternatives Considered**:
  * Storing audit logs in standard file system logs (rejected because file logs can be tampered with or lost, violating the security audit requirement FR-007).
  * Using NestJS interceptors for audit logging (rejected because interceptors run post-guard; failed guard attempts wouldn't be caught. The guard or exception filters must handle failed transition logging).

## 5. Warehouse Operational Locks Checking

* **Decision**: The `WorkflowStateGuard` (or an auxiliary check in it) will identify if the document belongs to a warehouse that is currently locked. If the warehouse is locked, it will block transitions for inventory-affecting document types (GRN, Transfer, Adjustment, Stock Issue) while permitting PR/PO transitions.
* **Rationale**: Satisfies the edge case requirement to lock inventory movement while keeping procurement planning unlocked.
* **Alternatives Considered**:
  * Checking locks inside service methods (rejected because centralizing operational safety checks in the guard layer prevents execution leakage).
