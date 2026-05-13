import json

def check_file(path):
    print(f"Checking {path}...")
    with open(path, 'rb') as f:
        raw_data = f.read()
    
    # Check for BOM
    if raw_data.startswith(b'\xef\xbb\xbf'):
        print("File has UTF-8 BOM")
    elif raw_data.startswith(b'\xff\xfe') or raw_data.startswith(b'\xfe\xff'):
        print("File has UTF-16 BOM")
    else:
        print("No BOM detected")

    try:
        decoded = raw_data.decode('utf-8')
        data = json.loads(decoded)
        print("Successfully loaded as UTF-8")
        
        def explore_keys(d, prefix=""):
            for k, v in d.items():
                full_key = f"{prefix}.{k}" if prefix else k
                # Check key for hidden chars
                hex_key = ' '.join([hex(ord(c)) for c in k])
                if any(ord(c) > 127 for c in k):
                    print(f"Non-ASCII character in key: {full_key} ({hex_key})")
                
                if isinstance(v, dict):
                    explore_keys(v, full_key)
                elif full_key in ["common.statuses.draft", "common.warehouses.main", "operations.issue.warehouse_locked"]:
                    print(f"Target key found: {full_key}")
                    print(f"  Value: {v}")
                    print(f"  Value Hex: {' '.join([hex(ord(c)) for c in v])}")

        explore_keys(data)
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_file('apps/web/messages/ar.json')
