# Operational Quickstart: Phase 0 — Pre-Deploy Blockers

**Branch**: `038-phase0-pre-deploy-blockers` | **Date**: 2026-05-29

This quickstart guide provides administrators and developers with the commands and validation checklists to configure, test, and maintain the Phase 0 operational changes.

---

## 1. Local Environment Preparation & Verification

Before executing any deployment tasks, copy the environment template and inspect the variables:

```bash
# Copy template file
cp docker-compose.env.example .env

# Generate high-entropy JWT secrets for production
openssl rand -hex 32 # Access Secret
openssl rand -hex 32 # Refresh Secret
```

### Verification: Zod Validation Crash Check
To verify that weak default secrets are successfully caught and block startup in production:

1. In your `.env` file, set `NODE_ENV=production` and `JWT_ACCESS_SECRET=dev-jwt-access-secret-key-at-least-32-chars-long`.
2. Start the NestJS API:
   ```bash
   npm run start:dev --filter=api
   ```
3. **Expected Result**: The server MUST crash immediately during the bootstrap phase, printing a Zod validation error to the terminal.

---

## 2. Docker Compose Commands

### Booting the Stack with Health Checks
To start the services in their strict dependency order:

```bash
# Build and start services in the background
docker compose up -d --build

# Verify container health status
docker compose ps
```

### Simulating a Service Crash (Verification of TASK-03)
To verify that the `unless-stopped` restart policy automatically recovers crashed containers:

```bash
# Forcibly terminate the api container process
docker compose kill api

# Check status within 5 seconds - should show "up" (restarting/healthy)
docker compose ps api
```

---

## 3. Manual Database Seeding (Verification of TASK-05)

Since seeding is completely decoupled from the container startup sequence in production, run the seeding operation manually during fresh environment configurations:

```bash
# Execute seeding inside the running api container
docker compose exec api npx prisma db seed
```

### Idempotency Validation
Run the command a second time:

```bash
docker compose exec api npx prisma db seed
```

**Expected Result**: The execution completes with exit code `0` and throws absolutely no unique key constraint violations or duplicate records errors.

---

## 4. Database Backup & Restore Procedures (Verification of TASK-07)

### Scheduling Daily Backups
Add a cron job on the host system to run the backup script every night at 3:00 AM:

```bash
# Edit crontab
crontab -e

# Insert this line (ensures output is logged to system logs)
0 3 * * * /bin/bash /opt/logirest/scripts/backup.sh >> /var/log/logirest-backup.log 2>&1
```

### Manual Backup Run
To execute a point-in-time backup manually:

```bash
# Make script executable
chmod +x scripts/backup.sh

# Run backup
./scripts/backup.sh
```

**Expected Result**: A compressed database dump file is saved in `/backups/logirest/logirest_YYYYMMDD_HHMMSS.dump`.

### Database Restore Run
To restore the database using a dump file:

```bash
# Make script executable
chmod +x scripts/restore.sh

# Run restore (requires the backup file path as parameter)
./scripts/restore.sh /backups/logirest/logirest_20260529_030000.dump
```

*Note: The restore script will require the operator to type exactly `RESTORE` to confirm the action, preventing catastrophic accidental drops.*
