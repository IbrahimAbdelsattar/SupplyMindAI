#!/bin/bash
set -e

echo "Running health checks..."

# Check backend health
curl -s -f http://localhost:8000/api/v1/health > /dev/null
if [ $? -eq 0 ]; then
  echo "Backend is healthy."
else
  echo "Backend health check failed."
fi

echo "All services healthy."
