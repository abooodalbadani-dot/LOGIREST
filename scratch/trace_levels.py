en_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

level = 0
for i, line in enumerate(lines):
    # Update level based on line contents
    # This is a bit simplified but should work for finding the shift
    opened = line.count('{')
    closed = line.count('}')
    
    # Check for top-level keys before changing level
    if line.strip().startswith('"') and level == 1:
        # If it's a top-level key like "common": { or "operational": {
        if indent := len(line) - len(line.lstrip()) == 2:
            print(f"Line {i+1} (Level {level}): {line.strip()}")
            
    level += opened - closed
    if level == 0 and i < len(lines) - 1:
        print(f"!!! ROOT CLOSED at line {i+1}")
