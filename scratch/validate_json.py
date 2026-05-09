import json
import sys

def validate_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json.load(f)
        print(f"{file_path} is valid JSON")
    except Exception as e:
        print(f"Error in {file_path}: {e}")

validate_json('apps/web/messages/en.json')
validate_json('apps/web/messages/ar.json')
