import re
import os

# Read existing page.tsx files from scratch/existing_pages.txt
existing_files = []
if os.path.exists("scratch/existing_pages.txt"):
    with open("scratch/existing_pages.txt", "r", encoding="utf-8") as f:
        existing_files = [line.strip() for line in f if line.strip()]

# Convert file paths to next.js path matchers (remove locale and groups)
# E.g. C:\kitchen-store-inventory-system\apps\web\src\app\[locale]\(app)\(operations)\adjustments\page.tsx
# maps to /adjustments
url_to_file = {}
for path in existing_files:
    # Normalize slashes
    norm_path = path.replace("\\", "/")
    # We want the part after [locale]/(app)
    parts = norm_path.split("[locale]/(app)/")
    if len(parts) > 1:
        subpath = parts[1]
        # Remove route groups like (operations)/ or (procurement)/
        subpath = re.sub(r"\([^)]+\)/", "", subpath)
        # Remove /page.tsx
        if subpath.endswith("/page.tsx"):
            url_path = "/" + subpath[:-9]
        elif subpath == "page.tsx":
            url_path = "/"
        else:
            continue
        url_to_file[url_path] = path

# Now read Sidebar.tsx to extract all hrefs
sidebar_path = "apps/web/src/components/layouts/Sidebar.tsx"
hrefs = []
with open(sidebar_path, "r", encoding="utf-8") as f:
    content = f.read()
    # Find all pattern: href: '/...'
    matches = re.findall(r"href:\s*'([^']+)'", content)
    hrefs.extend(matches)
    matches_double = re.findall(r'href:\s*"([^"]+)"', content)
    hrefs.extend(matches_double)

# Remove duplicates
hrefs = sorted(list(set(hrefs)))

print("Sidebar Hrefs:")
for h in hrefs:
    exists = h in url_to_file
    print(f"  {h}: {'EXISTS' if exists else 'MISSING'}")
    if not exists:
        # Print possible target paths
        # By default, we place it in apps/web/src/app/[locale]/(app)/{h}/page.tsx
        # or we might need to check if we can place it in a route group.
        # But wait! A standard path at apps/web/src/app/[locale]/(app)/{h}/page.tsx will work perfectly!
        pass
