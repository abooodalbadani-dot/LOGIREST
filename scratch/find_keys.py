import os
import re

def find_translation_keys(directory):
    keys_by_namespace = {}
    
    # regex for useTranslations('namespace')
    use_trans_regex = re.compile(r"useTranslations\(['\"]([^'\"]+)['\"]\)")
    # regex for t('key') or tCommon('key')
    t_regex = re.compile(r"(t|tc|tCommon)\(['\"]([^'\"]+)['\"]\)")

    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Find all namespaces in this file
                    namespaces = {} # var_name -> namespace
                    for match in use_trans_regex.finditer(content):
                        # Find the variable name it's assigned to
                        # e.g. const t = useTranslations('procurement.pr')
                        line = content[:match.start()].split('\n')[-1]
                        var_match = re.search(r"const\s+(\w+)\s*=", line)
                        if var_match:
                            namespaces[var_match.group(1)] = match.group(1)
                        else:
                            # Try searching in the whole file if not on same line (less likely but possible)
                            # Actually usually it's on the same line or nearby.
                            # Let's try a broader search for the assignment
                            full_match_line = re.search(r"const\s+(\w+)\s*=\s*useTranslations\(['\"]"+re.escape(match.group(1))+r"['\"]\)", content)
                            if full_match_line:
                                namespaces[full_match_line.group(1)] = match.group(1)

                    # Find all t('key') calls
                    for match in t_regex.finditer(content):
                        var_name = match.group(1)
                        key = match.group(2)
                        
                        namespace = namespaces.get(var_name)
                        if not namespace:
                            # Fallback for common aliases
                            if var_name == 'tCommon' or var_name == 'tc':
                                namespace = 'common'
                            else:
                                namespace = 'unknown'
                                
                        if namespace not in keys_by_namespace:
                            keys_by_namespace[namespace] = set()
                        keys_by_namespace[namespace].add(key)
                        
    return keys_by_namespace

if __name__ == "__main__":
    proc_dir = r"e:\Kitchen‑Store Inventory System\src\app\[locale]\(app)\(procurement)"
    keys = find_translation_keys(proc_dir)
    for ns, k in keys.items():
        print(f"Namespace: {ns}")
        for key in sorted(k):
            print(f"  - {key}")
