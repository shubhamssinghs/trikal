# Trikal

Monorepo with Next.js frontend and Python FastAPI backend.

## Quick Start

```bash
# Copy environment files
cp .env.example .env

# Start full dev stack
docker compose up
```

## Ports

| Service    | Port |
|------------|------|
| Frontend   | 4310 |
| Backend    | 8310 |
| Postgres   | 5310 |
| Redis      | 6310 |
| Qdrant     | 7310 |

## Access

- Frontend: http://localhost:4310
- API Docs: http://localhost:8310/docs
- ReDoc: http://localhost:8310/redoc

## Directory Structure

```
trikal/
├── apps/
│   ├── frontend/    # Next.js 14
│   └── backend/     # FastAPI
├── packages/        # Shared code
└── infrastructure/  # Docker & nginx
```

## Development

```bash
# Start in dev mode (hot-reload)
docker compose up

# Rebuild a service after adding dependencies
docker compose up --build backend

# Create a database migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Run tests
docker compose exec backend pytest

# Reset everything
docker compose down -v
```
