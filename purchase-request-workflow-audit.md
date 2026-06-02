# Purchase Request Workflow Audit

This document presents the exhaustive vertical tracing and verification results of the **Purchase Request (PR) Workflow** in the LogiRest system. The audit covers the entire vertical slice from the frontend UI components and hooks to the backend controllers, guards, services, and database models.

---

## 1. Trace Overview & Architecture Map

### A. Frontend Architecture Components
- **List Page**: [PRListClient.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/PRListClient.tsx)
- **Detail/View Page**: [PRViewer.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/PRViewer.tsx)
- **Form Page (Create/Edit)**: [purchase-request-form.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/components/purchase-request-form.tsx)
- **Approval Client Page**: [PRApprovalClient.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/approve/PRApprovalClient.tsx)
- **React Query Hooks**:
  - `usePRList`: [usePRList.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/usePRList.ts)
  - `usePR` (Detail): [usePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/usePR.ts)
  - `useCreatePR`: [useCreatePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useCreatePR.ts)
  - `useUpdatePR`: [useUpdatePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useUpdatePR.ts)
  - `useSubmitPR`: [useSubmitPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useSubmitPR.ts)
  - `useApprovePR`: [useApprovePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useApprovePR.ts)
  - `useRejectPR`: [useRejectPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useRejectPR.ts)
  - `useCancelPR`: [useCancelPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useCancelPR.ts)
  - `useDeletePR`: [useDeletePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useDeletePR.ts)
- **API Client**: [client.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/lib/api/client.ts) (handles automatic active scope header injection for `x-branch-id` and `x-warehouse-id`).

### B. Backend Architecture Components
- **Controller**: [purchase-requests.controller.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.controller.ts)
- **Service**: [purchase-requests.service.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.service.ts)
- **Guards / Interceptors**:
  - `WorkflowStateGuard`: [workflow-state.guard.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/guards/workflow-state.guard.ts)
  - `ScopeInterceptor`: [scope.interceptor.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/auth/interceptors/scope.interceptor.ts)
