import os
import re
import json

base_dir = "e:/kitchen-store-inventory-system/apps/web/src/app/[locale]"
src_dir = "e:/kitchen-store-inventory-system/apps/web/src"

pages = []
screens_dict = {}

def get_route_path(file_path):
    rel_path = os.path.relpath(file_path, base_dir)
    dir_name = os.path.dirname(rel_path)
    # Remove route groups like (app), (operations)
    parts = dir_name.replace('\\', '/').split('/')
    clean_parts = [p for p in parts if not p.startswith('(') and not p.endswith(')')]
    if not clean_parts:
        return '/'
    return '/' + '/'.join(clean_parts)

def analyze_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return content

# 1. Gather all pages and their associated client components
for root, dirs, files in os.walk(base_dir):
    if 'page.tsx' in files:
        page_path = os.path.join(root, 'page.tsx')
        route = get_route_path(page_path)
        
        # Determine Module
        module = "Unknown"
        if "(operations)" in root: module = "Operations"
        elif "(procurement)" in root: module = "Procurement"
        elif "master-data" in root: module = "Master Data"
        elif "admin" in root: module = "Admin"
        elif "reports" in root: module = "Reports"
        elif "(auth)" in root: module = "Auth"
        elif route == '/': module = "Dashboard"

        # Determine Type
        screen_type = "Utility"
        if route.endswith('/new'): screen_type = "Create"
        elif '/edit' in route: screen_type = "Edit"
        elif '[id]' in route and not route.endswith('[id]'):
            screen_type = "Subpage (" + os.path.basename(route) + ")"
        elif '[id]' in route: screen_type = "Detail"
        elif "report" in root.lower() or "reports" in root.lower(): screen_type = "Report"
        else: screen_type = "List"

        content = analyze_file(page_path)
        
        # Read associated files in the same directory to get full picture
        for f in files:
            if f.endswith('.tsx') and f != 'page.tsx':
                content += analyze_file(os.path.join(root, f))
                
        # Also check imports that point to features/
        imports = re.findall(r'import\s+.*?\s+from\s+[\'"]@/features/(.*?)[\'"]', content)
        for imp in imports:
            comp_path = os.path.join(src_dir, 'features', imp + '.tsx')
            if os.path.exists(comp_path):
                content += analyze_file(comp_path)

        has_layout = "Yes" if "layout.tsx" in files else "Inherited"
        has_page_header = "Yes" if "PageHeader" in content else "No"
        has_back_button = "Yes" if "href=\"/\"" in content or "router.back()" in content or "ArrowLeft" in content or "back" in content.lower() else "No"
        has_create_button = "Yes" if "Plus" in content or "Create" in content or "new" in content.lower() else "No"
        has_empty_state = "Yes" if "EmptyState" in content or "No results" in content else "No"
        has_loading_state = "Yes" if "isLoading" in content or "isPending" in content or "Skeleton" in content else "No"
        
        # UX States
        has_error_state = "Yes" if "error" in content.lower() or "toast.error" in content or "Alert" in content else "No"
        has_success_redirect = "Yes" if "router.push" in content and ("toast.success" in content or "mutateAsync" in content) else "No"

        # Hardcoded Strings (simplistic check for english words outside jsx tags and quotes that aren't inside translation functions)
        has_hardcoded_strings = "Yes" if re.search(r'>\s*[A-Z][a-z]+ [A-Za-z\s]+<', content) else "No"
        mixed_ltr = "Yes" if "dir=\"ltr\"" in content else "No"

        screens_dict[route] = {
            "route": route,
            "file_path": os.path.relpath(page_path, src_dir),
            "module": module,
            "type": screen_type,
            "has_layout": has_layout,
            "has_header": has_page_header,
            "has_back": has_back_button,
            "has_create": has_create_button,
            "has_empty": has_empty_state,
            "has_loading": has_loading_state,
            "has_error": has_error_state,
            "has_success_redirect": has_success_redirect,
            "hardcoded_strings": has_hardcoded_strings,
            "mixed_ltr": mixed_ltr,
            "content_dump": content # Store for later cross-reference
        }
        pages.append(screens_dict[route])

# 2. Connectivity Audit
sidebar_path = os.path.join(src_dir, "components", "layouts", "Sidebar.tsx")
dashboard_paths = []
for root, dirs, files in os.walk(os.path.join(src_dir, "features", "dashboard")):
    for f in files:
        if f.endswith('.tsx'):
            dashboard_paths.append(os.path.join(root, f))

