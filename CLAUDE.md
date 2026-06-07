# Claude Project Instructions — Trikal

AI Technical Manager Command Center.

## Product Intent

A project-centered AI work dashboard for a technical software manager.
Groups projects under companies/clients, maintains project knowledge bases,
analyzes transcripts/messages/tickets/docs, and recommends next actions.

## MVP Infrastructure

Target Docker Compose on Ubuntu, not AWS.
Services: web, api, worker, postgres+pgvector, redis, minio, caddy.

## Tech Stack

Frontend: Next.js, React, TypeScript, Tailwind, shadcn/Radix.
Backend: NestJS, TypeScript, Prisma, PostgreSQL, pgvector, Redis, BullMQ.
Storage: MinIO.
AI: structured agent workflows, project-scoped RAG, human approval.

## Monorepo Layout

- `apps/web` — Next.js dashboard
- `apps/api` — NestJS REST API
- `apps/worker` — BullMQ background jobs
- `packages/database` — Prisma schema + migrations
- `packages/shared` — shared Zod schemas and types
- `packages/ai` — AI prompt versions and workflow schemas
- `packages/diagram` — diagram JSON schema and icon registry
- `packages/auth` — OIDC/RBAC helpers
- `packages/integrations` — connector interface + shared event schemas
- `packages/compliance` — compliance profiles, redaction, audit helpers
- `packages/ui` — shared React UI components
- `infrastructure/` — Docker, Caddy, compose files

## Rules

- Keep integrations modular behind connector interfaces.
- Do not bypass approval workflows for external actions.
- Keep compliance profile support in the data model from day one.
- Do not hardcode secrets — use environment variables.
- Use project-scoped knowledge retrieval.
- Prefer structured JSON outputs for AI workflows.
- Add tests for meaningful behavior.
- Keep UI dense, operational, and dashboard-first (not a landing page).
- All AI-generated recommendations require human approval before external writes.

## MVP Priority

1. Company/project model
2. Transcript upload
3. Project knowledge base
4. AI summary/action extraction
5. Today dashboard
6. Project dashboard
7. Basic diagram generator
8. Docker deployment

## Commands

```bash
pnpm dev          # start all apps in dev mode
pnpm build        # build all apps
pnpm db:generate  # regenerate Prisma client
pnpm db:migrate   # run migrations
```
