# Quickstart: Implementing Mutation Standards

This guide explains how to audit and refactor existing mutations to comply with the project's **Zero Tolerance** policy for race conditions and concurrency bugs.

## 1. Upgrade Form Schemas
Ensure the `version` field is part of your Zod schema and RHF `useForm` initialization.

```typescript
// types/master-data.ts
export const MyFormSchema = z.object({
  // ... existing fields
  version: z.number().optional(),
});

// Component.tsx
const { reset } = useForm<MyFormValues>({
  defaultValues: { ..., version: data.version }
});
```

## 2. Refactor to `mutateAsync`
Replace `.mutate()` with `await .mutateAsync()` inside your `onSubmit` handler.

```typescript
// Component.tsx
const onSubmit = handleSubmit(async (values) => {
  // Ensure the button shows loading state via mutation.isPending
  await mutation.mutateAsync(values);
  
  // SUCCESS-GATED REDIRECT
  // Only push after the promise resolves
  router.push('/target-path');
});
```

## 3. Verify Conflict Handling
To test your implementation:
1. Open two tabs for the same record.
2. Edit Tab A and Save.
3. Edit Tab B and Save.
4. Verify the **Conflict Dialog** appears and correctly detects the version mismatch.

## 4. Run Compliance Scripts
Before submitting a PR, run the automated compliance audit:
```powershell
# Detect un-awaited mutations or eager routing
python .specify/extensions/audit/scripts/mutation-audit.py
```
*(Note: Script will be implemented during Phase 3 execution)*
