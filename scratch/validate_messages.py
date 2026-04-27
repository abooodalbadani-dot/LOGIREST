import json
import os

def validate_json(file_path):
    print(f"Validating {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        def print_keys(obj, prefix=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    print_keys(v, f"{prefix}.{k}" if prefix else k)
            else:
                pass # Just print keys
        
        # Check specifically for the missing keys
        keys = []
        def get_all_keys(obj, prefix=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    full_key = f"{prefix}.{k}" if prefix else k
                    keys.append(full_key)
                    get_all_keys(v, full_key)
        
        get_all_keys(data)
        
        target_keys = ["operations.issue.new_description", "procurement.grn.description"]
        for tk in target_keys:
            if tk in keys:
                print(f"FOUND: {tk}")
            else:
                print(f"NOT FOUND: {tk}")
                # Suggest similar keys
                similar = [k for k in keys if tk.split('.')[-1] in k]
                if similar:
                    print(f"Similar keys: {similar}")

    except Exception as e:
        print(f"Error: {e}")

validate_json("messages/en.json")
validate_json("messages/ar.json")
