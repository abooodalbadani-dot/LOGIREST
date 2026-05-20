# Atomic Implementation Checklist

## [x] Phase 1: Excision & Cleaning of Custom Items
- [x] Remove `customItems`, `isCustomItemDialogOpen`, and `customItemNameQuery` from `TransferNewClient.tsx`
- [x] Remove `<CreateCustomItemDialog ... />` markup and its unused import from `TransferNewClient.tsx`
- [x] Strip the `onAddCustomItem` callback prop from `SmartCombobox` inside `TransferNewClient.tsx`
- [x] Filter out inactive items (`is_active !== false`) in `allItems` useMemo hook in `TransferNewClient.tsx`

## [x] Phase 2: Same-Warehouse Block Validation
- [x] Add check in `toWarehouseId` selection state handler. If selected `toWarehouseId === fromWarehouseId`, clear it and display warning toast.
- [x] Add check in `fromWarehouseId` selection state handler. If selected `fromWarehouseId === toWarehouseId`, clear the destination and display warning toast.
- [x] Disable scanner and item search dropdown if `fromWarehouseId` is not selected yet.

## [x] Phase 3: Scan-Time Cache Lookup & Item Valdiation
- [x] Ensure warehouse stock balances hook `useInventoryBalance` is loaded for the active `fromWarehouseId`.
- [x] Inside `handleAddItem(barcode)`, assert:
  - [x] If `fromWarehouseId` is missing, block with toast warning.
  - [x] If `item.is_active === false`, block with toast warning.
  - [x] If available balance for this item code is `<= 0`, block addition with toast warning.

## [x] Phase 4: Table-Level Quantity Validation & Submit Blocker
- [x] Inside the line item update handlers, keep track of line quantity errors.
- [x] If any line `quantity > qty_available`, set form error or custom validation error state.
- [x] Display an inline helper text showing available balance in red if quantity is exceeded.
- [x] Disable the submit and draft buttons if any validation errors are active.

## [x] Phase 5: Production Build Validation
- [x] Run `npx tsc --noEmit` in `apps/web` to confirm zero type errors.
- [x] Run `npm run lint` to verify clean style.
- [x] Test the transfer creation flow visually or manually to ensure smooth UX.
