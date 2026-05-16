
import os

def list_root_keys(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found")
        return
    
    # print(f"Analyzing {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        level = 0
        for i, line in enumerate(f):
            stripped = line.strip()
            opened = stripped.count('{')
            closed = stripped.count('}')
            
            if level == 1 and opened > 0 and stripped.startswith('"'):
                print(f"Line {i+1}: {stripped}")
            
            level += opened - closed
            if level < 0:
                # When it drops below 0, it means we just closed the root.
                # The next key at what SHOULD be level 1 is now at level 0.
                level = 0
            if level == 0 and i > 0 and i < 3500: # Heuristic
                 # If we are at level 0, the next key will be at level 1 but we want to catch it
                 pass

print("EN Root Keys:")
list_root_keys("apps/web/messages/en.json")
print("\nAR Root Keys:")
list_root_keys("apps/web/messages/ar.json")
