#!/usr/bin/env sh
set -eu

# LogiRest Containerized PostgreSQL Restore Script
# Location: scripts/db-restore.sh

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path_to_backup_file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file '${BACKUP_FILE}' does not exist." >&2
  exit 1
fi

echo "Starting database restoration process..."

# Enforce environment defaults
PGHOST="${PGHOST:-db}"
PGUSER="${PGUSER:-logirest}"
PGDATABASE="${PGDATABASE:-logirest}"

# Terminate all active connections to the database to prevent dropdb/pg_restore failures
echo "Terminating active connections to database '${PGDATABASE}'..."
PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -U "${PGUSER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" || true

# Drop and recreate the database to ensure a completely clean state
echo "Dropping database '${PGDATABASE}'..."
PGPASSWORD="${PGPASSWORD}" dropdb -h "${PGHOST}" -U "${PGUSER}" --if-exists "${PGDATABASE}"

echo "Creating database '${PGDATABASE}'..."
PGPASSWORD="${PGPASSWORD}" createdb -h "${PGHOST}" -U "${PGUSER}" "${PGDATABASE}"

# Restore from compressed SQL dump
echo "Restoring database from ${BACKUP_FILE}..."
if gunzip -c "$BACKUP_FILE" | PGPASSWORD="${PGPASSWORD}" psql -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}"; then
  echo "SUCCESS: Database restored successfully from ${BACKUP_FILE}"
else
  echo "ERROR: Database restore failed." >&2
  exit 1
fi
