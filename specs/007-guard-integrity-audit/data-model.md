# Data Model: Guard Integrity Audit

## Dirty State Entity
This entity exists purely in the client-side React state managed by the `UnsavedChangesProvider`.

| Field | Type | Description |
|-------|------|-------------|
| `isDirty` | `boolean` | Global indicator if any active component has unsaved changes. |
| `pendingNavigation` | `object \| null` | Stores the target path and options if navigation was interrupted. |
| `isOpen` | `boolean` | Controls the visibility of the confirmation dialog. |

## Lifecycle / State Transitions

1. **Idle**: `isDirty: false`. Navigation is free.
2. **Editing**: `isDirty: true` (registered via `useUnsavedChangesGuard`).
3. **Interrupt**: User attempts navigation while `isDirty: true`. `pendingNavigation` is populated, `isOpen` becomes `true`.
4. **Resolution (Cancel)**: User clicks "Stay on Page". `isOpen` becomes `false`, `pendingNavigation` cleared.
5. **Resolution (Proceed)**: User clicks "Discard Changes". `isDirty` forced to `false`, `isOpen` becomes `false`, navigation executes to `pendingNavigation.href`.
6. **Success Reset**: Form submits successfully. `isDirty` forced to `false` (via `registerDirty(false)` or `reset()`).
