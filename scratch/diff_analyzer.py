import os
import hashlib
import filecmp

def get_files_dict(base_dir):
    files_dict = {}
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, base_dir)
            files_dict[rel_path] = full_path
    return files_dict

def get_md5(file_path):
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def compare_dirs(dir_backup, dir_active):
    backup_files = get_files_dict(dir_backup)
    active_files = get_files_dict(dir_active)
    
    only_in_backup = []
    only_in_active = []
    differing_files = []
    identical_files = []
    
    for rel_path in backup_files:
        if rel_path not in active_files:
            only_in_backup.append(rel_path)
        else:
            # check if they differ
            backup_md5 = get_md5(backup_files[rel_path])
            active_md5 = get_md5(active_files[rel_path])
            if backup_md5 != active_md5:
                differing_files.append((rel_path, backup_files[rel_path], active_files[rel_path]))
            else:
                identical_files.append(rel_path)
                
    for rel_path in active_files:
        if rel_path not in backup_files:
            only_in_active.append(rel_path)
            
    return only_in_backup, only_in_active, differing_files, identical_files

if __name__ == "__main__":
    backup_dir = r"E:\Kitchen‑Store Inventory System\scratch\app_backup"
    active_dir = r"E:\Kitchen‑Store Inventory System\apps\web\src\app"
    
    only_in_backup, only_in_active, differing_files, identical_files = compare_dirs(backup_dir, active_dir)
    
    print(f"FILES ONLY IN BACKUP: {len(only_in_backup)}")
    for f in sorted(only_in_backup):
        print(f" - {f}")
        
    print(f"\nFILES ONLY IN ACTIVE: {len(only_in_active)}")
    # We can omit printing all of them if there are too many, but let's print a summary or list them
    for f in sorted(only_in_active):
        print(f" - {f}")
        
    print(f"\nFILES THAT DIFFER: {len(differing_files)}")
    for rel_path, b_path, a_path in sorted(differing_files, key=lambda x: x[0]):
        # get sizes
        b_size = os.path.getsize(b_path)
        a_size = os.path.getsize(a_path)
        print(f" - {rel_path} (Backup Size: {b_size} bytes, Active Size: {a_size} bytes)")
