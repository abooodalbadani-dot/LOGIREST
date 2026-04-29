import json
import sys

def validate_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json.load(f)
        return True, f"JSON in {file_path} is valid."
    except json.JSONDecodeError as e:
        return False, f"JSON Error in {file_path}: {e}"
    except Exception as e:
        return False, f"Error reading {file_path}: {e}"

if __name__ == "__main__":
    # Use paths relative to script if possible, or handle encoding
    success_ar, msg_ar = validate_json(r"messages\ar.json")
    success_en, msg_en = validate_json(r"messages\en.json")
    
    if not success_ar:
        print(msg_ar.encode('utf-8', errors='replace').decode('ascii', errors='replace'))
    else:
        print("AR JSON is valid")
        
    if not success_en:
        print(msg_en.encode('utf-8', errors='replace').decode('ascii', errors='replace'))
    else:
        print("EN JSON is valid")

    if not success_ar or not success_en:
        sys.exit(1)
