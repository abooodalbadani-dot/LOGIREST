with open('apps/web/messages/ar.json', 'rb') as f:
    content = f.read()

pos = 66894
start = pos - 200
end = pos + 200
print(repr(content[start:end]))
