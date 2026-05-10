# Data Model: Mutation & Concurrency Enhancements

## Entity Extensions: Versioning Support

To support the HTTP 409 Conflict Resolution layer, all "Form" schemas must be updated to include the `version` field. This ensures that the optimistic UI state correctly tracks the base version of the data being edited.

### Modified Schemas (`apps/web/src/types/master-data.ts`)

| Schema | Added/Modified Fields | Rationale |
|--------|-----------------------|-----------|
| `BranchFormSchema` | `version: z.number().optional()` | Support concurrency in Branch updates |
| `WarehouseFormSchema` | `version: z.number().optional()` | Support concurrency in Warehouse updates |
| `DepartmentFormSchema` | `version: z.number().optional()` | Support concurrency in Department updates |
| `UoMFormSchema` | `version: z.number().optional()` | Support concurrency in UoM updates |
| `CategoryFormSchema` | `version: z.number().optional()` | Support concurrency in Category updates |
| `SupplierFormSchema` | `version: z.number().optional()` | Support concurrency in Supplier updates |
| `CurrencyFormSchema` | `version: z.number().optional()` | Support concurrency in Currency updates |
| `FXRateFormSchema` | `version: z.number().optional()` | Support concurrency in FX Rate updates |
| `BarcodeFormSchema` | `version: z.number().optional()` | Support concurrency in Barcode updates |

## Interface Contracts: Mutation Hooks

All mutation hooks (e.g., `useUpdateUoM`) must ensure the `version` field is passed through to the `apiClient`.

### Pattern: Standardized `mutateAsync`

```typescript
// BEFORE (example in UoMFormClient.tsx)
const onSubmit = handleSubmit((values) => {
  update.mutate({ id, values }, {
    onSuccess: () => {
      guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
    }
  });
});

// AFTER (Unified Pattern)
const onSubmit = handleSubmit(async (values) => {
  try {
    await update.mutateAsync({ id, values });
    guardedRouter.push('/master-data/units-of-measure', { skipGuard: true });
  } catch (error) {
    // Error handled by global interceptor or local toast.error
  }
});
```

## State Transitions: Conflict Handling

1. **Detection**: `apiClient` receives HTTP 409 from server.
2. **Interception**: Global `ConflictInterceptor` catches 409 and opens `ConflictDialog`.
3. **Resolution (Reload)**: User selects "Reload". UI re-fetches data, `isDirty` remains (if applicable), but `version` is updated.
4. **Resolution (Retry)**: User selects "Retry". UI re-submits with latest fetched version.
5. **Dismissal**: User closes dialog. Form remains open, `isSaving` ends, but "Save" button remains disabled (via `FR-007`).
