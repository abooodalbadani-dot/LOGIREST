import re
import json

def recursive_merge(d1, d2):
    for k, v in d2.items():
        if k in d1 and isinstance(d1[k], dict) and isinstance(v, dict):
            recursive_merge(d1[k], v)
        else:
            d1[k] = v

def object_pairs_hook_merge(pairs):
    d = {}
    for k, v in pairs:
        if k in d and isinstance(d[k], dict) and isinstance(v, dict):
            recursive_merge(d[k], v)
        else:
            d[k] = v
    return d

def solve():
    file_path = 'apps/web/messages/ar.json'
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # 1. Remove all premature closures of the root object
    # Premature closure looks like:
    # }
    # }
    # "next_key": ...
    # We want to replace it with a comma if it's followed by a key, or just remove it.
    
    # First, let's remove any literal corruption we saw
    content = re.sub(r'"export": "تصدير .*?}\s*}\s*', r'"export": "تصدير",\n', content)
    
    # Now find any other occurrences of }\n} that are NOT at the end of the file
    # We use a lookahead to ensure there's more content
    content = re.sub(r'}\s*}\s*(?=\s*"[a-zA-Z0-9_]+":)', ',\n', content)
    
    # Also handle single } premature closure
    content = re.sub(r'}\s*(?=\s*"[a-zA-Z0-9_]+":)', ',\n', content)

    # Wrap it in { } just in case it was missing the start or end
    content = content.strip()
    if not content.startswith('{'):
        content = '{' + content
    if not content.endswith('}'):
        content = content + '}'

    try:
        data = json.loads(content, object_pairs_hook=object_pairs_hook_merge)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Successfully repaired ar.json using regex and merge hook.")
    except Exception as e:
        print(f"Error: {e}")
        # Print the area around the error
        if hasattr(e, 'pos'):
            start = max(0, e.pos - 100)
            end = min(len(content), e.pos + 100)
            print("Error context:")
            print(repr(content[start:end]))

if __name__ == "__main__":
    solve()
