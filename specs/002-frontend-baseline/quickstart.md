# Quickstart

**Feature**: 002-frontend-baseline

## Generating the Baseline

To generate a new baseline (only when approved):
1. Ensure your git working tree is clean.
2. Run the baseline generation script:
   ```bash
   ./scripts/baseline/generate.sh
   ```
3. Commit the updated `baseline_ts_errors.log` and `baseline_eslint.json` files.

## CI Enforcement

The CI automatically enforces the baseline using:
```bash
node scripts/baseline/enforce-ci.js
```
If the error count for either TypeScript or ESLint exceeds the baseline, the CI step will fail.
