#!/bin/bash
set -e

echo "=== Trikal Backend Entrypoint ==="

# Step 1: Wait for Postgres
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -q; do
  sleep 2
done
echo "PostgreSQL is ready."

# Step 2: Run migrations
echo "Running migrations..."
alembic upgrade head
echo "Migrations complete."

# Step 3: Run seeds
echo "Running seeds..."
python -m seeds.runner
echo "Seeds complete."

# Step 4: Start server
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Starting production server..."
  exec gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 0.0.0.0:8310
else
  echo "Starting development server..."
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8310 \
    --reload \
    --reload-dir /app
fi
