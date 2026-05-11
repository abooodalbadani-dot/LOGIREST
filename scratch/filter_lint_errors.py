import json
import sys

try:
    with open('apps/web/lint-report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    errors = []
    for result in data:
        for message in result.get('messages', []):
            if message.get('severity') == 2: # 2 is error
                errors.append({
                    'filePath': result['filePath'],
                    'line': message.get('line'),
                    'column': message.get('column'),
                    'ruleId': message.get('ruleId'),
                    'message': message.get('message')
                })

    print(json.dumps(errors, indent=2))
except Exception as e:
    print(f"Error: {e}")
