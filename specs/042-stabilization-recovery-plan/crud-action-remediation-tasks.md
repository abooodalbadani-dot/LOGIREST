# CRUD & Action Audit — Remediation Tasks

**Source**: [`crud_action_audit.md`](../../../../brain/80d94cfc-4780-4ede-ba25-db125b968632/crud_action_audit.md)
**Created**: 2026-05-31

> These tasks address **UI/API mismatches, missing frontend connections, and workflow gaps** identified by the CRUD & Action audit.
> Scoped primarily to `apps/web` (frontend) and `apps/api` (backend) across 15 core entities.

---

## Priority Legend

- 🔴 **BLOCKER** — Must fix before production deployment
- 🟠 **HIGH** — Must fix before first user-facing test session
- 🟡 **MEDIUM** — Fix in the immediate follow-up sprint

---

## Phase CA-1 — Broken Actions (Blockers)

- [ ] CA-001 🔴 [P] Fix PO email endpoint path mismatch
- [ ] CA-002 🔴 [P] Fix Kitchen Request Reject → Cancel action mapping
- [ ] CA-003 🔴 [P] Add Kitchen Request `PUT` edit endpoint to backend
- [ ] CA-004 🟠 [P] Remove orphan PO `:id/post` endpoint
- [ ] CA-005 🟠 [P] Lock PR/PO edit form inputs for non-DRAFT documents
- [ ] CA-006 🟠 [P] Disable `track_lots` toggle when item has historical transactions

---

## Phase CA-2 — Missing UI Connections (High)

- [ ] CA-007 🟠 [P] Connect Delete buttons for PR, PO, GRN in frontend
- [ ] CA-008 🟠 [P] Connect Void buttons for GRN, Transfers, Issues, Adjustments
- [ ] CA-009 🟠 [P] Replace warehouse hard-delete with archive endpoint in frontend

---

## Task Specifications

---

### CA-001 — Fix PO Email Path Mismatch

**File**: `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-orders/[id]/PODetailClient.tsx`
**Line**: 58–67

**Problem**: The "Email PO" button sends a POST to `/procurement/pos/${id}/email`, but the backend mounts at `/procurement/purchase-orders/:id/email`. This always returns 404.

**Required change**: Fix the API call path in `PODetailClient.tsx`:

```typescript
// BEFORE:
await api.post(`/procurement/pos/${id}/email`);

// AFTER:
await api.post(`/procurement/purchase-orders/${id}/email`);
```

**Acceptance test**: Click "Email PO" on a purchase order detail page → HTTP request hits `/procurement/purchase-orders/:id/email` → returns 200 (or appropriate response from backend).

---

### CA-002 — Fix Kitchen Request Reject → Cancel Mapping

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/operations/kitchen-requests/[id]/KitchenRequestForm.tsx` (L180–196)
- `apps/web/src/app/[locale]/(dashboard)/operations/kitchen-requests/[id]/KitchenRequestViewer.tsx` (L66)

**Problem**: The frontend Reject button triggers action `REJECT`, but `kitchen-requests.service.ts` only has a `CANCEL` transition from `SUBMITTED` status. There is no `REJECT` workflow defined for kitchen requests. The button never renders or fails silently if it does.

**Required change**: Change the frontend to use `CANCEL` action for rejecting kitchen requests, and relabel the button/confirm dialog accordingly:

```typescript
// In KitchenRequestForm.tsx, change action from 'REJECT' to 'CANCEL':
const canReject = canPerformActionV2('kitchen_request', kr.status, 'CANCEL');
```

Update the reject dialog title and button text to use a "Cancel Request" label instead of "Reject".

Also update `KitchenRequestViewer.tsx` status display to map `CANCELLED` status correctly rather than looking for `rejected_by`.

**Acceptance test**: Open a `SUBMITTED` kitchen request → "Cancel Request" button is visible → clicking it with a reason calls `POST /kitchen-requests/:id/cancel` → status becomes `CANCELLED`.

---

### CA-003 — Add Kitchen Request PUT Edit Endpoint

**File**: `apps/api/src/modules/kitchen-requests/kitchen-requests.controller.ts`

**Problem**: The backend has no `PUT /kitchen-requests/:id` endpoint. The frontend edit form has no backend to call, making "Edit" on a kitchen request non-functional.

**Required change**: Add a `PUT` endpoint to the controller:

```typescript
@Put(':id')
async update(
  @Param('id') id: string,
  @Body() dto: UpdateKitchenRequestDto,
  @CurrentUser('id') userId: string,
  @CurrentUser('role') role: Role,
  @Req() req: Request,
) {
  // Only DRAFT kitchen requests can be edited
  const kr = await this.prisma.kitchenRequest.findUnique({ where: { id } });
  if (!kr) throw new NotFoundException('Kitchen request not found');
  if (kr.status !== 'DRAFT') {
    throw new BadRequestException('Only DRAFT kitchen requests can be edited.');
  }

  const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;
  return this.kitchenRequestsService.update(id, dto, userId, ipAddress);
}
```

Create the corresponding `update()` method in `kitchen-requests.service.ts` and `UpdateKitchenRequestDto` in the shared-types package.

**Acceptance test**: `PUT /kitchen-requests/:id` with valid payload on a DRAFT request → 200 with updated data. `PUT /kitchen-requests/:id` on a SUBMITTED request → 400.

---

### CA-004 — Remove Orphan PO `:id/post` Endpoint

**File**: `apps/api/src/modules/procurement/purchase-orders/po.controller.ts`

**Problem**: The controller exposes `POST /procurement/purchase-orders/:id/post` but POs cannot be posted according to the workflow engine. Calling it always returns 400 Bad Request, confusing clients and polluting the API surface.

**Required change**: Remove the `:id/post` endpoint from the controller:

```typescript
// Remove this entire method:
@Post(':id/post')
async post(@Param('id') id: string, ...) {
  // ... always throws BadRequestException
}
```

**Acceptance test**: `POST /procurement/purchase-orders/:id/post` → 404 Not Found.

---

### CA-005 — Lock PR/PO Edit Forms for Non-DRAFT Documents

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-requests/[id]/edit/page.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-orders/[id]/edit/page.tsx`

