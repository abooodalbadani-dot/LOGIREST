import json
import sys

def parse_lint(report_path):
    with open(report_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    results = []
    for entry in data:
        file_path = entry.get('filePath', '')
        messages = entry.get('messages', [])
        for msg in messages:
            rule_id = msg.get('ruleId')
            if rule_id in ['react-hooks/set-state-in-effect', '@typescript-eslint/no-explicit-any', '@typescript-eslint/no-empty-object-type']:
                results.append({
                    'file': file_path,
                    'line': msg.get('line'),
                    'rule': rule_id,
                    'message': msg.get('message')
                })
    
    for res in results:
        print(f"{res['rule']} | {res['file']}:{res['line']} | {res['message']}")

if __name__ == "__main__":
    parse_lint('apps/web/lint_report_utf8.json')
