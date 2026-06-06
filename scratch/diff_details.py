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
    
    diff_report = []
    
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
                    n=0
                )
                diff_list = list(diff)
                
                # count additions and deletions
                added_in_active = 0
                removed_in_active = 0
                sample_additions = []
                sample_removals = []
                
                for line in diff_list:
                    if line.startswith('+') and not line.startswith('+++'):
                        added_in_active += 1
                        if len(sample_additions) < 5:
                            sample_additions.append(line[1:].strip())
                    elif line.startswith('-') and not line.startswith('---'):
                        removed_in_active += 1
                        if len(sample_removals) < 5:
                            sample_removals.append(line[1:].strip())
                            
                diff_report.append({
                    'rel_path': rel_path,
                    'b_len': len(b_lines),
                    'a_len': len(a_lines),
                    'added': added_in_active,
                    'removed': removed_in_active,
                    'sample_additions': sample_additions,
                    'sample_removals': sample_removals
                })
                
    return diff_report

if __name__ == "__main__":
    backup_dir = r"E:\kitchen-store-inventory-system\scratch\app_backup"
    active_dir = r"E:\kitchen-store-inventory-system\apps\web\src\app"
    
    report = analyze_diffs(backup_dir, active_dir)
    print(f"Total differing files: {len(report)}")
    for item in report:
        if item['added'] > 0 or item['removed'] > 0:
            print(f"\n==========================================")
            print(f"File: {item['rel_path']}")
            print(f"Lines - Backup: {item['b_len']}, Active: {item['a_len']}")
            print(f"Changes: +{item['added']} added in active, -{item['removed']} removed in active (meaning they exist in backup but not in active)")
            if item['sample_removals']:
                print("Samples ONLY in Backup:")
                for r in item['sample_removals']:
                    print(f"  - {r}")
            if item['sample_additions']:
                print("Samples ONLY in Active:")
                for a in item['sample_additions']:
                    print(f"  - {a}")