**Problem**: PR and PO edit forms render all inputs as editable regardless of document status. Users can type changes and hit Save, but the backend rejects mutations on non-DRAFT documents, causing silent failures with no feedback.

**Required change**: In both edit forms, compute an `isReadOnly` flag from document status and apply `disabled={isReadOnly}` to all form fields:

```typescript
// At the top of the component:
const isReadOnly = kr.status !== 'DRAFT';

// On each form field:
<Input disabled={isReadOnly} {...register('fieldName')} />
<Select disabled={isReadOnly} ... />
<Button type="submit" disabled={isReadOnly}>Save</Button>
```

Alternatively, use the `isDocumentLocked` helper already imported in some forms:
```typescript
const isReadOnly = isDocumentLocked('purchase_request', kr.status);
```

**Acceptance test**: Open an APPROVED purchase request edit page → all fields are disabled/greyed out → no Save button or Save is disabled. The user sees clearly that the document is locked.

---

### CA-006 — Disable `track_lots` Toggle for Items with History

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/master-data/items/ItemFormClient.tsx` (L65, L79, L151, L459–466)
- `apps/api/src/modules/master-data/items/items.controller.ts`

**Problem**: The `track_lots` toggle remains editable when editing an item that already has historical transactions (GRNs, stock movements, etc.). Changing this flag after data exists causes database constraint failures in `WarehouseItemLot` and stock ledger.

**Required change**:

1. **Backend**: Add an endpoint or field to report whether the item has transaction history:
```typescript
// In items.controller.ts findOne(), add:
const hasTransactions = await this.prisma.warehouseItemLot.count({
  where: { itemId: id, qtyOnHand: { gt: 0 } },
}) > 0;
// Include in response: { ...item, has_transactions: hasTransactions }
```

2. **Frontend**: In `ItemFormClient.tsx`, use the `has_transactions` flag:
```typescript
// When creating the form for an existing item:
const isEditWithHistory = !!item && item.has_transactions;

// On the track_lots switch:
<Switch
  disabled={isEditWithHistory}
  checked={watch('track_lots')}
  onCheckedChange={(v) => setValue('track_lots', v)}
/>
// Add a tooltip when disabled:
<Tooltip content="Cannot change lot tracking after transactions exist." />
```

**Acceptance test**: Open edit for an item that has GRN history → `track_lots` toggle is disabled with a tooltip. Open edit for a newly created item with no history → toggle is editable.

---

### CA-007 — Connect Delete Buttons for PR, PO, GRN

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-requests/[id]/PRDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-orders/[id]/PODetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/goods-received/[id]/GRNDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-requests/PRListClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/purchase-orders/POListClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/procurement/goods-received/GRNListClient.tsx`

**Problem**: Backend `DELETE` endpoints exist for PR, PO, and GRN, but no Delete buttons are connected in the frontend detail or list views. Users cannot delete draft documents.

