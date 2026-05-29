#!/usr/bin/env bash
set -euo pipefail

# LogiRest Interactive PostgreSQL Restore Script
# Target: scripts/restore.sh

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup_file.dump>" >&2
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file '${BACKUP_FILE}' does not exist." >&2
    exit 1
fi

# Load environment variables if .env file exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if [ -f "${PROJECT_ROOT}/.env" ]; then
    export $(grep -v '^#' "${PROJECT_ROOT}/.env" | xargs)
fi

DB_USER="${DB_USER:-logirest}"
DB_NAME="${DB_NAME:-logirest}"
CONTAINER_NAME="${CONTAINER_NAME:-logirest-db}"

# Ensure PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running." >&2
    exit 1
fi

echo "================================================================="
echo "WARNING: YOU ARE ABOUT TO RESTORE THE LOGIREST DATABASE"
echo "================================================================="
echo "Database to restore: ${DB_NAME}"
echo "Target Container:    ${CONTAINER_NAME}"
echo "Backup File:         ${BACKUP_FILE}"
echo "-----------------------------------------------------------------"
echo "THIS WILL ERASE ALL CURRENT DATA IN DATABASE '${DB_NAME}'!"
echo "================================================================="
echo

# Prompt operator for double confirmation
read -rp "To confirm this action, please type 'RESTORE': " CONFIRMATION

if [ "$CONFIRMATION" != "RESTORE" ]; then
    echo "Action aborted by operator."
    exit 0
fi

echo "Starting restoration process..."

# Terminate all active connections to the database to prevent pg_restore failures
echo "Terminating active connections to database '${DB_NAME}'..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${DB_NAME}' AND pid <> pg_backend_pid();" || true

# Drop and recreate the database to ensure a completely clean state
echo "Dropping database '${DB_NAME}'..."
docker exec -i "$CONTAINER_NAME" dropdb -U "$DB_USER" --if-exists "$DB_NAME"

echo "Creating database '${DB_NAME}'..."
docker exec -i "$CONTAINER_NAME" createdb -U "$DB_USER" "$DB_NAME"

# Restore database using pg_restore
# pg_restore options:
#   -U : Username
#   -d : Database name
#   -v : Verbose
echo "Running pg_restore..."
if docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"; then
    echo "SUCCESS: Database restored successfully from ${BACKUP_FILE}"
else
    echo "ERROR: pg_restore failed." >&2
    exit 1
fi
