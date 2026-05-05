
sample = "ظ‡ظ„ ط£ظ†طھ"
try:
    # If the file was UTF-8 bytes but read as CP1256
    recovered = sample.encode('cp1256').decode('utf-8')
    print(f"Recovered (encode cp1256, decode utf-8): {recovered}")
except Exception as e:
    print(f"Failed 1: {e}")

try:
    # If the file was CP1256 bytes but read as UTF-8 (and then saved)
    # This usually means it would have replaced invalid bytes with replacement chars, 
    # but let's check.
    recovered = sample.encode('utf-8').decode('cp1256')
    print(f"Recovered (encode utf-8, decode cp1256): {recovered}")
except Exception as e:
    print(f"Failed 2: {e}")
