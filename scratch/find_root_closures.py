en_path = r"e:\Kitchen‑Store Inventory System\apps\web\messages\en.json"

with open(en_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

level = 0
for i, line in enumerate(lines):
    opened = line.count('{')
    closed = line.count('}')
    
    level += opened - closed
    
    if level == 0 and i < len(lines) - 1 and any(c.strip() for c in line):
        print(f"ROOT closed at line {i+1}: {line.strip()}")
    if level == 1 and i < len(lines) - 1 and closed > 0 and any(c.strip() for c in line):
        # This might be normal for a top-level key finishing
        pass
