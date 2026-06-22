import re

log_path = r"C:\Users\DBi\.gemini\antigravity-ide\brain\7ee4bdb6-6382-42a8-ae68-2e4a80b653b7\.system_generated\tasks\task-137.log"
unique_zod_errors = set()

with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if "Zod Parsing Error" in line or "Zod" in line:
            # Clean and get context
            unique_zod_errors.add(line.strip())

print(f"Found {len(unique_zod_errors)} unique Zod log entries:")
for err in sorted(list(unique_zod_errors)):
    print(err)
