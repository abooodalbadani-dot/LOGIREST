import subprocess

def run():
    print("Fetching docker compose logs for api...")
    res = subprocess.run(["docker", "compose", "logs", "api"], capture_output=True, text=True)
    logs = res.stdout.splitlines()
    
    print(f"Total log lines fetched: {len(logs)}")
    
    # Search for settings/currency or suppliers
    count = 0
    for line in logs:
        if 'settings/currency' in line or 'suppliers' in line or 'currency' in line:
            print(line)
            count += 1
            if count > 100:
                print("Too many matches, truncating...")
                break
    if count == 0:
        print("No matching logs found.")

if __name__ == '__main__':
    run()
