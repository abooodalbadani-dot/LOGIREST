import os
import filecmp
import hashlib
import sys

# Ensure UTF-8 stdout to avoid console encoding issues
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

def get_file_hash(filepath):
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def compare_dirs(dir1, dir2):
    dir1_files = {}
    dir2_files = {}
    
    for root, dirs, files in os.walk(dir1):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dir1)
            dir1_files[rel_path] = full_path
            
    for root, dirs, files in os.walk(dir2):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dir2)
            dir2_files[rel_path] = full_path
            
    only_in_dir1 = sorted(list(set(dir1_files.keys()) - set(dir2_files.keys())))
    only_in_dir2 = sorted(list(set(dir2_files.keys()) - set(dir1_files.keys())))
    
    both = set(dir1_files.keys()) & set(dir2_files.keys())
    different_files = []
    
    for rel_path in sorted(list(both)):
        f1 = dir1_files[rel_path]
        f2 = dir2_files[rel_path]
        if get_file_hash(f1) != get_file_hash(f2):
            different_files.append((rel_path, os.path.getsize(f1), os.path.getsize(f2)))
            
    print(f"Total files in dir1: {len(dir1_files)}")
    print(f"Total files in dir2: {len(dir2_files)}")
    print(f"\nFiles only in dir1 (Count: {len(only_in_dir1)}):")
    for f in only_in_dir1[:15]:
        print(f"  - {f}")
    if len(only_in_dir1) > 15:
        print(f"  ... and {len(only_in_dir1) - 15} more")
        
    print(f"\nFiles only in dir2 (Count: {len(only_in_dir2)}):")
    for f in only_in_dir2[:15]:
        print(f"  - {f}")
    if len(only_in_dir2) > 15:
        print(f"  ... and {len(only_in_dir2) - 15} more")
        
    print(f"\nDifferent files (Count: {len(different_files)}):")
    for f, s1, s2 in different_files[:15]:
        print(f"  - {f} (size: dir1={s1}B, dir2={s2}B)")
    if len(different_files) > 15:
        print(f"  ... and {len(different_files) - 15} more")

if __name__ == '__main__':
    dir1 = r"E:\kitchen-store-inventory-system\app"
    dir2 = r"E:\kitchen-store-inventory-system\apps\web\src\app"
    compare_dirs(dir1, dir2)
