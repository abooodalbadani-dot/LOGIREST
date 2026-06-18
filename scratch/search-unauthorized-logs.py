import os

log_file = 'scratch/api_logs_utf8.log'
if not os.path.exists(log_file):
    log_file = 'scratch/api_logs.log'

print(f"Searching log file: {log_file}")
count = 0
with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
    # Read last 5000 lines
    lines = f.readlines()
    last_lines = lines[-5000:]
    for line in last_lines:
        if 'Unauthorized access attempt' in line or 'ForbiddenException' in line or 'WORKFLOW' in line:
            print(line.strip())
            count += 1
if count == 0:
    print("No relevant logs found in the last 5000 lines.")
