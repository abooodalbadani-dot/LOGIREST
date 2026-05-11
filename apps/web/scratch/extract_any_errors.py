import json

with open('lint-report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for file in data:
    path = file.get('filePath', '')
    for msg in file.get('messages', []):
        if msg.get('ruleId') == '@typescript-eslint/no-explicit-any':
            try:
                print(f"{path}:{msg.get('line')}:{msg.get('column')}: {msg.get('message')}")
            except UnicodeEncodeError:
                # Fallback for paths with special characters
                safe_path = path.encode('ascii', 'replace').decode('ascii')
                print(f"{safe_path}:{msg.get('line')}:{msg.get('column')}: {msg.get('message')}")

