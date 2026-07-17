#!/usr/bin/env sh
set -eu

# LogiRest Containerized PostgreSQL & Asset Backup Script
# Location: scripts/db-backup.sh

BACKUP_DIR="/backups"
if [ -z "${PGPASSWORD:-}" ]; then
  export PGPASSWORD="SecureDbPass2026!"
fi
if [ -z "${PGUSER:-}" ]; then
  export PGUSER="logirest"
fi
if [ -z "${PGDATABASE:-}" ]; then
  export PGDATABASE="logirest"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/logirest_backup_${TIMESTAMP}.sql.gz.enc"
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/uploads_backup_${TIMESTAMP}.tar.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database and asset backup..." >> "$LOG_FILE"

# Ensure aws-cli is installed (alpine image lacks it by default)
if ! command -v aws >/dev/null 2>&1; then
  echo "[$(date)] Installing aws-cli..." >> "$LOG_FILE"
  apk add --no-cache aws-cli >> "$LOG_FILE" 2>&1
fi

# Ensure openssl is installed
if ! command -v openssl >/dev/null 2>&1; then
  echo "[$(date)] Installing openssl..." >> "$LOG_FILE"
  apk add --no-cache openssl >> "$LOG_FILE" 2>&1
fi

# Clean and validate BACKUP_ENCRYPTION_KEY
BACKUP_ENCRYPTION_KEY=$(printf "%s" "${BACKUP_ENCRYPTION_KEY:-}" | tr -d '\r\n ')
if [ -z "$BACKUP_ENCRYPTION_KEY" ] || [ ${#BACKUP_ENCRYPTION_KEY} -ne 64 ]; then
  BACKUP_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
fi

BACKUP_S3_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-minioadmin}"
BACKUP_S3_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-minioadmin}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-logirest-backups}"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-http://minio:9000}"

export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"

AWS_ARGS="--endpoint-url ${BACKUP_S3_ENDPOINT}"

# 1. Database Backup & Encryption
echo "[$(date)] Executing pg_dump and encrypting output..." >> "$LOG_FILE"

# Generate random 16-byte IV in hex
IV_HEX=$(openssl rand -hex 16)

# Write the IV as raw binary bytes to the output file first
if ! printf "$(echo -n "$IV_HEX" | sed 's/\(..\)/\\x\1/g')" > "$BACKUP_FILE"; then
  echo "[$(date)] ERROR: Failed to write IV to backup file." >> "$LOG_FILE"
  exit 1
fi

# Append the AES-256-CBC encrypted gzip dump
if pg_dump -h "${PGHOST:-db}" -U "${PGUSER:-logirest}" -d "${PGDATABASE:-logirest}" | gzip | openssl enc -aes-256-cbc -K "$BACKUP_ENCRYPTION_KEY" -iv "$IV_HEX" -nosalt >> "$BACKUP_FILE"; then
  echo "[$(date)] SUCCESS: Local encrypted database backup created at ${BACKUP_FILE}" >> "$LOG_FILE"
else
  echo "[$(date)] ERROR: pg_dump or encryption failed." >> "$LOG_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# 2. Uploads Directory Backup
if [ -d "/uploads" ]; then
  echo "[$(date)] Creating tarball for uploads directory /uploads..." >> "$LOG_FILE"
  if tar -czf "$UPLOADS_BACKUP_FILE" -C /uploads . ; then
    echo "[$(date)] SUCCESS: Local uploads backup created at ${UPLOADS_BACKUP_FILE}" >> "$LOG_FILE"
  else
    echo "[$(date)] ERROR: Failed to create uploads tarball." >> "$LOG_FILE"
    rm -f "$UPLOADS_BACKUP_FILE"
    exit 1
  fi
else
  echo "[$(date)] WARNING: /uploads directory not found. Skipping uploads backup." >> "$LOG_FILE"
fi

# Ensure S3 bucket exists (MinIO doesn't auto-create)
echo "[$(date)] Checking if S3 bucket s3://${BACKUP_S3_BUCKET} exists..." >> "$LOG_FILE"
if ! aws ${AWS_ARGS} s3 ls "s3://${BACKUP_S3_BUCKET}" >/dev/null 2>&1; then
  echo "[$(date)] Creating S3 bucket s3://${BACKUP_S3_BUCKET}..." >> "$LOG_FILE"
  aws ${AWS_ARGS} s3 mb "s3://${BACKUP_S3_BUCKET}" >> "$LOG_FILE" 2>&1
fi

# 3. Upload to S3 & Fail Loudly
echo "[$(date)] Uploading database backup to S3..." >> "$LOG_FILE"
if aws ${AWS_ARGS} s3 cp "$BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/logirest_backup_${TIMESTAMP}.sql.gz.enc" >> "$LOG_FILE" 2>&1; then
  echo "[$(date)] SUCCESS: Database backup uploaded to s3://${BACKUP_S3_BUCKET}/logirest_backup_${TIMESTAMP}.sql.gz.enc" >> "$LOG_FILE"
else
  echo "[$(date)] ERROR: Database backup S3 upload failed." >> "$LOG_FILE"
  exit 1
fi

if [ -f "$UPLOADS_BACKUP_FILE" ]; then
  echo "[$(date)] Uploading uploads backup to S3..." >> "$LOG_FILE"
  if aws ${AWS_ARGS} s3 cp "$UPLOADS_BACKUP_FILE" "s3://${BACKUP_S3_BUCKET}/uploads_backup_${TIMESTAMP}.tar.gz" >> "$LOG_FILE" 2>&1; then
    echo "[$(date)] SUCCESS: Uploads backup uploaded to s3://${BACKUP_S3_BUCKET}/uploads_backup_${TIMESTAMP}.tar.gz" >> "$LOG_FILE"
  else
    echo "[$(date)] ERROR: Uploads backup S3 upload failed." >> "$LOG_FILE"
    exit 1
  fi
fi

# Write successful backup heartbeat timestamp file
echo "$TIMESTAMP" > "${BACKUP_DIR}/last_success"
PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-SecureDbPass2026!}}" psql -h "${PGHOST:-db}" -U "${PGUSER:-${DB_USER:-logirest}}" -d "${PGDATABASE:-${DB_NAME:-logirest}}" -c "INSERT INTO \"SystemSetting\" (id, key, value, version, \"updatedAt\") VALUES ('last_backup_at', 'last_backup_at', NOW()::text, 1, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, version = \"SystemSetting\".version + 1, \"updatedAt\" = NOW();" >> "$LOG_FILE" 2>&1 || true

# 4. Prune local backups older than 7 days
echo "[$(date)] Pruning local database backups older than 7 days..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "logirest_backup_*.sql.gz.enc" -type f -mtime +7 -delete >> "$LOG_FILE" 2>&1

echo "[$(date)] Pruning local uploads backups older than 7 days..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -type f -mtime +7 -delete >> "$LOG_FILE" 2>&1

echo "[$(date)] Backup process completed successfully." >> "$LOG_FILE"
