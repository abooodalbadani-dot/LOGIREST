import glob
for f in glob.glob('src/**/*.controller.ts', recursive=True):
    content = open(f, encoding='utf8').read()
    if r"\'role\'" in content:
        print('fixing', f)
        content = content.replace(r"\'role\'", r"'role'")
        open(f, 'w', encoding='utf8').write(content)
