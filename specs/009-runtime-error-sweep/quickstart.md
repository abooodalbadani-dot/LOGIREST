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
