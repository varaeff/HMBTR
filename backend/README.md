# HMBTR Backend

The HMBTR backend is a NestJS API for managing HMB tournament data, authentication, competition state, reports, disciplinary cards, ratings, and administration workflows.

It exposes the API under:

```text
/api/hmbtr/v1
```

For a full architecture map, see [../docs/backend-architecture-en.md](../docs/backend-architecture-en.md).

## Stack

- NestJS
- TypeScript
- Prisma 7
- PostgreSQL
- JWT authentication
- Passport JWT strategy
- class-validator and class-transformer
- Winston logging
- Jest unit and integration tests

## Source Layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Root Nest application module. |
| `src/auth/` | Registration, login, logout, profile, refresh tokens, JWT guards and strategy. |
| `src/competition/` | Tournament competition lifecycle, state, groups, fights, brackets, rankings, rollback, finish flows. |
| `src/disciplinary-cards/` | Disciplinary card issuing, editing, deletion, expiry, and tournament impact. |
| `src/tournaments/` | Tournament CRUD, nominations, marshal registration, and report generation. |
| `src/ratings/` | Fighter rating read models and calculation flows. |
| `src/common/` | Shared infrastructure such as filters, logging, decorators, and email. |
| `src/prisma/` | Prisma service and database integration. |
| `src/generated/prisma/` | Generated Prisma client output. |
| `prisma/` | Prisma schema and Prisma config input. |
| `test/` | Integration-test infrastructure and fixtures. |

Shared frontend/backend contracts are imported from `../shared` through the `@shared` alias.

## Environment

Create `backend/.env` for local development. Required local variables include:

```env
APP_PORT=3000

DB_USER=hmbtr
DB_HOST=localhost
DB_NAME=hmbtr
DB_PASSWORD=change-me
DB_PORT=8080

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=change-me

DATABASE_URL=postgresql://hmbtr:change-me@localhost:8080/hmbtr

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
```

Do not commit real secrets.

## Local Database

Start PostgreSQL and pgAdmin from this folder:

```sh
docker compose up -d
```

Default local ports:

- PostgreSQL: `localhost:8080`
- pgAdmin: `http://localhost:5050`

Apply the Prisma schema:

```sh
npx prisma db push
```

The Prisma datasource URL is read from `DATABASE_URL` through `prisma.config.ts`.

## Local Development

Install dependencies:

```sh
npm install
```

Start the backend in watch mode:

```sh
npm run start:dev
```

Default local API URL:

```text
http://localhost:3000/api/hmbtr/v1
```

Start without watch mode:

```sh
npm run start
```

## Build And Production Start

Build:

```sh
npm run build
```

Start compiled output:

```sh
npm run start:prod
```

The Docker production image runs `docker-entrypoint.sh`, syncs the Prisma schema with `npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss`, and then starts the compiled Nest application. Destructive schema changes will not ask for interactive confirmation in the container, so back up production data before deploying schema removals.

## Tests And Checks

Build validation:

```sh
npm run check:build
```

Run unit tests:

```sh
npm run check:unit
```

Run a focused Jest spec:

```sh
npm test -- src/path/to/file.spec.ts --runInBand
```

Run integration tests:

```sh
npm run check:integration
```

Integration tests use a separate Docker Compose database and test environment under `test/`. Do not point integration tests at the local development or production database.

Run non-mutating lint:

```sh
npm run check:lint
```

The `lint` and `format` scripts are mutating because they apply fixes or rewrites. Use them intentionally.

## API And Runtime Notes

- `main.ts` enables CORS, installs the global `ValidationPipe`, sets JSON body limit to `50mb`, and applies the global API prefix.
- Production CORS is disabled by default unless `CORS_ORIGIN` is set.
- The global exception filter normalizes HTTP errors.
- Mutating requests are logged through the update logger interceptor.
- PDF/report generation uses Chromium in the production image.

## Development Rules

- Do not use explicit TypeScript `any`.
- Keep controllers thin: route mapping, DTO boundary, guards, and delegation only.
- Keep public services as stable module facades when internal behavior is split.
- Put deterministic business rules in pure helpers where practical.
- Keep Prisma transaction types based on the generated Prisma client, not Nest-specific lifecycle types.
- Preserve route, DTO, and response contracts unless the task explicitly changes them.
