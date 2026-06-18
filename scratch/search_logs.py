import os

log_file = 'scratch/api_logs_utf8.log'
if not os.path.exists(log_file):
    log_file = 'scratch/api_logs.log'

print(f"Searching log file: {log_file}")
count = 0
with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'settings/currency' in line or 'currency' in line.lower() and 'settings' in line.lower():
            print(line.strip())
            count += 1
            if count > 50:
                print("Too many results, truncating...")
                break
if count == 0:
    print("No settings/currency logs found.")
