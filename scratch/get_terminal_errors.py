import json
import os

transcript_path = r"C:\Users\Qursan\.gemini\antigravity-ide\brain\e544082f-bead-49ea-a617-60d089194a56\.system_generated\logs\transcript.jsonl"

if not os.path.exists(transcript_path):
    print("Transcript not found")
    exit(1)

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in transcript: {len(lines)}")

# Let's search from the end for the latest USER_INPUT
for i in range(len(lines) - 1, -1, -1):
    try:
        data = json.loads(lines[i])
        if data.get("source") == "USER_EXPLICIT" and data.get("type") == "USER_INPUT":
            print(f"Found USER_INPUT at line {i}")
            content = data.get("content", "")
            print("--- Content ---")
            print(content)
            print("---------------")
            break
    except Exception as e:
        pass
