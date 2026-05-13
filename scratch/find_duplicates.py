import json
import sys
import re

def find_duplicates_with_lines(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    def get_path_line(path, lines):
        # This is a simple heuristic to find the line number of a key path
        # It's not perfect for deeply nested identical keys but should work for our case
        current_line = 0
        parts = path.split('.')
        for part in parts:
            found = False
            for i in range(current_line, len(lines)):
                if f'"{part}"' in lines[i]:
                    current_line = i
                    found = True
                    break
            if not found:
                return -1
        return current_line + 1

    class DuplicateKeyDetector(json.JSONDecoder):
        def __init__(self, *args, **kwargs):
            super().__init__(object_pairs_hook=self.check_duplicates, *args, **kwargs)
        
        def check_duplicates(self, pairs):
            d = {}
            for k, v in pairs:
                if k in d:
                    print(f"Duplicate key found: {k}")
                d[k] = v
            return d

    print(f"Checking {file_path} for duplicates...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json.load(f, cls=DuplicateKeyDetector)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python find_duplicates.py <file_path>")
    else:
        find_duplicates_with_lines(sys.argv[1])
