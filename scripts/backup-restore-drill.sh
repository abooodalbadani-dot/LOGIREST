#!/usr/bin/env bash
set -euo pipefail

# LogiRest Backup Recovery Drill Script
# Target: scripts/backup-restore-drill.sh

START_TIME=$(date +%s)
echo "=== Starting Database Restore Drill ==="

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "${PROJECT_ROOT}/.env" ]; then
    echo "Loading environment from .env file..."
    # Export variables from .env file, ignoring comments and blank lines
    export $(grep -v '^#' "${PROJECT_ROOT}/.env" | grep -v '^$' | xargs)
fi

# Set S3 & AWS configurations
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-logirest-backups}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-eu-west-1}"
AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-dev-access-key-id}"
AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-dev-secret-access-key}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}"

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION}"

TEMP_SQL="temp_backup.sql"

# Clean up any leftover temp files
rm -f "temp_backup.enc" "$TEMP_SQL"

echo "Downloading, decrypting and decompressing backup file using Node.js..."
export BACKUP_S3_BUCKET
export BACKUP_S3_REGION
export BACKUP_S3_ACCESS_KEY_ID
export BACKUP_S3_SECRET_ACCESS_KEY
export BACKUP_ENCRYPTION_KEY
export BACKUP_S3_ENDPOINT

node -e '
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

const s3Client = new S3Client({
  region: process.env.BACKUP_S3_REGION || "eu-west-1",
  endpoint: process.env.BACKUP_S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID || "dev-access-key-id",
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY || "dev-secret-access-key",
  },
});

async function main() {
  const bucket = process.env.BACKUP_S3_BUCKET || "logirest-backups";
  const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket }));
  if (!listRes.Contents || listRes.Contents.length === 0) {
    throw new Error("No backups found in bucket " + bucket);
  }
  listRes.Contents.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());
  const latest = listRes.Contents[0];
  console.log("Latest backup: " + latest.Key + " (" + latest.Size + " bytes)");

  const getRes = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: latest.Key }));
  
  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
    
  const file = await streamToBuffer(getRes.Body);
  
  const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!encryptionKeyHex) throw new Error("BACKUP_ENCRYPTION_KEY env var is missing");
  const key = Buffer.from(encryptionKeyHex, "hex");
  
  const iv = file.subarray(0, 16);
  const encrypted = file.subarray(16);
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const decompressed = zlib.gunzipSync(compressed);
  
  fs.writeFileSync("temp_backup.sql", decompressed);
  console.log("Backup successfully decrypted and decompressed to temp_backup.sql");
}

main().catch(err => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
'

if [ ! -f "$TEMP_SQL" ] || [ ! -s "$TEMP_SQL" ]; then
  echo "ERROR: Decrypted SQL file is empty or does not exist." >&2
  exit 1
fi
echo "Backup successfully decrypted to ${TEMP_SQL}"

# Start Sandbox Postgres container
SANDBOX_CONTAINER="logirest-db-sandbox"
echo "Starting PostgreSQL sandbox container '${SANDBOX_CONTAINER}'..."
docker rm -f "${SANDBOX_CONTAINER}" >/dev/null 2>&1 || true

docker run --name "${SANDBOX_CONTAINER}" \
  -e POSTGRES_DB=logirest_sandbox \
  -e POSTGRES_USER=logirest \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5433:5432 \
  -d postgres:16-alpine

# Wait for database to be ready
echo "Waiting for sandbox database to start..."
until docker exec "${SANDBOX_CONTAINER}" pg_isready -U logirest -d logirest_sandbox >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo ""
echo "Sandbox database is ready."

# Restore dump
echo "Restoring database SQL into sandbox..."
docker exec -i "${SANDBOX_CONTAINER}" psql -U logirest -d logirest_sandbox < "$TEMP_SQL" >/dev/null

# Verify restoration using row-count check
echo "Verifying database restoration..."
ROW_COUNT=$(docker exec -i "${SANDBOX_CONTAINER}" psql -U logirest -d logirest_sandbox -t -A -c "SELECT COUNT(*) FROM users;")

echo "Database verification successful. Total users in restored database: ${ROW_COUNT}"

# Cleanup
echo "Cleaning up sandbox environment..."
docker rm -f "${SANDBOX_CONTAINER}" >/dev/null 2>&1 || true
rm -f "$TEMP_SQL"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
echo "=== Recovery Drill Completed ==="
echo "Total Elapsed Time: ${ELAPSED} seconds."

# 4-hour RTO (Recovery Time Objective) threshold is 14400 seconds
if [ ${ELAPSED} -lt 14400 ]; then
  echo "[PASS] Restore completed in $((ELAPSED/60)) minutes (< 240 minutes)"
  exit 0
else
  echo "[FAIL] Restore took too long (${ELAPSED}s >= 14400s)"
  exit 1
fi
