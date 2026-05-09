with open('apps/web/messages/ar.json', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

char_pos = 70455
start = max(0, char_pos - 200)
end = min(len(content), char_pos + 200)
print(repr(content[start:end]))
