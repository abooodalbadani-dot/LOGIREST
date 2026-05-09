with open('apps/web/messages/ar.json', 'rb') as f:
    f.seek(-1000, 2)
    print(f.read())
