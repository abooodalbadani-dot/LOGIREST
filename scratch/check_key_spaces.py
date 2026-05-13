import json

def check_keys_for_spaces(path):
    with open(path, 'rb') as f:
        data = json.loads(f.read().decode('utf-8'))
    
    def walk(d, path=""):
        for k, v in d.items():
            full_path = f"{path}.{k}" if path else k
            if k != k.strip():
                print(f"Key has whitespace: '{k}' at {full_path}")
            if isinstance(v, dict):
                walk(v, full_path)

    walk(data)
    print("Done checking keys for whitespace.")

if __name__ == "__main__":
    check_keys_for_spaces('apps/web/messages/ar.json')
