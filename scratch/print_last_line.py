import json
import os

transcript_path = r"C:\Users\Qursan\.gemini\antigravity-ide\brain\e544082f-bead-49ea-a617-60d089194a56\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Find the latest USER_INPUT (which should be the current user request)
for i in range(len(lines) - 1, -1, -1):
    try:
        data = json.loads(lines[i])
        if data.get("type") == "USER_INPUT":
            print(f"Index: {i}, keys: {list(data.keys())}")
            # Write the USER_INPUT metadata or full data to scratch
            output_path = r"e:\kitchen-store-inventory-system\scratch\latest_user_input.json"
            with open(output_path, 'w', encoding='utf-8') as out_f:
                json.dump(data, out_f, indent=2)
            print("Successfully dumped to latest_user_input.json")
            break
    except Exception as e:
        pass
