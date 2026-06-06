import json
import os

report_path = 'e:/kitchen-store-inventory-system/apps/web/lint-report.json'

def try_read(path, encoding):
    try:
        with open(path, 'r', encoding=encoding) as f:
            content = f.read()
            if not content:
                return None
            start = content.find('[')
            end = content.rfind(']') + 1
            if start == -1 or end == 0:
                return None
            return json.loads(content[start:end])
    except:
        return None

data = try_read(report_path, 'utf-16')
if data is None:
    data = try_read(report_path, 'utf-8')

if data is None:
    print("Could not read JSON from report")
    exit(1)

error_files = {}

for result in data:
    messages = result.get('messages', [])
    errors = [m for m in messages if m.get('severity') == 2]
    if errors:
        rel_path = os.path.relpath(result['filePath'], 'e:/kitchen-store-inventory-system/apps/web')
        error_files[rel_path] = len(errors)

# Sort by number of errors descending
sorted_files = dict(sorted(error_files.items(), key=lambda item: item[1], reverse=True))

print(json.dumps(sorted_files, indent=2))
