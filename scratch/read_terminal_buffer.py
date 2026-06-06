import json
import sys

transcript_path = r"C:\Users\Qursan\.gemini\antigravity-ide\brain\e544082f-bead-49ea-a617-60d089194a56\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for idx in range(len(lines) - 1, -1, -1):
    try:
        data = json.loads(lines[idx])
        if data.get("source") == "USER_EXPLICIT" and data.get("type") == "USER_INPUT":
            content = data.get("content", "")
            if "18968" in content:
                with open("scratch/untruncated_user_input.txt", "w", encoding="utf-8") as out:
                    out.write(content)
                print(f"Written untruncated content of line {idx} to scratch/untruncated_user_input.txt")
                found = True
                break
    except Exception as e:
        pass

if not found:
    print("Could not find matching USER_INPUT in transcript")
