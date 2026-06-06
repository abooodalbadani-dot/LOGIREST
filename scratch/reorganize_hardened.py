import os
import shutil
import sys

# Force UTF-8 for Windows output with non-breaking hyphens
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

base = r"e:\kitchen-store-inventory-system\src\app\[locale]\(app)"

to_rename = {
    "(admin)": "admin",
    "(inventory)": "inventory",
    "(master-data)": "master-data",
    "(communications)": "communications"
}

for old, new in to_rename.items():
    old_path = os.path.join(base, old)
    new_path = os.path.join(base, new)
    if os.path.exists(old_path):
        print(f"Processing {old} -> {new}...")
        try:
            # Try simple rename first
            if os.path.exists(new_path):
                print(f"  Merging contents of {old} into existing {new}...")
                for item in os.listdir(old_path):
                    s = os.path.join(old_path, item)
                    d = os.path.join(new_path, item)
                    if os.path.isdir(s):
                        shutil.copytree(s, d, dirs_exist_ok=True)
                    else:
                        shutil.copy2(s, d)
                shutil.rmtree(old_path)
                print("  Merge complete.")
            else:
                os.rename(old_path, new_path)
                print("  Success via rename.")
        except Exception as e:
            print(f"  Rename failed: {e}. Trying copy/delete fallback...")
            try:
                shutil.copytree(old_path, new_path, dirs_exist_ok=True)
                shutil.rmtree(old_path)
                print("  Success via copy/delete.")
            except Exception as e2:
                print(f"  CRITICAL FAILURE moving {old}: {e2}")
    else:
        print(f"Skipping {old}: already moved or doesn't exist.")
