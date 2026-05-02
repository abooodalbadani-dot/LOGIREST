import os

# Define the mapping of paths to official modules
# We will use the folder names to categorize
MODULE_MAPPING = {
    "(auth)": "Auth & Global",
    "dashboard": "Auth & Global",
    "profile": "Auth & Global",
    "search": "Auth & Global",
    "branches": "Master Data Entities",
    "warehouses": "Master Data Entities",
    "departments": "Master Data Entities",
    "suppliers": "Master Data Entities",
    "categories": "Master Data Entities",
    "items": "Master Data Entities",
    "units-of-measure": "Master Data Entities",
    "barcodes": "Master Data Entities",
    "currencies": "Master Data Entities",
    "fx-rates": "Master Data Entities",
    "import": "Excel Import",
    "kitchen-requests": "Kitchen Requests",
    "issues": "Issues",
    "transfers": "Transfers",
    "stocktake": "Stocktake",
    "stocktakes": "Stocktake",
    "adjustments": "Adjustments",
    "purchase-requests": "PR",
    "pr": "PR",
    "purchase-orders": "PO",
    "po": "PO",
    "goods-received": "GRN",
    "grn": "GRN",
    "balances": "Inventory Views",
    "lots": "Inventory Views",
    "movements": "Inventory Views",
    "communications": "Notifications & Email",
    "reports": "Reports",
    "users": "Admin — Users",
    "roles": "Admin — Roles",
    "audit-logs": "Admin — Audit + Settings",
    "settings": "Admin — Audit + Settings"
}

base_path = os.path.join("src", "app", "[locale]")
current_screens = []

for root, dirs, files in os.walk(base_path):
    if "page.tsx" in files:
        rel_path = os.path.relpath(root, base_path).replace("\\", "/")
        full_route = f"/[locale]/{rel_path}" if rel_path != "." else "/[locale]"
        
        # Determine module
        assigned_module = "Unknown"
        path_parts = rel_path.split("/")
        
        # Special case for Dashboard at root of (app)
        if "(app)" in path_parts and len(path_parts) == 1:
            assigned_module = "Auth & Global"
        elif "(app)" in path_parts and "dashboard" in path_parts:
            assigned_module = "Auth & Global"
        else:
            for part in path_parts:
                clean_part = part.strip("()")
                if clean_part in MODULE_MAPPING:
                    assigned_module = MODULE_MAPPING[clean_part]
                    break
                if part in MODULE_MAPPING:
                    assigned_module = MODULE_MAPPING[part]
                    break
        
        # Fallback for Auth group
        if assigned_module == "Unknown" and "(auth)" in path_parts:
            assigned_module = "Auth & Global"

        current_screens.append({
            "name": path_parts[-1] if path_parts[-1] != "." else "Root",
            "path": full_route,
            "file": os.path.join(root, "page.tsx"),
            "module": assigned_module
        })

# Official screens from spec (Summary table at line 1441)
OFFICIAL_SUMMARY = {
    "Auth & Global": 6,
    "Master Data Entities": 30,
    "Excel Import": 4,
    "Kitchen Requests": 3,
    "Issues": 6,
    "Transfers": 5,
    "Stocktake": 8,
    "Adjustments": 3,
    "PR": 4,
    "PO": 4,
    "GRN": 5,
    "Inventory Views": 3,
    "Notifications & Email": 4,
    "Reports": 7,
    "Admin — Users": 4,
    "Admin — Roles": 2,
    "Admin — Audit + Settings": 2
}

# Group current screens by module
current_by_module = {}
for s in current_screens:
    m = s["module"]
    if m not in current_by_module:
        current_by_module[m] = []
    current_by_module[m].append(s)

# Print Detailed Report
print("-----------------------------------")
print("DETAILED SYSTEM SCREEN REPORT")
print("-----------------------------------")

all_modules = sorted(list(set(list(OFFICIAL_SUMMARY.keys()) + list(current_by_module.keys()))))

for module in all_modules:
    screens = current_by_module.get(module, [])
    print(f"\n### Module: {module}")
    for s in screens:
        print(f"- {s['name']} | {s['path']} | {s['file']}")
    print(f"Total in {module}: {len(screens)}")

print("\n-----------------------------------")
print("SUMMARY TABLE")
print("-----------------------------------")
print("| Module | Required | Existing | Missing | Extra |")
print("|--------|----------|----------|---------|-------|")

total_required = 0
total_existing = 0
total_missing = 0
total_extra = 0

for module in all_modules:
    req = OFFICIAL_SUMMARY.get(module, 0)
    ext = len(current_by_module.get(module, []))
    
    # We can't easily calculate missing/extra without a full list of official paths
    # But we can provide the delta
    missing = max(0, req - ext)
    extra = max(0, ext - req)
    
    print(f"| {module} | {req} | {ext} | {missing} | {extra} |")
    
    total_required += req
    total_existing += ext
    total_missing += missing
    total_extra += extra

print(f"\nTotal Required: {total_required}")
print(f"Total Existing: {total_existing}")
print(f"Total Missing (Est): {total_missing}")
print(f"Total Extra (Est): {total_extra}")
print(f"Completion: { (total_existing/total_required)*100 if total_required > 0 else 0 :.1f}%")
