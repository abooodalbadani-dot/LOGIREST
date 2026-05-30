#!/usr/bin/env sh
set -eu

# LogiRest Containerized PostgreSQL Backup Script
# Location: scripts/db-backup.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/logirest_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..." >> "$LOG_FILE"

# Ensure aws-cli is installed (alpine image lacks it by default)
if ! command -v aws >/dev/null 2>&1; then
  echo "[$(date)] Installing aws-cli..." >> "$LOG_FILE"
  apk add --no-cache aws-cli >> "$LOG_FILE" 2>&1
fi

export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"

AWS_ARGS=""
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  AWS_ARGS="--endpoint-url ${BACKUP_S3_ENDPOINT}"
fi

# Run pg_dump and compress with gzip
echo "[$(date)] Executing pg_dump for database ${PGDATABASE}..." >> "$LOG_FILE"
if pg_dump -h "${PGHOST:-db}" -U "${PGUSER:-logirest}" -d "${PGDATABASE:-logirest}" | gzip > "$BACKUP_FILE"; then
  echo "[$(date)] SUCCESS: Local compressed backup created at ${BACKUP_FILE}" >> "$LOG_FILE"
else
  echo "[$(date)] ERROR: pg_dump failed." >> "$LOG_FILE"
  exit 1
fi

# Ensure S3 bucket exists (MinIO doesn't auto-create)
echo "[$(date)] Checking if S3 bucket s3://${BACKUP_S3_BUCKET} exists..." >> "$LOG_FILE"
if ! aws ${AWS_ARGS} s3 ls "s3://${BACKUP_S3_BUCKET}" >/dev/null 2>&1; then
  echo "[$(date)] Creating S3 bucket s3://${BACKUP_S3_BUCKET}..." >> "$LOG_FILE"
  aws ${AWS_ARGS} s3 mb "s3://${BACKUP_S3_BUCKET}" >> "$LOG_FILE" 2>&1
fi

# Upload to S3-compatible storage
echo "[$(date)] Uploading backup to S3-compatible storage..." >> "$LOG_FILE"
if aws ${AWS_ARGS} s3 cp "$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/logirest_backup_${TIMESTAMP}.sql.gz" >> "$LOG_FILE" 2>&1; then
  echo "[$(date)] SUCCESS: Backup uploaded successfully to s3://${BACKUP_S3_BUCKET}/logirest_backup_${TIMESTAMP}.sql.gz" >> "$LOG_FILE"
  # Write a successful backup heartbeat timestamp file
  echo "$TIMESTAMP" > "${BACKUP_DIR}/last_success"
else
  echo "[$(date)] ERROR: S3 upload failed." >> "$LOG_FILE"
  exit 1
fi

# Prune local backups older than 7 days
echo "[$(date)] Pruning local backups older than 7 days..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "logirest_backup_*.sql.gz" -type f -mtime +7 -delete >> "$LOG_FILE" 2>&1

echo "[$(date)] Backup process completed successfully." >> "$LOG_FILE"
