en_path = r"e:\kitchen-store-inventory-system\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

level = 0
for i, line in enumerate(lines):
    opened = line.count('{')
    closed = line.count('}')
    
    old_level = level
    level += opened - closed
    
    if level <= 1:
        # Show what's happening at the top level
        print(f"L{i+1} [Level {old_level} -> {level}]: {line.strip()}")
    
    if level < 0:
        print(f"ERROR: Level dropped below 0 at line {i+1}")
        break
