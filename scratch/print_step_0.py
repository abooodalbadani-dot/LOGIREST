import json
import os

transcript_path = r"C:\Users\Qursan\.gemini\antigravity-ide\brain\e544082f-bead-49ea-a617-60d089194a56\.system_generated\logs\transcript.jsonl"

with open(transcript_path, 'r', encoding='utf-8') as f:
    line = f.readline()

try:
    data = json.loads(line)
    print("KEYS:", list(data.keys()))
    print("STEP INDEX:", data.get("step_index"))
    print("SOURCE:", data.get("source"))
    print("TYPE:", data.get("type"))
    
    # Let's print content
    content = data.get("content", "")
    print(f"Content Length: {len(content)}")
    
    # Save the full content to a file in scratch directory so we can read it easily
    output_path = r"e:\kitchen-store-inventory-system\scratch\step_0_content.txt"
    with open(output_path, 'w', encoding='utf-8') as out_f:
        out_f.write(content)
    print(f"Full content written to {output_path}")

except Exception as e:
    print("Error parsing step 0:", e)
