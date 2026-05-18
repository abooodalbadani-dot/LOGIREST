import json
import os

log_path = r"C:\Users\Qursan\.gemini\antigravity\brain\67d0f9f1-d56f-43c1-aeb4-48aa123f78ce\.system_generated\logs\overview.txt"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    try:
        data = json.loads(line)
        if data.get("type") == "USER_INPUT":
            step = data.get("step_index")
            content = data.get("content")
            out_file = f"scratch/user_request_step_{step}.txt"
            with open(out_file, 'w', encoding='utf-8') as out:
                out.write(content)
            print(f"Wrote {out_file} ({len(content)} chars)")
    except Exception as e:
        print(f"Error on line {idx}: {e}")
