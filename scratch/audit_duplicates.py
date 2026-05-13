import json
import sys

def find_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    def check_duplicates(pairs):
        seen = {}
        for k, v in pairs:
            if k in seen:
                print(f"Duplicate key '{k}' found at level.")
                # Try to find line numbers
                for i, line in enumerate(lines):
                    if f'"{k}":' in line:
                        print(f"  Possible line: {i+1}: {line.strip()}")
            seen[k] = v
        return seen

    print(f"--- Checking {file_path} ---")
    with open(file_path, 'r', encoding='utf-8') as f:
        json.load(f, object_pairs_hook=check_duplicates)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python audit_duplicates.py <file_path>")
    else:
        find_duplicates(sys.argv[1])
