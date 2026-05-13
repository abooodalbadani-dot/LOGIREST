import json

def find_all_occurrences(data, targets, prefix=""):
    results = {t: [] for t in targets}
    if isinstance(data, dict):
        for k, v in data.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if k in targets:
                results[k].append(full_key)
            sub_results = find_all_occurrences(v, targets, full_key)
            for t in targets:
                results[t].extend(sub_results[t])
    return results

def analyze(file_path, out_f):
    out_f.write(f"--- Analyzing {file_path} ---\n")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    targets = ['dashboard', 'analytics', 'audit', 'kpi', 'id', 'location', 'batch', 'department', 'time_ago', 'not_available', 'status_label']
    occurrences = find_all_occurrences(data, targets)
    
    for t, paths in occurrences.items():
        if len(paths) > 0:
            out_f.write(f"'{t}': {paths}\n")

with open('apps/web/scratch/analysis_output.txt', 'w', encoding='utf-8') as out_f:
    analyze('apps/web/messages/en.json', out_f)
    analyze('apps/web/messages/ar.json', out_f)
