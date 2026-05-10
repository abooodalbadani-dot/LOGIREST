# Research: Mutation & Redirect Compliance Audit

## Decision: Standardize on `mutateAsync` with `await`

**Rationale**: Using `await mutateAsync()` within `async` event handlers (like `onSubmit`) provides the most reliable way to ensure the UI does not proceed until the server has confirmed the operation. It simplifies error handling via `try/catch` or React Query's built-in state, and prevents "optimistic" navigation bugs.

**Alternatives considered**: 
- Using `.mutate()` with `onSuccess`/`onError` callbacks. While valid, it often leads to "callback hell" when multiple operations must be sequenced, and it's easier to forget the `onError` handler, leading to silent failures where the user is redirected on success but left in a broken state on failure.

## Findings: Current Codebase Status

### 1. Mutation Pattern Audit
- **Status**: **Partial Compliance**
- **Issues**:
    - `apps/web/src/features/purchasing` and `apps/web/src/features/operations` largely use `mutateAsync`.
    - `apps/web/src/app/[locale]/(app)/master-data/*` components (e.g., `UoMFormClient.tsx`, `WarehouseFormClient.tsx`) primarily use `.mutate()` with only `onSuccess` handlers.
    - Many components lack `onError` handlers, meaning the "Save" button might remain in a loading state or the UI might not properly reflect a server error.

### 2. Redirect Strategy Audit
- **Status**: **Partial Compliance**
- **Issues**:
    - Adoption of `useUnsavedChangesGuard` is good, but routing is often triggered via `guardedRouter.push` inside `onSuccess`.
    - No instances of "eager routing" (routing immediately after `mutate()` without waiting) were found in the sampled critical paths, but the risk remains in less scrutinized modules.

### 3. Concurrency (Version) Payload Audit
- **Status**: **Low Compliance**
- **Issues**:
    - The `version` field is present in interfaces (e.g., `UoM`, `Item`) but MISSING from many form schemas (e.g., `UoMFormSchema`, `WarehouseFormSchema`).
    - This means update mutations in Master Data modules are currently bypassing the HTTP 409 Conflict layer because they don't send the version back to the server.

## Recommended Best Practices

1. **Mandatory `mutateAsync`**: Transition all form submissions to use `await mutateAsync()`.
2. **Explicit `version` handling**: Update all `*FormSchema` objects in `apps/web/src/types/master-data.ts` to include `version: z.number().optional()`.
3. **Button Loading States**: Ensure all "Save" buttons are bound to the `isPending` state of the mutation.
4. **Error Handling**: Use `toast.error` within `onError` or `catch` blocks to provide immediate user feedback on failure.

## Unknowns Resolved

- **UX Feedback**: Confirmed Option A (Local Loading States) is the project standard.
- **Conflict Dismissal**: Confirmed Option A (Stay & Disable) is the project standard.
- **Enforcement**: Confirmed Option B (CI Enforcement) will be implemented via custom scripts.
