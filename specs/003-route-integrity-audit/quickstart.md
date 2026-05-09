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

## Latest Audit Results (2026-05-09)

| Metric | Count |
|--------|-------|
| Total Routes | 120 |
| Active | 94 |
| Entry Points | 1 (`/dashboard`) |
| Orphan Routes | 25 |
| Review Required | 0 |
| Broken References | 2 |
| Public Routes | 3 |
| Protected Routes | 117 |

### Key Findings

**Orphan Routes (25)**: Routes with no incoming navigation references. These include:
- Admin: `/admin/audit-logs`, `/admin/restaurant-profile`, `/admin/settings`
- Inventory: `/inventory`, `/inventory/balance`, `/inventory/expired-override`, `/inventory/lots`, `/inventory/movements`
- Master Data: `/master-data`, `/master-data/import/*`, various `:id/edit` routes
- Reports: All `/reports/*` sub-routes
- Operations: `/transfers`, `/context-selector`, `/test-virtual`

**Dynamic Route Resolved**: All dynamic `[:id]` routes are successfully matched against template literal navigation patterns. Transfers, stocktake, and other dynamic routes now show `Active` status with verified references.

**Broken References (2)**: Both in `PendingDocumentsWidget.tsx` referencing `/:id/:id` - likely a fully dynamic path construction that needs manual verification.

## Interpreting the Report

### Handling Orphans
If a route is marked as `Orphan`:
1. Check if it should be linked from an existing page (e.g., a missing button or sidebar link).
2. If it is navigated via tabs or conditional UI within a parent page, note this in the report.
3. If it is legacy or unused code, mark it for deletion in follow-up tasks.
4. Some "orphans" are genuinely navigated via patterns not detectable by static analysis (e.g., `usePathname()` redirects, programmatic navigation with computed URLs, or tab-based navigation within a page).

### Reviewing Dynamic Paths
If a route is marked as `Review`:
1. Search the codebase for the variable name used in the `router.push()` or `href`.
2. Confirm that the constructed path matches the expected route structure.
3. Update the `Notes` column in the report with your findings.

### Fixing Broken References
If the script identifies broken references:
1. Navigate to the source file indicated in the report.
2. Determine if the reference uses a dynamic template (e.g., `` `/${doc.path}/${doc.id}` ``) and verify it produces valid paths at runtime.
3. Correct the `href` if it genuinely points to a non-existent route.
