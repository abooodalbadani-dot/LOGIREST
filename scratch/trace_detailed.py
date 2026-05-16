en_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

level = 0
for i, line in enumerate(lines):
    # Update level based on line contents
    opened = line.count('{')
    closed = line.count('}')
    
    # Check for specific suspicious lines
    if 2950 <= i+1 <= 2960:
        print(f"Line {i+1} (Start Level: {level}): {line.strip()}")
        
    level += opened - closed
    
    if 2950 <= i+1 <= 2960:
         print(f"Line {i+1} (End Level: {level})")

    if level == 0 and i < len(lines) - 1 and not line.strip() == "}":
        pass # ignore empty lines or just final closing
    if level == 0 and i < len(lines) - 1:
         # Find context
         if any(c.strip() for c in line):
            print(f"!!! ROOT CLOSED at line {i+1} (Level hit 0)")
