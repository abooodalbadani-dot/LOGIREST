import json

def find_duplicate_keys(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We can't use json.load because it automatically handles duplicates
    # We need a custom parser or just count occurrences of top-level keys
    # For a simple check, we can look for strings like "  \"key\": {" at the first level of indentation
    
    import re
    # Match "key": { or "key": "value" at level 1 indentation (2 spaces)
    matches = re.findall(r'^  "([^"]+)":', content, re.MULTILINE)
    
    counts = {}
    for m in matches:
        counts[m] = counts.get(m, 0) + 1
    
    duplicates = {k: v for k, v in counts.items() if v > 1}
    return duplicates

if __name__ == "__main__":
    print("Duplicates in en.json:", find_duplicate_keys(r"messages\en.json"))
    print("Duplicates in ar.json:", find_duplicate_keys(r"messages\ar.json"))