- **Workflow State Engine**: [workflow.service.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/workflow/workflow.service.ts) and shared rules in [document-engine.ts](file:///e:/Kitchen‑Store%20Inventory%20System/packages/shared-types/src/workflow/document-engine.ts)
- **Database Models**: `PurchaseRequest` and `PRLine` defined in [schema.prisma](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/prisma/schema.prisma)

---

## 2. Step-by-Step Workflow Validation

### Step 1: Create Purchase Request
- **Status**: ❌ Broken
- **Trace**:
  - **UI Page**: `/purchase-requests/new`
  - **UI Form**: `PurchaseRequestForm` inside [purchase-request-form.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/components/purchase-request-form.tsx)
  - **Hook**: `useCreatePR` inside [useCreatePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useCreatePR.ts)
  - **API Client**: `apiClient.post('/procurement/purchase-requests', ...)` in [client.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/lib/api/client.ts)
  - **Route**: `POST /procurement/purchase-requests`
  - **Controller**: `PurchaseRequestsController.create` in [purchase-requests.controller.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.controller.ts)
  - **Service**: `PurchaseRequestsService.create` in [purchase-requests.service.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.service.ts)
  - **Database**: `prisma.purchaseRequest.create`
- **Proof of Failure**:
  1. **Body Schema Mismatch**: The frontend hook payload is structured according to `CreatePRPayloadSchema`:
     ```typescript
     {
       department_id: string; // warehouse UUID
       expected_date: string;
       notes: string;
       lines: Array<{ item_id: string; req_qty: number; uom_id: string }>;
     }
     ```
     However, the backend NestJS controller expects the following body:
     ```typescript
     body: {
       branchId: string;
       warehouseId: string;
       lines: Array<{ itemId: string; quantity: number }>;
     }
     ```
  2. **Validation Failure (BOLA/Scope Guard)**: Since the frontend does not send `warehouseId` in the request body (sends `department_id` instead), `body.warehouseId` resolves to `undefined`. When the controller executes the scope check:
     `await this.scopeValidationService.validateWarehouse(userId, role, body.warehouseId);`
     `validateWarehouse` receives `undefined`, looking up a `null`/`undefined` scope mapping and immediately throwing `ForbiddenException: Access to this warehouse is not authorized.` for all non-ADMIN roles.
  3. **Database Null Constraints**: If an ADMIN role triggers the endpoint (bypassing the scope check), the sequence generator throws an error because `body.branchId` is `undefined` (throwing `Branch with ID undefined not found`). Even if this check were bypassed, trying to write lines with `itemId: undefined` and `quantity: undefined` fails Prisma's database-level non-null constraints.

---

### Step 2: Edit Purchase Request
- **Status**: ⚠️ Partial
- **Trace**:
  - **UI Page**: `/purchase-requests/[id]/edit`
  - **Client page**: `PRFormClient` in [PRFormClient.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/edit/PRFormClient.tsx)
  - **Form Component**: `PurchaseRequestForm` inside [purchase-request-form.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/components/purchase-request-form.tsx)
  - **Hook**: `useUpdatePR` inside [useUpdatePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useUpdatePR.ts)
  - **Route**: `PUT /procurement/purchase-requests/:id`
  - **Controller**: `PurchaseRequestsController.update` in [purchase-requests.controller.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.controller.ts)
  - **Service**: `PurchaseRequestsService.update` in [purchase-requests.service.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/api/src/modules/purchase-requests/purchase-requests.service.ts)
- **Proof of Failure / Limitations**:
  1. **Line Mapping Works**: The backend controller maps lines safely from the mismatched payload structure:
     ```typescript
     const lines = body.lines?.map((line: any) => ({
       itemId: line.itemId || line.item_id,
       quantity: line.quantity || line.req_qty,
     }));
     ```
     This allows line additions, updates, and removals to persist correctly.
  2. **Data Silent Loss**: The `PurchaseRequest` database schema lacks columns for `expected_date` or `notes`. The backend service `update` method only accepts and processes lines:
     ```typescript
     return tx.purchaseRequest.update({
       where: { id },
       data: {
         version: { increment: 1 },
         ...(body.lines && {
           lines: { create: body.lines.map(...) },
         }),
       }
     });
     ```
     Consequently, notes and expected dates edited in the form are completely discarded on save. Warehouse modifications (`department_id`) are also silently ignored by the endpoint.

---

### Step 3: Submit Purchase Request
- **Status**: ✅ Works
- **Trace**:
  - **UI Page**: `/purchase-requests/[id]`
  - **Hook**: `useSubmitPR` inside [useSubmitPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useSubmitPR.ts)
  - **Route**: `POST /procurement/purchase-requests/:id/submit`
  - **Controller**: `PurchaseRequestsController.submit`
  - **Service**: `PurchaseRequestsService.submit` -> `WorkflowService.executeTransition`
  - **Database**: Status transitioned to `SUBMITTED`, version incremented, `ApprovalEvent` created, `AuditLog` entry written, `NotificationLog` generated for `APPROVER` role, and outbox event `PR_SUBMITTED` dispatched.
- **Proof of Validation**:
  1. `WorkflowStateGuard` validates that the user role (`ADMIN`, `PROC_OFFICER`, `INV_MGR`) can submit.
  2. `WorkflowService.executeTransition` successfully runs the transition inside a database transaction (`prisma.$transaction`) with concurrency check:
     ```typescript
     if (clientVersion !== undefined && doc.version !== clientVersion) {
       await this.concurrencyService.handleConflict(...);
     }
     ```

---

### Step 4: Approve Purchase Request
- **Status**: ✅ Works
- **Trace**:
  - **UI Page**: `/purchase-requests/[id]/approve`
  - **Hook**: `useApprovePR` inside [useApprovePR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useApprovePR.ts)
  - **Route**: `POST /procurement/purchase-requests/:id/approve`
  - **Controller**: `PurchaseRequestsController.approve`
  - **Service**: `PurchaseRequestsService.approve` -> `WorkflowService.executeTransition`
  - **Database**: Status updated to `APPROVED`, version incremented, `ApprovalEvent` and `AuditLog` records inserted, `NotificationLog` generated for `PROC_OFFICER`, and outbox event `PR_APPROVED` written.
- **Proof of Validation**:
  1. `WorkflowStateGuard` confirms the user warehouse scope, and verifies status transition `SUBMITTED -> APPROVED` is legal.
  2. Role checks correctly allow `ADMIN`, `APPROVER`, and `INV_MGR` roles.

---

### Step 5: Reject Purchase Request
- **Status**: ✅ Works
- **Trace**:
  - **UI Page**: `/purchase-requests/[id]/approve`
  - **Hook**: `useRejectPR` inside [useRejectPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useRejectPR.ts)
  - **Route**: `POST /procurement/purchase-requests/:id/reject`
  - **Controller**: `PurchaseRequestsController.reject`
  - **Service**: `PurchaseRequestsService.reject` -> `WorkflowService.executeTransition`
  - **Database**: Status updated to `REJECTED`, version incremented, `ApprovalEvent` and `AuditLog` records inserted.
- **Proof of Validation**:
  1. Proves that mandatory comments are enforced on rejection:
     `if (action === 'REJECT' && (!comments || comments.trim() === '')) { throw new BadRequestException('Comments are mandatory for REJECT action'); }`
     This correctly fails with a validation error if the approver submits a rejection without a justification.

---

### Step 6: Cancel Purchase Request
- **Status**: ✅ Works
- **Trace**:
  - **UI Page**: `/purchase-requests/[id]`
  - **Hook**: `useCancelPR` inside [useCancelPR.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useCancelPR.ts)
  - **Route**: `POST /procurement/purchase-requests/:id/cancel`
  - **Controller**: `PurchaseRequestsController.cancel`
  - **Service**: `PurchaseRequestsService.cancel` -> `WorkflowService.executeTransition`
  - **Database**: Status transitioned to `CANCELLED`, version incremented, `ApprovalEvent` and `AuditLog` records written.
- **Proof of Validation**:
  1. Enabled for `DRAFT` status and authorized roles `['ADMIN', 'PROC_OFFICER', 'INV_MGR']`.

---

### Step 7: Convert to Purchase Order (PO)
- **Status**: ❌ Broken
- **Trace**:
  - **UI Page / Form Navigation**: User clicks the "Convert to PO" button on [purchase-request-form.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/components/purchase-request-form.tsx#L367).
  - **Hook / API Client**: No endpoint is triggered on this page. Instead, the UI redirects the user:
    `router.push('/purchase-orders/new?pr_id=' + pr.id)`
  - **Target Page**: [page.tsx](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/app/[locale]/(app)/(procurement)/purchase-orders/new/page.tsx) rendering `PurchaseOrderForm`.
  - **Form Hook**: `useCreatePO` in [useCreatePO.ts](file:///e:/Kitchen‑Store%20Inventory%20System/apps/web/src/features/purchasing/hooks/useCreatePO.ts)
  - **Route**: `POST /procurement/purchase-orders`
  - **Controller**: `PurchaseOrderController.create`
  - **Service**: `PurchaseOrderService.create`
- **Proof of Failure**:
  1. **Query Parameter Ignored**: The frontend `PurchaseOrderForm` does not read or parse the `pr_id` URL query parameter (lacks `useSearchParams` or query extraction logic). The form page initializes as an empty/blank form.
  2. **Manual Dialog Workaround**: The user has to click the import button to open the "Import from PR" dialog, wait for the `usePRList` query to fetch all approved PRs, and choose the PR. This populates the lines, but overrides their unit prices to `0`.
  3. **Body Schema Mismatch**: When the form is submitted, the frontend hook sends `CreatePOPayloadSchema` with:
     - `supplier_id` (backend expects `supplierId`)
     - `currency_code` (backend expects `currencyId`)
     - `pr_id` (backend expects `prId`)
     - `lines` containing `item_id`, `quantity`, `unit_price`, `uom_id` (backend expects `itemId`, `quantity`, `unitPrice` and rejects `uom_id`).
  4. **Class Validator Rejection**: Since there is no mapping in `PurchaseOrderController.create` or `po.service.ts`, NestJS `class-validator` immediately rejects the payload, returning an HTTP 400 Bad Request.
  5. **Endpoint Bypass**: The backend has a dedicated conversion endpoint `POST /procurement/purchase-requests/:id/convert-to-po` that automatically processes the PR and generates a DRAFT PO, but this endpoint is never called by the frontend.

---

## 3. Discrepancy Matrix

| Step | Status | Key Issues / Code Proof |
| :--- | :---: | :--- |
| **1. Create** | ❌ Broken | Frontend sends `department_id` and `item_id`/`req_qty`. Backend expects `warehouseId`, `branchId` and `itemId`/`quantity`. Resolves `warehouseId` to `undefined`, throwing `ForbiddenException` in `ScopeValidationService.validateWarehouse` for non-admins, and sequence generation failure for admins. |
| **2. Edit** | ⚠️ Partial | Correctly updates line items, but silently discards edits to `notes`, `expected_date`, or `department_id` (warehouse) because they do not exist in the DB model and are ignored by the backend service. |
| **3. Submit** | ✅ Works | Properly executes the `SUBMIT` transition on the DRAFT state. Enforces optimistic lock checks and triggers audit logs + outbox notifications correctly. |
| **4. Approve** | ✅ Works | Transition `SUBMITTED` -> `APPROVED` is fully verified, and role-based permissions are enforced through the guard. Generates notifications and logs. |
| **5. Reject** | ✅ Works | Enforces transition `SUBMITTED` -> `REJECTED`. Enforces mandatory rejection comments server-side. |
| **6. Cancel** | ✅ Works | Enforces transition `DRAFT` -> `CANCELLED`. |
| **7. Convert to PO** | ❌ Broken | Frontend `PurchaseOrderForm` ignores `pr_id` query parameter. Form submission payload keys (`supplier_id`, `currency_code`, `lines.item_id`, `lines.unit_price`) do not match backend `CreatePoDto` validations, causing class-validator HTTP 400 Bad Request. Dedicated backend convert-to-po endpoint is bypassed. |

---

## 4. Role & Capability Permission Anomalies

The role permissions defined in `transitionMapV2['pr']` (under `document-engine.ts`) do not match the capabilities defined in `ROLE_CAPABILITIES.pr` (under `role-capabilities.ts`):

- **Store Manager (`STORE_MGR`)**:
  - `ROLE_CAPABILITIES.pr` grants `submit`, `approve`, `reject`, and `cancel` capabilities to `STORE_MGR`.
  - However, `transitionMapV2['pr']` excludes `STORE_MGR` from all transitions (`SUBMIT`, `CANCEL`, `APPROVE`, `REJECT`).
  - Since the backend guard validates both files sequentially, a Store Manager attempting to submit, cancel, approve, or reject a purchase request will get an **Access Denied (ForbiddenException)**, resulting in a silent functional regression for that role.
