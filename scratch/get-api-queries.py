import subprocess

def main():
    print("Fetching docker logs...")
    result = subprocess.run(
        ["docker", "logs", "logirest-api", "--since", "2m"],
        capture_output=True,
        text=True,
        errors="ignore"
    )
    
    logs = result.stdout + result.stderr
    lines = logs.split("\n")
    
    print(f"Total log lines fetched: {len(lines)}")
    
    # Filter for purchase_requests
    queries = [line for line in lines if "purchase_requests" in line or "purchase_orders" in line]
    
    print("\n--- Filtered Query Logs ---")
    for q in queries[-100:]:  # Last 100 queries
        print(q)

if __name__ == "__main__":
    main()
