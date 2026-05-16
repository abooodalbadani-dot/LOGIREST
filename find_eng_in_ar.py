import json
import re

def find_english_in_arabic(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = []
    
    def walk(obj, path=''):
        if isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                walk(v, f"{path}[{i}]")
        elif isinstance(obj, str):
            # Ignore strings with only numbers, spaces, punctuation or placeholders like {name}
            # We want to find actual English words that should be Arabic
            clean_str = re.sub(r'\{.*?\}', '', obj) # Remove placeholders
            if re.search(r'[a-zA-Z]{3,}', clean_str): # Find words with 3+ letters
                results.append((path, obj))
    
    walk(data)
    return results

if __name__ == "__main__":
    findings = find_english_in_arabic('apps/web/messages/ar.json')
    for path, val in findings:
        print(f"{path}: {val}")
