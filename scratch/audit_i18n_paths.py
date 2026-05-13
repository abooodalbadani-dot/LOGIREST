import json
import sys

# Ensure stdout handles UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def find_paths(d, target, current_path=""):
    paths = []
    if isinstance(d, dict):
        for k, v in d.items():
            new_path = f"{current_path}.{k}" if current_path else k
            if k == target:
                paths.append(new_path)
            paths.extend(find_paths(v, target, new_path))
    elif isinstance(d, list):
        for i, v in enumerate(d):
            new_path = f"{current_path}[{i}]"
            paths.extend(find_paths(v, target, new_path))
    return paths

def get_value(data, path):
    parts = path.split('.')
    curr = data
    for p in parts:
        if isinstance(curr, dict) and p in curr:
            curr = curr[p]
        else:
            return None
    return curr

def audit_file(filename, label):
    print(f"--- Auditing {label} ---")
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        issue_paths = find_paths(data, "issue")
        print(f"Paths to 'issue': {issue_paths}")
        
        for path in issue_paths:
            val = get_value(data, path)
            if isinstance(val, dict):
                print(f"Keys under {path}: {list(val.keys())}")
            else:
                print(f"Value at {path}: {val}")
        
        target_path = "operations.issue.warehouse_locked"
        val = get_value(data, target_path)
        if val:
            print(f"Found {target_path}: {val}")
        else:
            print(f"{target_path} NOT FOUND")
            
    except Exception as e:
        print(f"Error auditing {label}: {e}")

audit_file('E:/Kitchen\u2011Store Inventory System/apps/web/messages/en.json', 'EN')
audit_file('E:/Kitchen\u2011Store Inventory System/apps/web/messages/ar.json', 'AR')
