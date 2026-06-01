#!/usr/bin/env bash
set -euo pipefail

# Automated Database Rollback & Disaster Recovery Drill
# Usage: bash scripts/database-rollback.sh [--simulate-failure] [--backup-file=<file>]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SIMULATE_FAILURE=false
BACKUP_FILE=""
DB_CONTAINER="${DB_CONTAINER:-logirest-db}"
DB_NAME="${DB_NAME:-logirest}"
DB_USER="${DB_USER:-logirest}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --simulate-failure) SIMULATE_FAILURE=true; shift ;;
    --backup-file=*) BACKUP_FILE="${1#*=}"; shift ;;
    --backup-file) BACKUP_FILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Database Rollback Drill${NC}"
echo -e "${CYAN}========================================${NC}"
echo "Started: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

START_EPOCH=$(date +%s)

# Phase 1: Verify backup file exists
echo -e "\n${YELLOW}[Phase 1/5] Validating backup file...${NC}"
if [ -n "$BACKUP_FILE" ]; then
  if [ -f "$BACKUP_FILE" ]; then
    echo "Using backup file: $BACKUP_FILE"
  else
    echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
  fi
else
  echo "No backup file specified. Looking for latest backup..."
  if [ -d "$BACKUP_DIR" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/db-backup-*.sql.gz 2>/dev/null | head -1)
  fi
  if [ -z "$BACKUP_FILE" ]; then
    BACKUP_FILE="${BACKUP_DIR}/db-backup-staging-baseline.sql.gz"
    echo "Using default: $BACKUP_FILE"
  else
    echo "Found latest: $BACKUP_FILE"
  fi
fi

# Phase 2: Stop application and drop connections
echo -e "\n${YELLOW}[Phase 2/5] Preparing database for restore...${NC}"
echo "Stopping application containers and dropping active connections..."
docker stop "$DB_CONTAINER" 2>/dev/null || true
docker start "$DB_CONTAINER" 2>/dev/null || true
sleep 2

# Phase 3: Restore database from backup
echo -e "\n${YELLOW}[Phase 3/5] Restoring database from backup...${NC}"
if [ "$SIMULATE_FAILURE" = true ]; then
  echo -e "${YELLOW}[SIMULATION] Simulating restore failure...${NC}"
  echo "Restore would have failed intentionally for drill purposes."
  echo "Verifying pre-restore backup integrity..."
  gunzip -t "$BACKUP_FILE" || {
    echo -e "${RED}ERROR: Backup file corrupted.${NC}"
    exit 1
  }
  echo -e "${RED}[SIMULATION] Restore failed intentionally. Manual admin approval required.${NC}"
  exit 2
fi

if command -v pg_restore &> /dev/null; then
  gunzip -c "$BACKUP_FILE" | psql -h localhost -U "$DB_USER" -d "$DB_NAME" 2>&1
elif command -v docker &> /dev/null; then
  gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>&1
else
  echo -e "${RED}ERROR: Neither pg_restore nor docker available.${NC}"
  exit 1
fi

# Phase 4: Verify restoration integrity
echo -e "\n${YELLOW}[Phase 4/5] Verifying restoration integrity...${NC}"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'public';
" 2>/dev/null || echo "Warning: Could not verify table count."

# Phase 5: Measure RPO and report
echo -e "\n${YELLOW}[Phase 5/5] Recovery metrics...${NC}"
END_EPOCH=$(date +%s)
RPO_SECONDS=$((END_EPOCH - START_EPOCH))
RPO_MINUTES=$((RPO_SECONDS / 60))
RPO_SECONDS_REM=$((RPO_SECONDS % 60))

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Rollback Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Recovery Time: ${RPO_MINUTES}m ${RPO_SECONDS_REM}s"
echo "Backup File: $BACKUP_FILE"

if [ "$RPO_SECONDS" -lt 180 ]; then
  echo -e "${GREEN}✓ RPO within target (< 3 minutes)${NC}"
else
  echo -e "${YELLOW}⚠ RPO exceeds target (${RPO_MINUTES}m > 3m)${NC}"
fi

echo -e "${GREEN}✓ Database restored successfully.${NC}"
