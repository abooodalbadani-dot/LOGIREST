file_path = 'apps/web/messages/ar.json'
with open(file_path, 'rb') as f:
    content = f.read()

pos = 66894
start = max(0, pos - 50)
end = min(len(content), pos + 50)

print(f"Bytes around {pos}:")
print(content[start:end])
print("\nHex representation:")
print(content[start:end].hex(' '))
