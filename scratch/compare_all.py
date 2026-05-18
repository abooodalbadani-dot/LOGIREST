import os
import re
import json

def get_files_recursively(base_dir):
    files_list = []
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(('.ts', '.tsx', '.css', '.json')):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, base_dir)
                files_list.append(rel_path)
    return files_list

def analyze_diff(rel_path, path_a, path_b):
    try:
        with open(path_a, 'r', encoding='utf-8') as f:
            lines_a = f.readlines()
    except Exception:
        lines_a = []
        
    try:
        with open(path_b, 'r', encoding='utf-8') as f:
            lines_b = f.readlines()
    except Exception:
        lines_b = []
        
    if not lines_a and not lines_b:
        return None
        
    content_a = "".join(lines_a)
    content_b = "".join(lines_b)
    
    if content_a == content_b:
        return {
            'rel_path': rel_path,
            'status': 'IDENTICAL',
            'lines_a': len(lines_a),
            'lines_b': len(lines_b)
        }
        
    # Analyze difference
    diff_data = {
        'rel_path': rel_path,
        'status': 'MODIFIED' if (lines_a and lines_b) else ('DELETED_IN_B' if lines_a else 'ADDED_IN_B'),
        'lines_a': len(lines_a),
        'lines_b': len(lines_b),
        'a_features': [],
        'b_features': [],
        'verdict': ''
    }
    
    # Feature checklist
    features = {
        'idempotency': r'idempotency|X-Idempotency-Key',
        'lockState': r'lockState|isLocked|LockBanner',
        'virtualization_bug': r'style=\{\{\s*height:\s*`\$\{totalSize\}px`',
        'virtualization_fix': r'paddingTop|paddingBottom',
        'camelCase_properties': r'\.nameAr|\.nameEn|\.sku',
        'snakeCase_properties': r'\.name_ar|\.name_en|\.code|\.barcode',
        'animations': r'animate-|transition-|duration-',
        'glassmorphism': r'backdrop-blur|bg-white/|bg-surface-container-low/50',
        'audit_logging': r'logger|audit|logActivity',
        'scan_mode': r'ScanInput|onScan|scannerMode',
        'audio_alerts': r'audioAlerts|audio\.play',
        'rbac_check': r'PermissionGate|PERMISSION_MATRIX|hasPermission'
    }
    
    for feat_name, pattern in features.items():
        if re.search(pattern, content_a, re.IGNORECASE):
            diff_data['a_features'].append(feat_name)
        if re.search(pattern, content_b, re.IGNORECASE):
            diff_data['b_features'].append(feat_name)
            
    # Determine verdict
    # A is backup, B is active apps/web
    a_feats = set(diff_data['a_features'])
    b_feats = set(diff_data['b_features'])
    
    if diff_data['status'] == 'DELETED_IN_B':
        diff_data['verdict'] = 'CRITICAL LOST WORK (Deleted in active branch)'
    elif diff_data['status'] == 'ADDED_IN_B':
        diff_data['verdict'] = 'NEW WORK (Added in active branch, not in backup)'
    else:
        # Check specific feature differences
        a_only = a_feats - b_feats
        b_only = b_feats - a_feats
        
        if len(lines_a) > len(lines_b) + 50 and 'virtualization_bug' not in a_only:
            diff_data['verdict'] = 'BACKUP IS LARGER (Potential lost features/logic in backup)'
        elif len(lines_b) > len(lines_a) + 50 and 'virtualization_fix' in b_only:
            diff_data['verdict'] = 'ACTIVE CODE IS LARGER (Active contains more complete/fixed logic)'
        elif 'lockState' in b_only or 'idempotency' in b_only:
            diff_data['verdict'] = 'ACTIVE CODE IS FUNCTIONALLY SUPERIOR (Has Lock States & Idempotency)'
        elif 'glassmorphism' in b_only or 'animations' in b_only:
            diff_data['verdict'] = 'ACTIVE CODE HAS VISUAL IMPROVEMENTS (Premium styles/animations)'
        elif 'glassmorphism' in a_only or 'animations' in a_only:
            diff_data['verdict'] = 'BACKUP HAS VISUAL IMPROVEMENTS (Premium design lost in active)'
        elif len(a_only) > 0:
            diff_data['verdict'] = f'BACKUP HAS EXCLUSIVE FEATURES: {list(a_only)}'
        elif len(b_only) > 0:
            diff_data['verdict'] = f'ACTIVE CODE HAS EXCLUSIVE FEATURES: {list(b_only)}'
        else:
            diff_data['verdict'] = 'MINOR TEXT/STYLE DIFFS'
            
    return diff_data

def main():
    dir_a = "scratch/app_backup"
    dir_b = "apps/web/src/app"
    
    files_a = get_files_recursively(dir_a)
    files_b = get_files_recursively(dir_b)
    
    all_files = sorted(list(set(files_a + files_b)))
    
    report = []
    identical_count = 0
    modified_count = 0
    added_in_b_count = 0
    deleted_in_b_count = 0
    
    for f in all_files:
        path_a = os.path.join(dir_a, f)
        path_b = os.path.join(dir_b, f)
        
        analysis = analyze_diff(f, path_a, path_b)
        if not analysis:
            continue
            
        if analysis['status'] == 'IDENTICAL':
            identical_count += 1
        elif analysis['status'] == 'MODIFIED':
            modified_count += 1
            report.append(analysis)
        elif analysis['status'] == 'ADDED_IN_B':
            added_in_b_count += 1
            report.append(analysis)
        elif analysis['status'] == 'DELETED_IN_B':
            deleted_in_b_count += 1
            report.append(analysis)
            
    print(f"Comparison Complete:")
    print(f"Identical files: {identical_count}")
    print(f"Modified files: {modified_count}")
    print(f"Added in active: {added_in_b_count}")
    print(f"Deleted in active: {deleted_in_b_count}")
    
    # Save detailed JSON report
    with open("scratch/diff_analysis_result.json", "w", encoding="utf-8") as f:
        json.dump({
            'summary': {
                'identical': identical_count,
                'modified': modified_count,
                'added_active': added_in_b_count,
                'deleted_active': deleted_in_b_count
            },
            'details': report
        }, f, indent=2)

if __name__ == "__main__":
    main()
