import os
import hashlib
import difflib

backup_dir = r"E:\Kitchen‑Store Inventory System\scratch\app_backup"
active_dir = r"E:\Kitchen‑Store Inventory System\apps\web\src\app"
output_file = r"E:\Kitchen‑Store Inventory System\scratch\compare_output.txt"

def get_relative_files(root_dir):
    file_list = {}
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, root_dir)
            file_list[rel_path] = full_path
    return file_list

backup_files = get_relative_files(backup_dir)
active_files = get_relative_files(active_dir)

only_backup = sorted([f for f in backup_files if f not in active_files])
only_active = sorted([f for f in active_files if f not in backup_files])
both = sorted([f for f in backup_files if f in active_files])

with open(output_file, 'w', encoding='utf-8') as out:
    out.write(f"Total files in backup: {len(backup_files)}\n")
    out.write(f"Total files in active app: {len(active_files)}\n")
    out.write(f"Files ONLY in backup: {len(only_backup)}\n")
    out.write(f"Files ONLY in active app: {len(only_active)}\n")
    out.write(f"Files in BOTH: {len(both)}\n\n")

    out.write("--- FILES ONLY IN BACKUP (LOST OR RECOVERABLE) ---\n")
    for f in only_backup:
        out.write(f" - {f} ({os.path.getsize(backup_files[f])} bytes)\n")

    out.write("\n--- FILES ONLY IN ACTIVE APP (NEW/MIGRATED ROUTES) ---\n")
    for f in only_active:
        out.write(f" - {f} ({os.path.getsize(active_files[f])} bytes)\n")

    out.write("\n--- COMPARISON OF FILES IN BOTH ---\n")
    modified_count = 0
    for f in both:
        with open(backup_files[f], 'r', encoding='utf-8', errors='ignore') as f1:
            c1 = f1.read()
        with open(active_files[f], 'r', encoding='utf-8', errors='ignore') as f2:
            c2 = f2.read()
        
        if c1 != c2:
            modified_count += 1
            out.write(f"\n[MODIFIED] {f}\n")
            out.write(f"  Backup size: {len(c1)} chars | Active size: {len(c2)} chars\n")
            diff = list(difflib.unified_diff(c1.splitlines(), c2.splitlines(), n=0))
            added = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            removed = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))
            out.write(f"  Lines added in active: {added} | Lines removed in active: {removed}\n")
            
            # Show the actual diff lines to see exact differences!
            out.write("  Diff snippet:\n")
            diff_lines = list(difflib.unified_diff(c1.splitlines(), c2.splitlines(), lineterm='', n=2))
            for line in diff_lines[:30]:  # Limit diff output per file
                out.write(f"    {line}\n")
            if len(diff_lines) > 30:
                out.write(f"    ... ({len(diff_lines) - 30} more lines of diff)\n")
            
            keywords = ["animate-", "transition", "bg-gradient", "shadow-", "hover:", "alert", "sound", "scan", "idempotency", "lock"]
            backup_kws = [kw for kw in keywords if kw in c1]
            active_kws = [kw for kw in keywords if kw in c2]
            out.write(f"  Backup UX indicators: {backup_kws}\n")
            out.write(f"  Active UX indicators: {active_kws}\n")

    out.write(f"\nTotal modified files in both: {modified_count}\n")
print("Done writing compare script.")
