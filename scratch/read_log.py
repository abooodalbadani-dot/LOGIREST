import json
import os

log_path = r"C:\Users\Qursan\.gemini\antigravity\brain\29fa2890-1a40-46d8-bd76-9a763d162f87\.system_generated\logs\overview.txt"
output_path = r"scratch/last_user_prompt.txt"

if os.path.exists(log_path):
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '"step_index":620,' in line:
                try:
                    data = json.loads(line)
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    with open(output_path, 'w', encoding='utf-8') as out:
                        out.write(data['content'])
                    print("Successfully extracted user request to scratch/last_user_prompt.txt")
                    break
                except Exception as e:
                    print("Error parsing line:", e)
else:
    print("Log file not found:", log_path)
