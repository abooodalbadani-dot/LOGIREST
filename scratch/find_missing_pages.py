import os

app_root = "apps/web/src/app/[locale]/(app)"
missing_page_folders = []

for root, dirs, files in os.walk(app_root):
    # Normalize paths
    normalized_root = root.replace("\\", "/")
    
    # Ignore dynamic route parameters like [id] unless we check them, but usually they have page.tsx
    # Let's list what is in the folder
    has_page = "page.tsx" in files
    
    if not has_page:
        # Check if there are other files in the folder (indicating it's not just a nesting folder)
        non_page_files = [f for f in files if f != "page.tsx"]
        if non_page_files:
            missing_page_folders.append((normalized_root, non_page_files))

print("Folders missing page.tsx but containing other files:")
for folder, files in sorted(missing_page_folders):
    print(f"  {folder}")
    for f in files:
        print(f"    - {f}")
