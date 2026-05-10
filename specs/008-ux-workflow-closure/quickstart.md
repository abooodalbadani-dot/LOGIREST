# Quickstart: UX Completeness & Workflow Closure

## Audit & Discovery

1. **Find all list pages missing "Create" buttons**:
   ```powershell
   Get-ChildItem -Path "apps/web/src/app" -Recurse -Filter "page.tsx" | Select-String "List"
   ```

2. **Find all delete mutations**:
   ```powershell
   rg "delete.*\.mutate" apps/web/src
   ```

## Development Flow

### 1. Implement `DocumentLock`
- Create `apps/web/src/components/shared/DocumentLock.tsx`.
- Add logic to check `status` prop and render a banner + disable context.

### 2. Standardize Confirmation
- Create a reusable hook `useConfirmAction` that wraps `shadcn/ui` AlertDialog.
- Wrap critical deletions in this hook.

### 3. Header Action Update
- Ensure page layouts in `apps/web/src/app/[locale]/(app)` support a `headerActions` slot.
- Populate the slot with "Create" buttons on all list pages.

## Verification

- Navigate to an Approved stocktake: Verify lock icon + disabled inputs.
- Click "Delete" on a supplier: Verify confirmation dialog appears.
- Visit "Categories" list: Verify "Create Category" is in the top-right.
