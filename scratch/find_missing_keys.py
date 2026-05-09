import json
import os

def find_issues(canonical, target, path=""):
    issues = {"missing": [], "untranslated": [], "empty": []}
    for key, value in canonical.items():
        current_path = f"{path}.{key}" if path else key
        if key not in target:
            issues["missing"].append(current_path)
        elif isinstance(value, dict):
            if not isinstance(target[key], dict):
                issues["missing"].append(current_path)
            else:
                sub_issues = find_issues(value, target[key], current_path)
                for k in issues:
                    issues[k].extend(sub_issues[k])
        else:
            target_val = target[key]
            if not target_val:
                issues["empty"].append(current_path)
            elif target_val == value and len(value) > 1: # len > 1 to avoid short strings like "or"
                issues["untranslated"].append(current_path)
    return issues

en_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json"
ar_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json"

with open(en_path, 'r', encoding='utf-8') as f:
    en_data = json.load(f)

with open(ar_path, 'r', encoding='utf-8') as f:
    ar_data = json.load(f)

issues = find_issues(en_data, ar_data)

print(f"Found {len(issues['missing'])} missing keys")
print(f"Found {len(issues['untranslated'])} untranslated values")
print(f"Found {len(issues['empty'])} empty values")

if issues['missing']:
    print("\nMissing keys:")
    for k in issues['missing']: print(k)

if issues['untranslated']:
    print("\nUntranslated values:")
    for k in issues['untranslated']: print(k)

