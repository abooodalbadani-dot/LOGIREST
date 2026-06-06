import os
import difflib

def get_files_dict(base_dir):
    files_dict = {}
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, base_dir)
            files_dict[rel_path] = full_path
    return files_dict

def analyze_diffs(dir_backup, dir_active):
    backup_files = get_files_dict(dir_backup)
    active_files = get_files_dict(dir_active)
    
    with open(r"E:\kitchen-store-inventory-system\scratch\diff_full_output.txt", "w", encoding="utf-8") as out:
        out.write("FULL DIFFERENCE REPORT BETWEEN BACKUP AND ACTIVE FILES\n")
        out.write("=====================================================\n\n")
        
        for rel_path in sorted(backup_files):
            if rel_path in active_files:
                b_path = backup_files[rel_path]
                a_path = active_files[rel_path]
                
                with open(b_path, 'r', encoding='utf-8', errors='ignore') as f:
                    b_lines = f.readlines()
                with open(a_path, 'r', encoding='utf-8', errors='ignore') as f:
                    a_lines = f.readlines()
                    
                if b_lines != a_lines:
                    diff = difflib.unified_diff(
                        b_lines, a_lines,
                        fromfile='backup/' + rel_path,
                        tofile='active/' + rel_path,
                        n=3
                    )
                    diff_list = list(diff)
                    
                    added = sum(1 for l in diff_list if l.startswith('+') and not l.startswith('+++'))
                    removed = sum(1 for l in diff_list if l.startswith('-') and not l.startswith('---'))
                    
                    out.write(f"FILE: {rel_path}\n")
                    out.write(f"Backup size: {os.path.getsize(b_path)} bytes, Active size: {os.path.getsize(a_path)} bytes\n")
                    out.write(f"Changes: +{added} added in active, -{removed} removed in active (unique in backup)\n")
                    out.write("----------------------------------------------------------------------\n")
                    
                    # We will write the first 100 lines of the unified diff to avoid generating an excessively large output file, or write it all if it's fine.
                    # 100 lines is usually plenty to see the exact code.
                    for line in diff_list[:200]:
                        out.write(line)
                    if len(diff_list) > 200:
                        out.write(f"\n... [DIFF TRUNCATED, TOTAL DIFF LINES: {len(diff_list)}] ...\n")
                    out.write("\n\n" + "="*80 + "\n\n")

if __name__ == "__main__":
    backup_dir = r"E:\kitchen-store-inventory-system\scratch\app_backup"
    active_dir = r"E:\kitchen-store-inventory-system\apps\web\src\app"
    analyze_diffs(backup_dir, active_dir)
    print("Done writing full diff output to scratch/diff_full_output.txt")
