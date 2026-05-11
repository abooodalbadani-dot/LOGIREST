import json
import os

def check_parity():
    en_path = 'apps/web/messages/en.json'
    ar_path = 'apps/web/messages/ar.json'
    
    if not os.path.exists(en_path) or not os.path.exists(ar_path):
        print("Missing translation files")
        return

    en = json.load(open(en_path, encoding='utf-8'))
    ar = json.load(open(ar_path, encoding='utf-8'))

    def compare(d1, d2, path=''):
        for k in d1:
            current_path = f"{path}.{k}" if path else k
            if k not in d2:
                print(f"Missing in AR: {current_path}")
            elif isinstance(d1[k], dict) and isinstance(d2.get(k), dict):
                compare(d1[k], d2[k], current_path)
        
        for k in d2:
            current_path = f"{path}.{k}" if path else k
            if k not in d1:
                print(f"Missing in EN: {current_path}")

    compare(en, ar)

if __name__ == "__main__":
    check_parity()
