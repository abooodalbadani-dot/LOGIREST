#!/usr/bin/env bash
set -euo pipefail

# LogiRest Automated PostgreSQL Backup Script
# Target: scripts/backup.sh
# Destination on host: /backups/logirest

BACKUP_DIR="${BACKUP_DIR:-/backups/logirest}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/logirest_backup_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Load environment variables if .env file exists in the directory above the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if [ -f "${PROJECT_ROOT}/.env" ]; then
    # Load variables, ignoring comments
    export $(grep -v '^#' "${PROJECT_ROOT}/.env" | xargs)
fi

DB_USER="${DB_USER:-logirest}"
DB_NAME="${DB_NAME:-logirest}"
CONTAINER_NAME="${CONTAINER_NAME:-logirest-db}"

echo "[$(date -Iseconds)] Starting database backup..." >> "$LOG_FILE"

# Ensure PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "[$(date -Iseconds)] ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >> "$LOG_FILE"
    echo "ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >&2
    exit 1
fi

# Execute pg_dump inside the container and stream to host backup file
# pg_dump options:
#   -U : Username
#   -F c : Custom format (compressed binary dump, standard for pg_restore)
#   -d : Database name
if docker exec -i "$CONTAINER_NAME" pg_dump -U "$DB_USER" -F c "$DB_NAME" > "$BACKUP_FILE"; then
    echo "[$(date -Iseconds)] SUCCESS: Backup created at ${BACKUP_FILE}" >> "$LOG_FILE"
    echo "Backup successfully created at ${BACKUP_FILE}"
else
    echo "[$(date -Iseconds)] ERROR: pg_dump failed." >> "$LOG_FILE"
    echo "ERROR: pg_dump failed." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Prune backups older than 30 days
echo "[$(date -Iseconds)] Pruning backups older than 30 days..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "logirest_backup_*.dump" -type f -mtime +30 -print -delete >> "$LOG_FILE" 2>&1

echo "[$(date -Iseconds)] Backup process completed successfully." >> "$LOG_FILE"
