import re
import os

def check_duplicates(filename):
    if not os.path.exists(filename):
        print(f"{filename} not found")
        return
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
        common_matches = re.findall(r'\"common\": {', content)
        master_data_matches = re.findall(r'\"master_data\": {', content)
        print(f"File: {filename}")
        print(f"  'common' matches: {len(common_matches)}")
        print(f"  'master_data' matches: {len(master_data_matches)}")

check_duplicates('apps/web/messages/en.json')
check_duplicates('apps/web/messages/ar.json')
