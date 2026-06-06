with open(r"apps/web/messages/en.json", 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if "pr" in line:
            print(f"Line {idx+1}: {line.strip()}")
        if "new_intent" in line:
            print(f"Line {idx+1} (new_intent): {line.strip()}")
