
import os

def list_root_keys(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found")
        return
    
    print(f"Analyzing {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        level = 0
        for i, line in enumerate(f):
            stripped = line.strip()
            # Simple count
            opened = stripped.count('{')
            closed = stripped.count('}')
            
            if level == 1 and opened > 0 and stripped.startswith('"'):
                print(f"Line {i+1}: {stripped}")
            
            level += opened - closed
            
            if level == 0 and i > 0 and i < 3526: # Skip first and last
                # We hit level 0, which means the next thing at level 1 is actually at level 0 now
                # This script needs to handle the fact that we might be AT level 0
                pass
            
            if level < 0:
                # print(f"ERROR: Level dropped below 0 at line {i+1}")
                # Reset to 0 to continue finding "top level" keys that were shifted
                level = 0

print("EN Root Keys:")
list_root_keys(r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json")
print("\nAR Root Keys:")
list_root_keys(r"e:\Kitchen‑Store Inventory System\apps\web\messages\ar.json")
