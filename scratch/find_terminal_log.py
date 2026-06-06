import os
import time

now = time.time()
root_dir = r"E:\kitchen-store-inventory-system"

print("Modified files in the last 1 hour:")
for root, dirs, files in os.walk(root_dir):
    # Skip large directories
    if any(p in root for p in [".git", "node_modules", ".next", ".turbo", "dist"]):
        continue
    for file in files:
        path = os.path.join(root, file)
        try:
            mtime = os.path.getmtime(path)
            if now - mtime < 3600:
                print(f"{path} - {time.ctime(mtime)} ({(now - mtime)/60:.1f} mins ago)")
        except Exception as e:
            pass
