# ADR-001: Technology Stack Selection

**Status:** Accepted
**Date:** 2026-06-06

## Context

Trikal needs a monorepo stack that supports a dashboard-first SaaS-style app,
can run on a single Ubuntu server via Docker Compose for MVP,
and can migrate to cloud (AWS/Azure/GCP) later.

## Decision

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js + Tailwind + shadcn/ui | App Router, SSR, strong ecosystem |
| Backend | NestJS + TypeScript | Modular, decorator-based, DI, well-structured |
| ORM | Prisma | Type-safe, migration-friendly |
| Database | PostgreSQL + pgvector | Relational + vector search in one |
| Queue | BullMQ + Redis | Reliable background jobs |
| Storage | MinIO | S3-compatible, self-hosted |
| Proxy | Caddy | Auto-HTTPS, simple config |
| Monorepo | pnpm workspaces + Turborepo | Fast builds, proper workspace linking |

## Consequences

- All services are containerized and portable.
- pgvector handles embeddings without a separate vector store.
- MinIO → S3 migration is a config change.
- NestJS modules map cleanly to product domains.
