---
name: deploy
description: Deploy HMBTR production services with Docker Compose and Dokploy, including production database safety, environment variables, logs, redeploys, and VPS port requirements.
---

# HMBTR Production Deployment

## Context

HMBTR production uses Docker Compose for services and is intended to run on a VPS through Dokploy.

Production includes:

- `frontend`: Vue static app served by Nginx.
- `backend`: NestJS API.
- `postgres`: PostgreSQL database.

Production does not include PgAdmin.

## Problem Statement

Deployment work must keep production data isolated from local development data, use the root `compose.yaml`, and preserve the backend schema-sync/startup contract.

## Chosen Approach

Use the root `compose.yaml` for production and Dokploy. Configure production from `.env.example` or Dokploy environment variables. Use the Docker service name `postgres` in `DATABASE_URL`. Let the backend container sync the Prisma schema with `prisma db push --accept-data-loss` before starting the API.

## Database Safety

Do not copy, dump, mount, seed, or reuse local development database data in production.

- Local development database: started by `backend/docker-compose.yml`.
- Local development PgAdmin: started by `backend/docker-compose.yml`; dev only.
- Production database: started by root `compose.yaml`.
- Production persistent data volume: `hmbtr_prod_postgres_data`.

Production PostgreSQL should start from a clean empty database volume for first deployment. The backend container runs Prisma schema sync with `prisma db push --schema ./prisma/schema.prisma --accept-data-loss`. No test or development data is included.

`--accept-data-loss` means deployment will not wait for interactive confirmation when Prisma detects destructive changes, such as removed columns. It also means the container automatically agrees to that data loss. Before deploying schema removals to a database with production data, take a backup or make an explicit release decision that the data can be removed.

## Environment Setup

1. Copy `.env.example` to `.env` on the VPS or configure the same variables in Dokploy.
2. Replace every placeholder secret and domain.
3. Use the Docker service name `postgres` in `DATABASE_URL`.

Example production database URL:

```env
DATABASE_URL=postgresql://hmbtr:replace-with-a-long-random-password@postgres:5432/hmbtr
```

Required variables:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PUBLIC_PORT`
- `DATABASE_URL`
- `BACKEND_PORT`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `CORS_ORIGIN`
- `VITE_API_BASE_URL`

Optional email variables:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_FROM`

## Local Development

Local development remains unchanged:

```bash
npm run dev
```

That command starts:

- development PostgreSQL from `backend/docker-compose.yml`
- development PgAdmin from `backend/docker-compose.yml`
- local backend in watch mode
- local frontend Vite server

The development PgAdmin variables are only for local development:

- `PGADMIN_EMAIL`
- `PGADMIN_PASSWORD`

They are not used by production `compose.yaml`.

## Local Production Compose Smoke Test

Use this only with a fresh production-style `.env` and a clean production volume:

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Check logs:

```bash
docker compose logs -f postgres
docker compose logs -f backend
docker compose logs -f frontend
```

Stop containers without deleting production data:

```bash
docker compose down
```

Delete the production database volume only when intentionally resetting production data:

```bash
docker compose down -v
```

## Dokploy Deployment

1. Create a new Dokploy Compose application from the repository root.
2. Use the root `compose.yaml`.
3. Configure environment variables from `.env.example`.
4. Configure two public domains:
   - frontend domain, for example `https://app.example.com`
   - backend domain, for example `https://api.example.com`
5. Set:
   - `CORS_ORIGIN=https://app.example.com`
   - `VITE_API_BASE_URL=https://api.example.com/api/hmbtr/v1`
6. Deploy the stack.

On each backend start, the backend entrypoint runs:

```bash
npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss
```

This is schema sync, not migration history application. Destructive schema changes do not prompt in the container because `--accept-data-loss` is set.

## PostgreSQL External Connection

Production PostgreSQL is exposed on the VPS host port defined by `POSTGRES_PUBLIC_PORT`, default `5432`.

For local PgAdmin, connect to:

- host: VPS public IP or hostname
- port: `POSTGRES_PUBLIC_PORT`
- database: `POSTGRES_DB`
- username: `POSTGRES_USER`
- password: `POSTGRES_PASSWORD`

Restrict PostgreSQL access at the VPS firewall to trusted IPs only. Do not leave port `5432` open to the public internet.

## Backend Logs

The backend writes rotating application logs to:

```text
/app/logs
```

In Docker, that path is backed by the named volume:

```text
hmbtr_prod_backend_logs
```

Container stdout/stderr logs:

```bash
docker compose logs -f backend
```

Application log files inside the backend container:

```bash
docker compose exec backend ls -la /app/logs
docker compose exec backend tail -f /app/logs/updates-$(date +%F).log
docker compose exec backend tail -f /app/logs/error-$(date +%F).log
```

## PDF Generation Browser

The production backend image uses Alpine Chromium for Puppeteer-based PDF generation. Do not rely on Puppeteer's downloaded Chrome-for-Testing cache in `node:*-alpine` images; that binary can fail to launch under Alpine.

In `backend/Dockerfile`, keep:

- `apk add --no-cache chromium font-noto ca-certificates`
- `PUPPETEER_SKIP_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH` set to the executable verified inside the Alpine image with `which chromium` and `which chromium-browser`.

Validate PDF changes with a backend image rebuild, executable path check, Chromium `--version`, and a `markdown2pdf-mcp` smoke conversion inside the image.

## Update And Redeploy

1. Push or pull the updated repository on the VPS/Dokploy source.
2. Rebuild and redeploy the Compose application.
3. Watch backend logs during startup:

```bash
docker compose logs -f backend
```

The backend will sync the Prisma schema automatically before starting the API.

## Required VPS Ports

- `80`: HTTP traffic for Dokploy/reverse proxy.
- `443`: HTTPS traffic for Dokploy/reverse proxy.
- `5432`: PostgreSQL external access if local PgAdmin must connect directly.
- SSH/admin port used for VPS management.

Firewall `5432` to trusted IPs only.

## Related Files

- `compose.yaml`
- `.env.example`
- `backend/docker-compose.yml`
- `backend/docker-entrypoint.sh`
- `backend/prisma/schema.prisma`
- `front/nginx.conf`

## Maintenance

After deployment-related changes, validate the production Compose file:

```bash
docker compose config
docker compose build
```
