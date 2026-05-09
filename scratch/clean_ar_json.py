import json
import sys

def clean_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Try to parse it. If it has duplicate keys, standard json.loads will handle it (last one wins)
        # However, if the structure is broken (e.g. nested objects not closed properly), it will fail.
        data = json.loads(content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Successfully cleaned {file_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    clean_json('apps/web/messages/ar.json')