**Required change**: Add Delete button to the detail page action bar and list page row actions. Only show for `DRAFT` status documents:

```typescript
// In the detail action bar:
{isDraft && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delete</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete this document?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. Only draft documents can be deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

**Acceptance test**: View a DRAFT purchase request detail page → Delete button is visible → clicking it with confirmation sends `DELETE /procurement/purchase-requests/:id` → document is removed from list view.

---

### CA-008 — Connect Void Buttons for GRN, Transfers, Issues, Adjustments

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/procurement/goods-received/[id]/GRNDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/operations/transfers/[id]/TransferDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/operations/issues/[id]/IssueDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/operations/adjustments/[id]/AdjustmentDetailClient.tsx`

**Problem**: Backend `VoidService` implementations exist for GRNs (`GrnVoidService`), Transfers (`TransferVoidService`), Issues (`IssueVoidService`), and Adjustments (`AdjustmentVoidService`), but no Void buttons exist in the frontend UI.

**Required change**: Add a "Void" button on the detail page for POSTED documents. Only shown when `status === 'POSTED'`:

```typescript
{status === 'POSTED' && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Void</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Void this document?</AlertDialogTitle>
        <AlertDialogDescription>
          This will reverse all ledger entries. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleVoid}>Void</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

The API call depends on the entity type:
- GRN: `POST /procurement/grns/:id/void`
- Transfers: `POST /operations/transfers/:id/void`
- Issues: `POST /operations/issues/:id/void`
- Adjustments: `POST /operations/adjustments/:id/void`

**Acceptance test**: View a POSTED GRN → Void button is visible → clicking it with confirmation calls the void endpoint → status changes to `VOIDED` and stock ledger entries are reversed.

---

### CA-009 — Replace Warehouse Hard-Delete with Archive

**Files**:
- `apps/web/src/app/[locale]/(dashboard)/master-data/warehouses/WarehouseDetailClient.tsx`
- `apps/web/src/app/[locale]/(dashboard)/master-data/warehouses/WarehouseListClient.tsx`

**Problem**: The frontend Delete button for warehouses calls `DELETE /warehouses/:id` which performs a hard database delete without verifying inventory levels. The backend already has a safe `POST /warehouses/:id/archive` endpoint that checks `qtyOnHand === 0` before archiving, but this endpoint is disconnected from the UI.

**Required change**: Replace the delete action with an archive action in the frontend:

```typescript
// In WarehouseDetailClient.tsx, relabel and redirect:
const handleArchive = async () => {
  await api.post(`/warehouses/${warehouseId}/archive`);
  // Toast success, navigate away
};

// UI:
<Button
  variant="destructive"
  disabled={hasStock}
  onClick={handleArchive}
  title={hasStock ? 'Cannot archive: warehouse has stock' : 'Archive this warehouse'}
>
  Archive
</Button>
```

If the frontend also has a delete confirmation dialog, relabel it from "Delete" to "Archive" and update the description.

**Acceptance test**: Open a warehouse with no stock → "Archive" button is enabled → clicking it calls `POST /warehouses/:id/archive` → warehouse status changes to `ARCHIVED`. Warehouse with stock → button is disabled with tooltip.

---

## Execution Order & Parallelism

```
Phase CA-1 (broken actions) → Phase CA-2 (missing connections)
```

Within Phase CA-1:
- **CA-001** (single path fix) — independent
- **CA-002** (frontend action string) — independent
- **CA-003** (new backend endpoint) — independent
- **CA-004** (remove endpoint) — independent
- **CA-005** (form locking) — independent
- **CA-006** (backend + frontend) — sequential within task

Within Phase CA-2:
- **CA-007, CA-008, CA-009** — all independent, can run in parallel

All phases are independent of `remediation-tasks.md` (R001–R015) and `edge-case-remediation-tasks.md` (EC-001–EC-008).

---

## Final Verification

1. `npm run typecheck --filter=api` — zero errors
2. `npm run typecheck --filter=web` — zero errors
3. `npm run lint` — zero errors
4. Manual: Navigate to PO detail → click "Email PO" → no 404
5. Manual: Kitchen request SUBMITTED → Cancel button visible and functional
6. Manual: DRAFT PR/PO → inputs editable; APPROVED PR/PO → inputs locked
7. Manual: POSTED GRN → Void button visible; DRAFT GRN → Delete button visible
8. Manual: Warehouse with stock → Archive button disabled with tooltip
9. Manual: `POST /procurement/purchase-orders/:id/post` → 404
