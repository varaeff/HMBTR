# HMBTR Working Context

## Overview

HMBTR is a combat-sports tournament management project. The main product areas are fighter management, tournament setup, competitor registration, group generation, and fight tracking.

## Repo Structure

- `backend`: NestJS API
- `front`: Vue 3 + Vite frontend
- `shared`: shared route constants used across packages

## Dev Commands

- Root: `npm run dev`
- Root Docker helper: `npm run docker`
- Backend dev server: `cd backend && npm run start:dev`
- Frontend dev server: `cd front && npm run dev`

## Backend Architecture

- NestJS app bootstraps from `backend/src/main.ts`
- Global API prefix: `/api/hmbtr/v1`
- CORS is enabled
- Global validation pipe uses `whitelist: true`, `forbidNonWhitelisted: false`, `transform: true`
- Main modules: auth, users, fighters, tournaments, countries, cities, clubs, nominations, competitors, groups, group-competitors, fights
- Persistence uses Prisma with PostgreSQL
- Generated Prisma client lives under `backend/src/generated/prisma`

## Frontend Architecture

- Vue 3 app bootstraps from `front/src/app/main.ts`
- Uses Pinia for state, Vue Router for routing, and i18n for localization
- Auth is initialized before the router is mounted
- API requests use interceptors for token injection and refresh-token retry flow
- Router enforces role-gated access for organizer/admin pages

## Core Domain Model

- Geography: countries, cities, clubs
- Sport entities: fighters, tournaments, nominations
- Competition flow: competitors -> groups -> fights
- Users include role flags `is_admin` and `is_organizer`

## Important Routes And Behaviors

- Public pages include fighter list/detail and tournament list/detail views
- Protected organizer pages include adding fighters and tournaments
- Admin-only page exists for users management
- Shared API route constants live in `shared/routes.ts`

## Notes And Gotchas

- `backend/README.md` and `front/README.md` are mostly starter boilerplate, not project-specific docs
- Root `.gitignore` ignores `package-lock.json` even though a root lockfile currently exists
- Prisma schema comments show encoding issues in terminal output, but the model structure is still readable
- Existing worktree may contain unrelated user changes; avoid resetting or overwriting them
- no 'any' type allowed
