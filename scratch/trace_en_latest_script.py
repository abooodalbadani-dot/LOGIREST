
en_path = r"apps/web/messages/en.json"
out_path = r"scratch/trace_en_latest.txt"

with open(en_path, 'r', encoding='utf-8') as f:
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
            # level = 0 # Don't reset, just see where it goes
