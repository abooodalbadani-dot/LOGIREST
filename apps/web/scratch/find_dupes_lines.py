import json
import re

def find_duplicates(file_path):
    print(f"Checking {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.splitlines()
    
    # Track nesting to know when we are in 'common'
    # This is a bit rough but works for this specific JSON
    stack = []
    duplicates = []
    
    def check_duplicates(ordered_pairs):
        seen = {}
        for k, v in ordered_pairs:
            if k in seen:
                duplicates.append(k)
            seen[k] = v
        return dict(ordered_pairs)

    json.loads(content, object_pairs_hook=check_duplicates)
    
    unique_dupes = sorted(list(set(duplicates)))
    print(f"Duplicates found: {unique_dupes}")
    
    for dupe in unique_dupes:
        print(f"\nOccurrences of '{dupe}':")
        pattern = re.compile(f'"{dupe}"\\s*:')
        for i, line in enumerate(lines):
            if pattern.search(line):
                # Try to find the context (parent key)
                parent = "unknown"
                for j in range(i-1, -1, -1):
                    # Look for lines that look like "key": {
                    match = re.search(r'"([^"]+)"\s*:\s*\{', lines[j])
                    if match:
                        parent = match.group(1)
                        # Check indentation to be somewhat sure
                        if lines[j].startswith(line[:lines[j].find('"')]):
                            # This is likely a sibling or deeper, not a parent
                            # Real parent should have less indentation
                            pass
                        else:
                            break
                print(f"  Line {i+1}: {line.strip()} (Context hint: near '{parent}')")

find_duplicates('apps/web/messages/en.json')
find_duplicates('apps/web/messages/ar.json')
