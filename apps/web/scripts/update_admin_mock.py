import os

file_path = r'e:\kitchen-store-inventory-system\apps\web\src\lib\api\mocks\admin.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_content = content.replace("email: 'ahmed@logirest.com'", "email: 'barakat@logirest.com'")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated admin.ts")
