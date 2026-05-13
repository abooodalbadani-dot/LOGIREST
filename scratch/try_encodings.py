import json

encodings = ['utf-8', 'utf-16', 'utf-16-le', 'utf-16-be', 'windows-1256', 'iso-8859-6']

for enc in encodings:
    try:
        with open('apps/web/messages/ar.json', 'r', encoding=enc) as f:
            content = f.read(100)
            print(f"Encoding {enc}: Success. First 100 chars: {content}")
    except Exception as e:
        print(f"Encoding {enc}: Failed. {e}")
