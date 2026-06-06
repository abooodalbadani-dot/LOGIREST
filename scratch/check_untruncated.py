import json

with open(r"scratch/latest_user_input.json", 'r', encoding='utf-8') as f:
    data = json.load(f)

content = data.get("content", "")
print("Is '<truncated 1 lines>' in content?", "<truncated 1 lines>" in content)

# Print lines of content
lines = content.splitlines()
for idx, line in enumerate(lines[:30]):
    print(f"{idx}: {line[:100]}")
