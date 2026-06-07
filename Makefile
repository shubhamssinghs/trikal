ENV_FILE     := .env
COMPOSE_PROD := infrastructure/compose/docker-compose.yml
COMPOSE_DEV  := infrastructure/compose/docker-compose.dev.yml

PROD := docker compose -f $(COMPOSE_PROD) --env-file $(ENV_FILE)
DEV  := docker compose -f $(COMPOSE_DEV)  --env-file $(ENV_FILE)

.PHONY: dev dev-build dev-down dev-logs dev-ps \
        up down logs ps \
        db-shell migrate generate

# ── Development (hot-reload, all services in Docker) ─────────────────────────

dev:
	$(DEV) up -d

dev-build:
	$(DEV) build

dev-down:
	$(DEV) down

dev-logs:
	$(DEV) logs -f

dev-ps:
	$(DEV) ps

# Rebuild a single service, e.g.: make dev-rebuild svc=api
dev-rebuild:
	$(DEV) build $(svc) && $(DEV) up -d --no-deps $(svc)

# ── Production ────────────────────────────────────────────────────────────────

up:
	$(PROD) up -d

down:
	$(PROD) down

logs:
	$(PROD) logs -f

ps:
	$(PROD) ps

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	cd packages/database && DATABASE_URL=$$(grep ^DATABASE_URL $(CURDIR)/$(ENV_FILE) | cut -d= -f2-) npx prisma migrate dev

generate:
	cd packages/database && DATABASE_URL=$$(grep ^DATABASE_URL $(CURDIR)/$(ENV_FILE) | cut -d= -f2-) npx prisma generate

db-shell:
	$(DEV) exec postgres psql -U trikal trikal
