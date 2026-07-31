# HMBTR Frontend

The HMBTR frontend is a Vue 3 application for tournament organizers, marshals, administrators, and users working with HMB tournaments.

It provides the UI for fighter and marshal management, tournament setup, fighter registration, competition execution, disciplinary cards, reports, ratings, settings, and user administration.

For a full architecture map, see [../docs/frontend-architecture-en.md](../docs/frontend-architecture-en.md).

## Stack

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Tailwind CSS v4
- Reka UI
- i18next
- Axios
- Vitest
- Cypress

## Source Layout

| Path | Purpose |
| --- | --- |
| `src/app/` | App bootstrap and cross-route shell. |
| `src/pages/` | Route-level page composition. |
| `src/features/` | Reusable user flows such as auth and tournament fighter registration. |
| `src/widgets/` | Domain UI modules for tournament, fighter, marshal, rating, and user areas. |
| `src/components/ui/` | Generic UI primitives and shared presentational components. |
| `src/composables/` | Reusable page and workflow orchestration. |
| `src/stores/` | Pinia stores and frontend state facades. |
| `src/api/` | Axios setup and typed endpoint adapters. |
| `src/model/` | Frontend domain types. |
| `src/i18n/` | i18next setup and locale JSON files. |
| `src/styles/` | Global Tailwind/CSS tokens and styles. |

The project uses the `@` alias for `src` and `@shared` for shared frontend/backend contracts from `../shared`.

## Environment

Create `front/.env` for local development:

```env
VITE_API_BASE_URL=http://localhost:3000/api/hmbtr/v1
```

In the Docker image, the API URL is injected at container startup through:

- `env-config.template.js`;
- `docker-entrypoint.d/40-env-config.sh`;
- `window.__HMBTR_CONFIG__.VITE_API_BASE_URL`.

The runtime value takes precedence over the build-time Vite env value.

## Local Development

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

Default local frontend URL:

```text
http://localhost:5173
```

The backend should be available at the URL configured in `VITE_API_BASE_URL`.

## Build

Type-check and build:

```sh
npm run build
```

Build only, without repeating type-check:

```sh
npm run build-only
```

Preview a production build:

```sh
npm run preview
```

## Tests And Checks

Type-check:

```sh
npm run check:type
```

Run all frontend unit tests:

```sh
npm run check:unit
```

Run a focused Vitest spec:

```sh
npm run check:unit -- src/path/to/file.spec.ts
```

Run production build validation:

```sh
npm run check:build
```

Run non-mutating lint:

```sh
npm run check:lint
```

The `lint` and `format` scripts are mutating because they apply fixes or rewrites. Use them intentionally.

## E2E Tests

Open Cypress against a dev server:

```sh
npm run test:e2e:dev
```

Run Cypress against a preview server:

```sh
npm run test:e2e
```

## Build Notes

`vite.config.ts` defines manual vendor chunks for Vue, router, i18n, Axios, UI dependencies, date helpers, flag assets, and text utilities. Keep route pages dynamically imported and avoid suppressing large chunk warnings by raising `chunkSizeWarningLimit` without understanding the cause.

## Development Rules

- Do not use explicit TypeScript `any`.
- Keep page files as route-level composition shells.
- Put generic UI in `components/ui`, domain UI in `widgets`, and reusable user flows in `features`.
- Prefer typed API adapters in `src/api` or store actions over ad hoc HTTP calls in route pages.
- Use `@shared/routes` and `@shared/fightScoring` instead of duplicating backend contracts.
