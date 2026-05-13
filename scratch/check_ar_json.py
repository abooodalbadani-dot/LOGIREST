
import json
import sys


def check_json(file_path):
    encodings = ['utf-8', 'utf-16', 'windows-1256', 'utf-8-sig']
    for enc in encodings:
        print(f"\n--- Checking encoding: {enc} ---")
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
                data = json.loads(content)
                print(f"JSON loaded successfully with {enc}")
                
                keys_to_check = [
                    ["common", "statuses", "all"],
                    ["common", "statuses", "draft"],
                    ["common", "warehouses", "main"],
                    ["operations", "issue", "warehouse_locked"]
                ]
                
                for key_path in keys_to_check:
                    curr = data
                    found = True
                    for part in key_path:
                        if isinstance(curr, dict) and part in curr:
                            curr = curr[part]
                        else:
                            found = False
                            break
                    if found:
                        val_str = str(curr)
                        print(f"Key {' . '.join(key_path)} found: {val_str}")
                        print(f"Hex: {val_str.encode(enc, errors='replace').hex()}")
                    else:
                        print(f"Key {' . '.join(key_path)} NOT found")
                
                # Check if common exists at root
                if "common" in data:
                    print("Root key 'common' exists")
                    if "warehouse_locked" in data["common"]:
                        print(f"common.warehouse_locked: {data['common']['warehouse_locked']}")
                
        except Exception as e:
            print(f"Error with {enc}: {e}")

if __name__ == "__main__":
    check_json(sys.argv[1])


if __name__ == "__main__":
    check_json(sys.argv[1])
