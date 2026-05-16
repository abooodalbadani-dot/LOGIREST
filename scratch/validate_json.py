import json
import sys

def validate_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json.load(f)
        print(f"JSON in {file_path} is valid.")
    except json.JSONDecodeError as e:
        print(f"JSON in {file_path} is INVALID.")
        print(f"Error: {e}")
        # Print some context around the error line
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            start = max(0, e.lineno - 5)
            end = min(len(lines), e.lineno + 5)
            for i in range(start, end):
                prefix = ">>>" if i + 1 == e.lineno else "   "
                print(f"{prefix} {i+1}: {lines[i].strip()}")

if __name__ == "__main__":
    validate_json(r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json")
    validate_json(r"e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json")
