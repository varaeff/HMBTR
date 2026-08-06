# HMBTR

HMBTR is a web system for managing HMB tournaments: fighters, marshals, tournaments, nominations, competition brackets, fight results, disciplinary cards, reports, and ratings.

The repository contains a Vue frontend, a NestJS backend, shared TypeScript contracts, PostgreSQL infrastructure, and Docker packaging for production-style deployment.

## Project Purpose

HMBTR helps tournament organizers run the full tournament lifecycle:

- maintain fighter, marshal, user, country, city, club, nomination, and settings data;
- register fighters and marshals for tournaments;
- run group stages and Olympic brackets;
- record scores, warnings, forfeits, placements, and tie resolution;
- manage disciplinary cards and their competition impact;
- generate tournament reports;
- calculate and display fighter ratings and profile statistics.

## Repository Structure

| Path | Purpose |
| --- | --- |
| `front/` | Vue 3 + Vite frontend application. |
| `backend/` | NestJS API, Prisma persistence, auth, reports, ratings, and competition logic. |
| `shared/` | Shared frontend/backend TypeScript contracts such as routes and fight-scoring rules. |
| `docs/` | Architecture documentation and validation rules. |
| `compose.yaml` | Production-style Docker Compose stack for PostgreSQL, backend, and frontend. |
| `backend/docker-compose.yml` | Local development PostgreSQL and pgAdmin stack. |

Detailed architecture:

- [Frontend Architecture](docs/frontend-architecture-en.md)
- [Frontend Architecture RU](docs/frontend-architecture-ru.md)
- [Backend Architecture](docs/backend-architecture-en.md)
- [Backend Architecture RU](docs/backend-architecture-ru.md)
- [Validation Policy](docs/validation-policy.md)

## Tech Stack

Frontend:

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Tailwind CSS v4
- Reka UI
- i18next
- Vitest and Cypress

Backend:

- NestJS
- TypeScript
- Prisma 7
- PostgreSQL
- JWT authentication
- Winston logging
- Jest unit and integration tests

Infrastructure:

- Docker Compose
- Nginx frontend image
- Node 22 backend image
- PostgreSQL 16 Alpine

## Requirements

Install:

- Node.js 22 or a compatible current LTS;
- npm;
- Docker and Docker Compose.

## Local Development

Install dependencies:

```sh
npm install
npm --prefix backend install
npm --prefix front install
```

Create local environment files:

- `backend/.env` for backend and local database settings;
- `front/.env` for the frontend API URL.

The local database stack reads `backend/.env`. The frontend needs at least:

```env
VITE_API_BASE_URL=http://localhost:3000/api/hmbtr/v1
```

Start local PostgreSQL and pgAdmin:

```sh
cd backend
docker compose up -d
```

Apply the Prisma schema to the local database on first setup or after schema changes:

```sh
cd backend
npx prisma db push
```

Run backend and frontend together from the repository root:

```sh
npm run dev
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:3000/api/hmbtr/v1`
- pgAdmin: `http://localhost:5050`

You can also run services separately:

```sh
npm run dev:front
npm run dev:backnest
```

## Production-Style Docker Compose

Copy the root environment template and fill real values:

```sh
cp .env.example .env
```

Start the full stack from the repository root:

```sh
docker compose up -d --build
```

The production-style stack includes:

- PostgreSQL with persistent volume `hmbtr_prod_postgres_data`;
- NestJS backend;
- frontend served by Nginx;
- runtime frontend API URL configuration through `front/env-config.template.js`.

On backend startup, `docker-entrypoint.sh` runs `npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss`. This avoids interactive prompts during deploy, but destructive schema changes such as removed columns are accepted automatically. Back up production data before deploying schema removals.

Default published ports from `.env.example`:

- frontend: `http://localhost:8080`
- backend: `http://localhost:3001/api/hmbtr/v1`
- PostgreSQL: `localhost:5432`

Production data is stored in Docker volumes. Do not reuse local development volumes for production.

## Useful Commands

Root-level checks:

```sh
npm run check:no-any
npm run check:quick
npm run check:full
```

Frontend:

```sh
npm run check:front:type
npm run check:front:unit
npm run check:front:build
```

Backend:

```sh
npm run check:backend:build
npm run check:backend:unit
npm run check:backend:integration
```

Focused frontend unit test:

```sh
npm --prefix front run check:unit -- <spec-file>
```

Focused backend unit test:

```sh
npm --prefix backend test -- <spec-file> --runInBand
```

## Development Rules

- Do not use explicit TypeScript `any`.
- Prefer existing project patterns over new abstractions.
- Keep route, DTO, API, store, and widget contracts stable unless the task requires changing them.
- Keep shared frontend/backend route and scoring contracts in `shared/`.
- Choose validation commands according to [docs/validation-policy.md](docs/validation-policy.md).
- Update architecture documentation after reusable or architecturally meaningful changes.

## Documentation

This root README is intentionally concise and operational. For details on layers, module boundaries, testing strategy, and refactoring rules, see the architecture documents in `docs/`.
