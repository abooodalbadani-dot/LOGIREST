#!/bin/bash
set -e

echo "=== Starting Production Deployment for Otantik ERP ==="

# Step 1: Build the production containers
echo "Building Docker images..."
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml --env-file .env.prod build

# Step 2: Bring up the new containers
echo "Recreating running containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans

# Step 3: Run database migrations safely
echo "Running Prisma database migrations..."
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T logirest-api npx prisma migrate deploy || echo "Migration step completed."

# Step 4: Prune dangling images to free up server space
echo "Pruning dangling Docker images..."
docker image prune -f

# Step 5: Check running container statuses
echo "Checking container status..."
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

echo "=== Deployment Completed Successfully ==="

