import os
import sys
import re
from pathlib import Path

# Extract all dynamic routes
app_dir = Path("apps/web/src/app")
page_files = list(app_dir.rglob("page.tsx"))

dynamic_routes = []
for p in page_files:
    parts = p.parts
    # find parts with [id]
    if "[id]" in parts:
        # Construct the logical route path (removing [locale], (app), (operations), page.tsx etc)
        
        logical_parts = []
        for part in parts[parts.index("app")+1:-1]: # skip apps/web/src/app and page.tsx
            if not part.startswith("(") and part != "[locale]":
                logical_parts.append(part)
        
        logical_route = "/" + "/".join(logical_parts)
        dynamic_routes.append(logical_route)

dynamic_routes = sorted(list(set(dynamic_routes)))

print("Found dynamic routes:")
for r in dynamic_routes:
    print("  " + r)

# Now scan all source files for these base paths
src_dir = Path("apps/web/src")
src_files = [f for f in src_dir.rglob("*") if f.is_file() and f.suffix in ['.ts', '.tsx']]

print("\nScanning for entry points...")
orphans = []

for route in dynamic_routes:
    # Route is like /adjustments/[id] or /stocktake/[id]/approve
    base_path = route.split("[id]")[0] # e.g. /adjustments/
    suffix = route.split("[id]")[1] if len(route.split("[id]")) > 1 else ""
    
    found = False
    found_locations = []
    
    for f in src_files:
        if "app" in f.parts and f.name == "page.tsx" and route.strip("/") in str(f):
            # Skip the page itself
            continue
            
        try:
            content = f.read_text(encoding="utf-8")
        except:
            continue
            
        if base_path in content:
            if suffix:
                if suffix in content and base_path in content:
                    found = True
                    found_locations.append(str(f))
            else:
                found = True
                found_locations.append(str(f))
                
    if not found:
        orphans.append(route)
    else:
        print(f"[OK] {route} is referenced in {len(found_locations)} files.")

print("\n--- ORPHAN ANALYSIS ---")
if orphans:
    for o in orphans:
        print(f"[ORPHAN] {o}")
else:
    print("[SUCCESS] No orphan dynamic routes found!")
