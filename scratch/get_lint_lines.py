import json
import sys

# Set encoding for output to handle special characters in paths
sys.stdout.reconfigure(encoding='utf-8')

with open('lint-results.json', 'r', encoding='utf-8-sig') as f:
    results = json.load(f)

for file in results:
    for message in file.get('messages', []):
        if message.get('ruleId') == 'react-hooks/set-state-in-effect':
            print(f"{file['filePath']}:{message['line']}:{message['column']} - {message['message']}")
