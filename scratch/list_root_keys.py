import os

def list_root_keys(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found")
        return
    
    with open(filename, 'r', encoding='utf-8') as f:
        level = 0
        for i, line in enumerate(f):
            stripped = line.strip()
            # Basic brace counting (not perfect for strings containing braces, but should work here)
            if '{' in stripped:
                if level == 0:
                    # Root opening
                    pass
                elif level == 1:
                    # Root key
                    if stripped.startswith('"'):
                        print(f"Line {i+1}: {stripped}")
                level += stripped.count('{')
            if '}' in stripped:
                level -= stripped.count('}')

print("EN Root Keys:")
list_root_keys('apps/web/messages/en.json')
print("\nAR Root Keys:")
list_root_keys('apps/web/messages/ar.json')
