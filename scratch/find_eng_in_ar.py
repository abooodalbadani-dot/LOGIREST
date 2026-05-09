import json
import re
import os

def find_english_in_arabic(data, path=""):
    results = []
    if isinstance(data, dict):
        for key, value in data.items():
            new_path = f"{path}.{key}" if path else key
            results.extend(find_english_in_arabic(value, new_path))
    elif isinstance(data, list):
        for i, value in enumerate(data):
            new_path = f"{path}[{i}]"
            results.extend(find_english_in_arabic(value, new_path))
    elif isinstance(data, str):
        # Regex to find English words
        # We look for sequences of 3 or more English letters
        if re.search(r'[a-zA-Z]{3,}', data):
            # Exclude common placeholders or technical terms
            if not re.fullmatch(r'\{[a-zA-Z0-9_]+\}', data) and not re.fullmatch(r'[A-Z0-9_]+', data):
                # Also exclude some specific common technical words like "LogiRest", "SAR", "Excel"
                excluded = ['LogiRest', 'Excel', 'contact@restaurant.com', 'CSV', 'PDF']
                if not any(ex in data for ex in excluded):
                    results.append((path, data))
    return results

try:
    with open('E:/Kitchen‑Store Inventory System/apps/web/messages/ar.json', 'r', encoding='utf-8') as f:
        ar_data = json.load(f)
    
    eng_strings = find_english_in_arabic(ar_data)
    
    os.makedirs('E:/Kitchen‑Store Inventory System/scratch', exist_ok=True)
    with open('E:/Kitchen‑Store Inventory System/scratch/eng_in_ar.txt', 'w', encoding='utf-8') as f:
        for path, val in eng_strings:
            f.write(f"{path}: {val}\n")
    
    print(f"Found {len(eng_strings)} potential English strings in ar.json")
except Exception as e:
    print(f"Error: {e}")
