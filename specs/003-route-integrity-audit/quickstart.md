# Quickstart: Running the Route Integrity Audit

This guide covers how to execute the automated route audit and generate the integrity report.

## Prerequisites
- Python 3.11+
- Access to the repository root.

## Execution Steps

### 1. Initialize the Environment
Ensure you are in the repository root:
```powershell
cd "E:\Kitchen-Store Inventory System"
```

### 2. Run the Audit Script
Execute the Python script located in the `apps/web/scripts` directory:
```powershell
python apps/web/scripts/audit-routes.py
```

### 3. Review the Results
The script will generate the following file:
- `specs/003-route-integrity-audit/audit-report.md`

## Interpreting the Report

### Handling Orphans
If a route is marked as `Orphan`:
1. Check if it should be linked from an existing page (e.g., a missing button).
2. If it is legacy or unused code, mark it for deletion in the `tasks.md` of the next phase.

### Reviewing Dynamic Paths
If a route is marked as `Review`:
1. Search the codebase for the variable name used in the `router.push()` or `href`.
2. Confirm that the constructed path matches the expected route structure.
3. Update the `Notes` column in the report with your findings.

### Fixing Broken References
If the script identifies broken references:
1. Navigate to the source file indicated in the report.
2. Correct the `href` to point to a valid route.
