# Research: UX Completeness & Workflow Closure

## Decisions

- **Decision: Standard Confirmation Pattern**
  - **Rationale**: We will use a standard `AlertDialog` from shadcn/ui to implement the confirmation pattern. It provides the necessary accessibility and destructive action semantics.
  - **Alternatives Considered**: Custom modal (rejected due to maintenance overhead); browser `confirm()` (rejected for branding and i18n reasons).

- **Decision: DocumentLock Implementation**
  - **Rationale**: We will create a `DocumentLockProvider` or a `useDocumentLock` hook that scans for terminal states (Approved/Closed) and provides a `LockedBanner` component. It will also expose a `isLocked` boolean to disable inputs.
  - **Alternatives Considered**: CSS-only overlay (rejected as it prevents selecting/copying text).

- **Decision: Header Action Pattern**
  - **Rationale**: Standardizing on the page header (top-right) for the "Create" button ensures consistency across all modules (Inventory, Procurement, etc.).
  - **Alternatives Considered**: In-table buttons (rejected as they depend on the table state/density).

## Component Audit

### Missing/Needs Implementation:
- [ ] `DocumentLock` Banner component.
- [ ] Centralized `ConfirmationDialog` utility for mutations.
- [ ] Audit of `apps/web/src/app` to identify all list pages missing "Create" buttons.

## Best Practices
- **Accessibility**: Confirmation dialogs must use ARIA `alertdialog` role.
- **RTL**: Lucide icons like `Trash2` or `Plus` are usually direction-neutral, but chevrons/arrows must be mirrored.
- **i18n**: Use namespaces like `common.actions.confirm` for reusable dialog text.
