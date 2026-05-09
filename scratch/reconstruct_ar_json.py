import json
import re

def get_leaf_keys(data, prefix=""):
    leaves = {}
    for k, v in data.items():
        full_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            leaves.update(get_leaf_keys(v, full_key))
        else:
            leaves[full_key] = v
    return leaves

def set_leaf_key(data, key_path, value):
    parts = key_path.split('.')
    curr = data
    for part in parts[:-1]:
        if part not in curr:
            curr[part] = {}
        curr = curr[part]
    curr[parts[-1]] = value

def solve():
    en_path = 'apps/web/messages/en.json'
    ar_path = 'apps/web/messages/ar.json'
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    with open(ar_path, 'r', encoding='utf-8', errors='replace') as f:
        ar_content = f.read()

    # Extract all "key": "value" pairs from ar.json using regex
    # This is structure-agnostic
    pairs = re.findall(r'"([^"]+)":\s*"([^"]+)"', ar_content)
    
    # Map from simple key to a list of values found
    key_to_values = {}
    for k, v in pairs:
        if k not in key_to_values:
            key_to_values[k] = []
        # Filter out clearly bad values
        if v.strip() and v != "" and "\ufffd" not in v:
            key_to_values[k].append(v)

    # Reconstruct Arabic data based on English structure
    ar_data = {}
    en_leaves = get_leaf_keys(en_data)
    
    for full_key, en_value in en_leaves.items():
        simple_key = full_key.split('.')[-1]
        
        # Heuristic: Find the best match for this key
        candidates = key_to_values.get(simple_key, [])
        
        if candidates:
            # For now, just take the last one (often the most recently added)
            # but we could be smarter later if needed.
            ar_value = candidates[-1]
        else:
            # Fallback to English if no Arabic translation found
            ar_value = en_value
            
        set_leaf_key(ar_data, full_key, ar_value)

    # Save the new ar.json
    with open(ar_path, 'w', encoding='utf-8') as f:
        json.dump(ar_data, f, ensure_ascii=False, indent=2)
    
    print(f"Reconstructed ar.json with {len(en_leaves)} keys based on en.json structure.")

if __name__ == "__main__":
    solve()
