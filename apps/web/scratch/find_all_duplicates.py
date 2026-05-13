import json

def get_all_paths(data, prefix=""):
    paths = {}
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if k not in paths:
                paths[k] = []
            paths[k].append(full_key)
            sub_paths = get_all_paths(v, full_key)
            for sk, sv in sub_paths.items():
                if sk not in paths:
                    paths[sk] = []
                paths[sk].extend(sv)
    return paths

def analyze(file_path):
    print(f"--- Global Duplicate Search: {file_path} ---")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    all_paths = get_all_paths(data)
    
    # Exclude very common generic keys
    exclude = ['title', 'description', 'actions', 'label', 'name', 'status', 'type', 'error', 'success', 'cancel', 'save', 'edit', 'delete', 'view', 'create', 'update', 'fields', 'placeholder', 'validation', 'errors', 'loading', 'confirm', 'back', 'next', 'previous', 'all', 'none', 'details', 'id', 'code', 'created_at', 'updated_at', 'updated_by', 'search', 'filter', 'export', 'print', 'close', 'ok', 'yes', 'no', 'active', 'inactive', 'draft', 'posted', 'approved', 'rejected', 'pending', 'cancelled', 'completed', 'unknown', 'system']
    
    for k, paths in all_paths.items():
        if len(paths) > 1 and k not in exclude:
            # Filter out cases where one is a prefix of another (e.g. common and common.actions)
            # Actually get_all_paths already handles that.
            print(f"'{k}': {paths}")

analyze('apps/web/messages/en.json')
