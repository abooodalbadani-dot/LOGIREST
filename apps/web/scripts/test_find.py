target = "Ahmed Al-Mansour"
file_path = r"e:\Kitchen‑Store Inventory System\apps\web\src\infrastructure\mock\seeds\operations.seed.ts"
try:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        if target in content:
            print(f"FOUND IT in {file_path}")
        else:
            print(f"NOT FOUND in {file_path}")
            print("Content start:", content[:100])
except Exception as e:
    print(f"ERROR: {e}")
