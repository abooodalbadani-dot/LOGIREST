import json

def fix_json(file_path):
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Try to decode as UTF-8, replacing errors
    decoded = content.decode('utf-8', errors='replace')
    
    try:
        # Check if it's valid JSON now
        data = json.loads(decoded)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print("Fixed JSON and saved as UTF-8")
    except json.JSONDecodeError as e:
        print(f"JSON Error: {e}")
        # Print the context of the error
        start = max(0, e.pos - 50)
        end = min(len(decoded), e.pos + 50)
        print(f"Context: {decoded[start:end]}")

if __name__ == "__main__":
    fix_json('messages/ar.json')
