# Quickstart: Implementing Unsaved Changes Guard

This guide explains how to properly protect a data entry form using the `UnsavedChangesGuard`.

## 1. Import the Hook
In your Client Component (e.g., `SupplierFormClient.tsx`):

```tsx
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes/useUnsavedChangesGuard';
```

## 2. Register Dirty State
Pass the form's `isDirty` state to the hook. This automatically syncs with the global navigation guard.

```tsx
const form = useForm({ ... });
const { router } = useUnsavedChangesGuard(form.formState.isDirty);
```

## 3. Use the Guarded Router
If you have programmatic navigation (e.g., a "Cancel" button or redirect after success), use the `router` returned by the hook.

```tsx
// This will trigger the guard if the form is dirty
const onCancel = () => {
  router.push('/master-data/suppliers');
};

// To explicitly bypass the guard (e.g., explicit Discard button)
const onDiscard = () => {
  router.push('/master-data/suppliers', { skipGuard: true });
};
```

## 4. Reset on Success
Ensure the dirty state is cleared after a successful submission so the user can navigate away.

```tsx
const mutation = useMutation({
  onSuccess: () => {
    form.reset(); // This resets isDirty to false
    router.push('/path');
  }
});
```

## 5. Verification Checklist
- [ ] Modifying a field and clicking a sidebar link triggers the dialog.
- [ ] Modifying a field and pressing Browser Back triggers the dialog.
- [ ] Closing the tab triggers the native browser dialog.
- [ ] Successful submission allows navigation without a dialog.
- [ ] Explicit "Cancel/Discard" button bypasses the guard (if `skipGuard: true` used).
