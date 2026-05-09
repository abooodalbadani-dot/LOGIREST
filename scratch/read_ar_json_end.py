with open('apps/web/messages/ar.json', 'rb') as f:
    f.seek(-2000, 2)
    print(repr(f.read().decode('utf-8', errors='replace')))
