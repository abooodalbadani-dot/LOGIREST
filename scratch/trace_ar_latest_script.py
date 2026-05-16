
ar_path = r"apps/web/messages/ar.json"
out_path = r"scratch/trace_ar_latest.txt"

with open(ar_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(out_path, 'w', encoding='utf-8') as out:
    level = 0
    for i, line in enumerate(lines):
        opened = line.count('{')
        closed = line.count('}')
        
        old_level = level
        level += opened - closed
        
        out.write(f"L{i+1} [Level {old_level} -> {level}]: {line.strip()}\n")
        
        if level < 0:
            out.write(f"ERROR: Level dropped below 0 at line {i+1}\n")
