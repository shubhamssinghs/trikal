# Deployment Runbook — Ubuntu Server

## Prerequisites

- Ubuntu 22.04 LTS
- Docker Engine + Docker Compose v2
- Domain name pointed at server IP
- SSH access

## Initial Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repo
git clone https://github.com/your-org/trikal.git /opt/trikal
cd /opt/trikal

# Copy and fill in secrets
cp .env.example .env
nano .env
```

## Start Services

```bash
cd /opt/trikal/infrastructure/compose
docker compose up -d

# Check status
docker compose ps
docker compose logs -f api
```

## Run Migrations

```bash
docker compose exec api npx prisma migrate deploy
```

## Backup Postgres

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres \
  pg_dump -U trikal trikal | gzip > /backups/trikal_$TIMESTAMP.sql.gz
```

## Restore Postgres

```bash
gunzip -c /backups/trikal_TIMESTAMP.sql.gz | \
  docker compose exec -T postgres psql -U trikal trikal
```

## Update Application

```bash
git pull origin main
docker compose build
docker compose up -d
docker compose exec api npx prisma migrate deploy
```

## Caddy SSL

Caddy handles SSL automatically via Let's Encrypt.
Update `infrastructure/caddy/Caddyfile` with your domain, then:

```bash
docker compose restart caddy
docker compose logs caddy
```