sidebar_content = analyze_file(sidebar_path) if os.path.exists(sidebar_path) else ""
dashboard_content = ""
for dp in dashboard_paths:
    dashboard_content += analyze_file(dp)

# All files content for global reference check
all_ts_files_content = ""
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            all_ts_files_content += analyze_file(os.path.join(root, f))

for p in pages:
    route = p["route"]
    
    # Very simplistic route matching
    clean_route = route.replace('[id]', '')
    
    p["in_sidebar"] = "Yes" if clean_route in sidebar_content and len(clean_route) > 1 else "No"
    p["in_dashboard"] = "Yes" if clean_route in dashboard_content and len(clean_route) > 1 else "No"
    
    # Is it linked from anywhere else?
    occurrences = all_ts_files_content.count(clean_route)
    # Self reference + maybe 1 more = orphaned if not in sidebar/dashboard
    if p["in_sidebar"] == "No" and p["in_dashboard"] == "No" and occurrences <= 2 and p["type"] != "Dashboard":
        p["orphaned"] = "Yes"
    else:
        p["orphaned"] = "No"

# 3. Generating Report
report = []
report.append("# Full UX/UI & Navigation Connectivity Audit Report\n")
report.append("## 1. Overview")
report.append(f"- **Total number of screens:** {len(pages)}")
connected = len([p for p in pages if p["orphaned"] == "No"])
report.append(f"- **Fully connected screens:** {connected}")

orphans = [p for p in pages if p["orphaned"] == "Yes"]
report.append("\n## 2. Orphan Screens List")
for o in orphans:
    report.append(f"- `{o['route']}` ({o['module']} - {o['type']})")

missing_sidebar = [p for p in pages if p["type"] == "List" and p["in_sidebar"] == "No" and p["route"] != '/']
report.append("\n## 3. Missing Sidebar Entries (List Pages)")
for m in missing_sidebar:
    report.append(f"- `{m['route']}`")

missing_dashboard = [p for p in pages if p["type"] == "List" and p["in_dashboard"] == "No" and p["route"] != '/']
report.append("\n## 4. Missing Dashboard Shortcuts (List Pages)")
for m in missing_dashboard:
    report.append(f"- `{m['route']}`")

report.append("\n## 5. Screen Inventory")
report.append("| Route | Module | Type | Header | Back | Empty | Loading |")
report.append("|---|---|---|---|---|---|---|")
for p in sorted(pages, key=lambda x: x["route"]):
    report.append(f"| `{p['route']}` | {p['module']} | {p['type']} | {p['has_header']} | {p['has_back']} | {p['has_empty']} | {p['has_loading']} |")

report.append("\n## 6. Critical UX Gaps")
for p in pages:
    gaps = []
    if p["has_loading"] == "No" and p["type"] in ["List", "Detail"]: gaps.append("Missing Loading State")
    if p["has_empty"] == "No" and p["type"] == "List": gaps.append("Missing Empty State")
    if p["has_error"] == "No": gaps.append("Missing Error Handling")
    if p["has_success_redirect"] == "No" and p["type"] in ["Create", "Edit"]: gaps.append("Missing Success Redirect")
    
    if gaps:
        report.append(f"- **{p['route']}**: {', '.join(gaps)}")

report.append("\n## 7. Medium UI Inconsistencies & i18n")
for p in pages:
    issues = []
    if p["hardcoded_strings"] == "Yes": issues.append("Hardcoded Strings Detected")
    if p["mixed_ltr"] == "Yes": issues.append("Mixed LTR/RTL Layout")
    
    # Check form inconsistency
    if p["type"] in ["Create", "Edit"]:
        if "Save" not in p["content_dump"] and "Submit" not in p["content_dump"] and "Create" not in p["content_dump"]:
            issues.append("Missing Submit/Save Button")
        if "Cancel" not in p["content_dump"]:
            issues.append("Missing Cancel Button")
            
    if issues:
        report.append(f"- **{p['route']}**: {', '.join(issues)}")

with open('e:/kitchen-store-inventory-system/UX_Audit_Report.md', 'w', encoding='utf-8') as f:
    f.write('\n'.join(report))
