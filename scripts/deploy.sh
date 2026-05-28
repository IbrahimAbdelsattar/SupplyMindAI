#!/bin/bash
set -e

echo "Starting Supply Mind deployment..."

# Build and start services
docker compose up -d --build

echo "Deployment complete."
