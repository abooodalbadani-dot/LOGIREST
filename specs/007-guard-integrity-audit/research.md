# Research: Guard Integrity Audit

## Form Discovery Decision
- **Decision**: Use a combination of `grep` and manual component review to identify all screens using `useForm` or custom state-based data entry.
- **Rationale**: `grep` is highly effective for identifying `useForm` hook usage in `.tsx` files. Manual review is necessary for complex components that might use custom state or multiple nested forms.
- **Alternatives Considered**: 
  - Using a custom ESLint rule to enforce `UnsavedChangesGuard` (Too much overhead for a stabilization phase).
  - Runtime auditing (Difficult to trigger all flows).

## Navigation Interception Decision
- **Decision**: Leverage the existing `UnsavedChangesProvider` global listeners (`click`, `popstate`, `beforeunload`).
- **Rationale**: The current implementation is robust for Next.js App Router as it intercepts events at the `window` level, catching both standard `<Link>` clicks and browser-level navigation.
- **Alternatives Considered**: 
  - Overriding the `Link` component (Misses programmatic and browser navigation).
  - Using Next.js 15 experimental router hooks (Potentially unstable/subject to change).

## Dirty State Synchronization Decision
- **Decision**: Mandate the pattern `useUnsavedChangesGuard(form.formState.isDirty)`.
- **Rationale**: This ensures that the global dirty state is always in sync with the `react-hook-form` state.
- **Alternatives Considered**: 
  - Manual `registerDirty` calls (Error-prone).
  - Wrapping `useForm` (Too intrusive for existing codebase).

## Confirmation UX Decision
- **Decision**: Maintain the current "Discard Changes" vs "Stay on Page" two-button modal.
- **Rationale**: Matches clarified user preference (Option A) and minimizes friction for users intending to abandon changes.
- **Alternatives Considered**: 
  - Native `window.confirm` (Non-stylable, poor UX).
  - 3-button "Save/Discard/Cancel" dialog (High technical complexity).
