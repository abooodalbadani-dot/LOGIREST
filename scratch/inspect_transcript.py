import json
import os

transcript_path = r"C:\Users\Qursan\.gemini\antigravity-ide\brain\e544082f-bead-49ea-a617-60d089194a56\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Let's inspect the last 20 lines
for idx in range(max(0, len(lines) - 20), len(lines)):
    try:
        data = json.loads(lines[idx])
        print(f"Line {idx}: source={data.get('source')}, type={data.get('type')}, keys={list(data.keys())}")
        if data.get("type") == "USER_INPUT" or "18968" in str(data):
            print(f"  --> MATCHED!")
            # Print first 200 chars of stringified dict
            s = json.dumps(data)
            print(f"  Snippet: {s[:500]}")
    except Exception as e:
        print(f"Line {idx} failed to parse: {e}")
