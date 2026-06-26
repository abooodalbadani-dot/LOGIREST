#!/bin/bash
set -e

echo "=== Starting Production Deployment for Otantik ERP ==="

# Step 1: Build the production containers
echo "Building Docker images..."
docker compose -f docker-compose.prod.yml build

# Step 2: Bring up the new containers (Docker Compose hot-swaps changed containers with minimal downtime)
echo "Recreating running containers..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Step 3: Prune dangling images to free up server space
echo "Pruning dangling Docker images..."
docker image prune -f

# Step 4: Check running container statuses
echo "Checking container status..."
docker compose -f docker-compose.prod.yml ps

echo "=== Deployment Completed Successfully ==="
