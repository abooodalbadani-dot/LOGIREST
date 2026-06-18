import subprocess
import time
import threading

def stream_logs(stop_event, log_lines):
    print("Starting container logs stream...")
    # Use subprocess.Popen to stream logs in real-time
    process = subprocess.Popen(
        ["docker", "logs", "logirest-api", "-f", "--tail", "0"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        errors="ignore"
    )
    
    while not stop_event.is_set():
        line = process.stdout.readline()
        if line:
            log_lines.append(line.strip())
        else:
            time.sleep(0.01)
            
    process.terminate()

def main():
    log_lines = []
    stop_event = threading.Event()
    
    # Start streaming logs in a background thread
    t = threading.Thread(target=stream_logs, args=(stop_event, log_lines))
    t.daemon = True
    t.start()
    
    # Wait a moment for log stream to start
    time.sleep(1)
    
    # Run the E2E test script
    print("Running E2E test script...")
    test_result = subprocess.run(
        ["npx", "ts-node", "scratch/test-po-creation-live.ts"],
        capture_output=True,
        text=True,
        shell=True
    )
    print(test_result.stdout)
    
    # Wait another second for logs to settle
    time.sleep(1)
    
    # Stop log streaming
    stop_event.set()
    
    print("\n================ CONTAINER LOGS CONCURRENT TO REQUEST ================")
    for line in log_lines:
        # Filter out verbose OTEL spans unless they are db queries
        if "prisma:client:operation" in line or "prisma:engine:db_query" in line or "db.query.text" in line or "INFO" in line or "WARN" in line or "ERROR" in line:
            print(line)

if __name__ == "__main__":
    main()
