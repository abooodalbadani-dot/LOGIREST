import json

def get_duplicates_with_context(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We can parse the JSON manually or track structure using a custom object_pairs_hook.
    # To find duplicates with exact nesting context, we can build a parser that checks keys.
    # A simple way is to parse the file line-by-line or track stack:
    stack = []
    lines = content.splitlines()
    
    # Let's write a custom JSON decoder that prints duplicate keys inside the same object
    print(f"--- Checking duplicates in {path} ---")
    
    # We can track JSON decoding by custom decoder
    class ContextDecoder(json.JSONDecoder):
        def __init__(self, *args, **kwargs):
            super().__init__(object_pairs_hook=self.context_hook, *args, **kwargs)
            self.path = []
            
        def context_hook(self, pairs):
            seen = {}
            for k, v in pairs:
                if k in seen:
                    print(f"Duplicate key found: '{k}'")
                    print(f"  First value:  {seen[k]}")
                    print(f"  Second value: {v}")
                seen[k] = v
            return seen

    try:
        json.loads(content, cls=ContextDecoder)
    except Exception as e:
        print("Error parsing:", e)

def add_error_loading_key():
    for lang in ['en', 'ar']:
        path = f'apps/web/messages/{lang}.json'
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Add key if dashboard exists
        if 'dashboard' in data:
            if lang == 'en':
                data['dashboard']['error_loading'] = "Failed to load dashboard statistics"
            else:
                data['dashboard']['error_loading'] = "فشل في تحميل إحصائيات لوحة التحكم"
            print(f"Added 'error_loading' to {lang}.json under 'dashboard'")
            
            # Write back with exactly 2 spaces indentation and ensure_ascii=False
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n') # trailing newline
        else:
            print(f"Error: 'dashboard' root key not found in {lang}.json")

if __name__ == '__main__':
    get_duplicates_with_context('apps/web/messages/en.json')
    get_duplicates_with_context('apps/web/messages/ar.json')
    add_error_loading_key()
