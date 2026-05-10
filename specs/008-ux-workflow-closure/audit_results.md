# Audit Results: UX Workflow Closure

## List Pages Audit (T001)
Goal: Identify list pages lacking standardized "Create" buttons or using non-premium styling.

| Page | Status | Action Needed |
|------|--------|---------------|
| `master-data/items` | ✅ | Verified |
| `master-data/suppliers` | ✅ | Verified |
| `master-data/warehouses` | ✅ | Verified |
| `master-data/branches` | ✅ | Verified |
| `master-data/departments` | ✅ | Verified |
| `master-data/units-of-measure` | ✅ | Verified |
| `master-data/categories` | ❌ | Check Styling |
| `master-data/currencies` | ❌ | Check Styling |
| `master-data/fx-rates` | ❌ | Check Styling |
| `master-data/barcodes` | ❌ | Check Styling |
| `purchase-orders` | ✅ | Verified |
| `purchase-requests` | ✅ | Verified (Premium Cyan) |
| `goods-received` | ❌ | Fix button (Currently rounded-md, bg-cyan-600) |
| `stocktake` | ✅ | Verified |
| `issues` | ❌ | Fix button (Currently rounded-md, bg-surface-container-low) |
| `admin/users` | ❌ | Fix button (Currently rounded-sm, bg-cyan-600) |
| `admin/roles` | ❌ | Fix button (Currently rounded-sm, bg-surface-container-high) |

## Mutation Audit (T002)
Goal: Identify `delete`, `reject`, `cancel`, `void` mutations requiring confirmation.

| Mutation | Component/Hook | Confirm Pattern |
|----------|----------------|-----------------|
| Delete Item | `useDeleteItem` | ✅ Integrated |
| Delete Supplier | `useDeleteSupplier` | ✅ Integrated |
| Delete Warehouse | `useDeleteWarehouse` | ✅ Integrated |
| Delete Branch | `useDeleteBranch` | ✅ Integrated |
| Delete Department | `useDeleteDepartment` | ✅ Integrated |
| Delete UoM | `useDeleteUoM` | ✅ Integrated |
| Reject PR | `useRejectPR` | ❌ Needed |
| Reject PO | `useRejectPO` | ❌ Needed |
| Reject Adjustment | `useRejectAdjustment` | ❌ Needed |
| Cancel PO | `useCancelPO` | ❌ Needed (Investigate hook) |
| Delete GRN | `useDeleteGRN` | ❌ Needed (Investigate hook) |
| Void Movement | `useVoidMovement` | ❌ Needed (Investigate hook) |
| Cancel Stocktake | `useCancelStocktake` | ❌ Needed (Investigate hook) |


## Dead-end Workflows (T024)
Goal: Identify pages where a user might get "stuck" (e.g., no back button, broken navigation).

- [ ] Check `scan-mode` exit paths.
- [ ] Check `import` wizard exit paths.
- [ ] Verify `FormFooter` coverage on all detail pages.
