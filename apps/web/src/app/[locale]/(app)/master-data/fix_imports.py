import glob, os, re
files = glob.glob('apps/web/src/app/**/*.tsx', recursive=True) + glob.glob('apps/web/src/features/**/*.tsx', recursive=True)
for f in files:
    if os.path.isfile(f):
        content = open(f, 'r', encoding='utf-8').read()
        if '@/components/shared/FormFooter' in content:
            content = content.replace(
                "import { FormFooter } from '@/components/shared/FormFooter';",
                "import { FormFooter } from '@/components/layouts/FormLayout';"
            )
            content = content.replace(
                "import { FormFooter } from \"@/components/shared/FormFooter\";",
                "import { FormFooter } from \"@/components/layouts/FormLayout\";"
            )
            open(f, 'w', encoding='utf-8').write(content)
            print('Updated', f)
