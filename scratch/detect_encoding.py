import chardet

with open('apps/web/messages/ar.json', 'rb') as f:
    rawdata = f.read(10000)
    result = chardet.detect(rawdata)
    print(result)
