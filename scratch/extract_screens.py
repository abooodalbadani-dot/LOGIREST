import os

# Use current directory to avoid path encoding issues
base_path = os.path.join("src", "app", "[locale]")
screens = []

if not os.path.exists(base_path):
    print(f"Error: {base_path} not found")
    exit(1)

for root, dirs, files in os.walk(base_path):
    if "page.tsx" in files:
        # Get relative path from [locale]
        rel_path = os.path.relpath(root, base_path)
        if rel_path == ".":
            display_path = "/"
        else:
            display_path = "/" + rel_path.replace("\\", "/")
        
        # Identify Module from route group
        module = "Unknown"
        normalized_root = root.replace("\\", "/")
        if "(auth)" in normalized_root:
            module = "Auth & Global"
        elif "(app)" in normalized_root:
            if "(master-data)" in normalized_root:
                module = "Master Data"
            elif "(operations)" in normalized_root:
                module = "Operations"
            elif "(procurement)" in normalized_root:
                module = "Procurement"
            elif "(inventory)" in normalized_root:
                module = "Inventory"
            elif "(communications)" in normalized_root:
                module = "Communications"
            elif "(reports)" in normalized_root:
                module = "Reports"
            elif "(admin)" in normalized_root:
                module = "Admin"
            else:
                module = "Auth & Global"
        
        screens.append({
            "path": display_path,
            "file": root + "/page.tsx",
            "module": module
        })

for s in sorted(screens, key=lambda x: (x["module"], x["path"])):
    print(f"{s['module']}|{s['path']}|{s['file']}")
