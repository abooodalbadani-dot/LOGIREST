# Quickstart: Phase 6 Runtime Audit

## Environment Setup
Ensure the application is running in production mode for hydration checks:
```bash
npm run build
npm run start
```

## Running the Audit
1. **Hydration Check**: Open the browser console, navigate through all operational modules. Watch for `Warning: Expected server HTML...`.
2. **Key Check**: Run the audit script:
   ```bash
   python scratch/find_missing_keys.py
   ```
3. **Concurrency Simulation**:
   - Open Tab A and Tab B on the same item.
   - Update Tab A.
   - Attempt to update Tab B.
   - Confirm "Conflict Detected" dialog appears.

## AbortController Usage
When creating a mutation or query that needs cancellation:
```typescript
const controller = new AbortController();
const data = await apiClient.get('/some-path', schema, { signal: controller.signal });
// cleanup
return () => controller.abort();
```

## Audit Summary (May 2026)
- **US1 (Hydration & Keys)**: 100% Resolved. All `.map()` calls in operational components now have stable keys. Hydration mismatches eradicated in production build.
- **US2 (Concurrency)**: `ConflictDialog` integrated into all master-data forms and operational modules. `useSafeMutation` provides unified 409 handling.
- **US3 (Memory Safety)**: `AbortController` implemented in all master-data forms (`Supplier`, `Warehouse`, `Item`, `Category`, `UoM`, `Branch`, `Currency`, `Department`, `Barcode`, `FXRate`). Pending requests are cancelled on unmount.

## Status Check
To verify current stability, run:
```bash
python .agent/scripts/checklist.py .
```
*(Note: Ensure lint errors related to 'any' types are addressed in the next hardening phase as they don't impact runtime stability but impact CI compliance.)*
