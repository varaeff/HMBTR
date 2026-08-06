# Frontend Architecture

This document describes the current frontend architecture of the HMBTR project. It is a map of the actual Vue code structure, not an abstract target design.

## Overview

The frontend is built with Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS, Reka UI primitives, and i18next.

Main source code lives in `front/src`. Shared cross-layer contracts are imported from `shared` through the `@shared` alias. Application code uses the `@` alias for `front/src`.

The app is bootstrapped in `front/src/app/main.ts`. Bootstrap responsibilities are:

- create the Vue application;
- create and install Pinia;
- install Axios interceptors;
- initialize stored authentication state;
- install Vue Router;
- install i18next;
- register the global `v-focus` directive;
- mount the app.

The root shell lives in `front/src/app/App.vue`. It renders:

- `AppShellNav` as the fixed application navigation;
- the global loading indicator from `apiUi`;
- the global error alert;
- the current route through `RouterView`.

The current frontend architecture style is pragmatic layered Vue architecture, not strict Feature-Sliced Design. Folders describe responsibility and ownership:

- `app/` owns application bootstrap and cross-route shell;
- `pages/` own route-level composition;
- `features/` own reusable user flows and actions;
- `widgets/` own domain UI modules;
- `components/ui/` owns generic UI primitives;
- `composables/` own reusable orchestration and view state;
- `stores/` own Pinia state and store-level side effects;
- `api/` owns typed HTTP adapters;
- `model/` owns frontend domain types;
- `lib/` owns pure helpers and policies;
- `i18n/` owns translations and language setup.

## Layers

### App Layer

The app layer is the application entry point and shell.

Key files:

- `front/src/app/main.ts`;
- `front/src/app/App.vue`;
- `front/src/app/shell/AppShellNav/AppShellNav.vue`;
- `front/src/app/shell/LanguageSwitch/LanguageSwitch.vue`;
- `front/src/app/shell/UserMenu/UserMenu.vue`.

The app layer may wire global plugins, navigation chrome, theme initialization, authentication initialization, and global UI feedback. It should not own page-specific data loading or domain workflows.

`AppShellNav` composes navigation links, auth entry points, language switching, and theme switching. `LoginWidget` is loaded lazily because the login form is not required for the initial render.

### Router Layer

The router lives in `front/src/router/index.ts`.

Route components are dynamically imported so pages become route-level chunks. Route metadata controls authorization:

- `requiresAuth`;
- `requiresAdmin`;
- `requiresOrganizer`;
- `requiresMarshalManager`.

The global navigation guard reads `useAuthStore` and initializes the profile once when a stored access token exists. Administrators bypass lower-level role checks.

The router should remain a route map and access gate. It should not become the owner of page data loading, complex business workflows, or HTTP details.

### Page Layer

Pages live in `front/src/pages`.

Pages are route-level composition shells. They should:

- read route params and query params;
- choose the high-level page layout;
- call page composables and stores;
- pass typed props and actions to widgets and features;
- keep templates understandable.

Large workflows should be moved from the page file into composables or domain widgets. `TournamentPage.vue` follows this direction through `useTournamentPage`, which acts as a facade over narrower tournament composables.

Examples:

- `HomeViewPage.vue`;
- `FightersListPage.vue`;
- `FighterPage.vue`;
- `TournamentsListPage.vue`;
- `TournamentPage.vue`;
- `RatingPage.vue`;
- `UsersListPage.vue`;
- `SettingsPage.vue`.

### Feature Layer

Features live in `front/src/features`.

A feature is a reusable user flow or action that may be used by pages or the app shell. Features are more specific than UI primitives but less tied to one route than a page.

Current feature areas:

- `auth` - login, registration, auth service, username/password form pieces;
- `location-select` - country/city/club selection flow;
- `person-name-form` - reusable full-name input group;
- `search` - reusable search widget;
- `tournament-fighter-registration` - tournament fighter registration flow.

Feature components may own local form state, validation hints, and action orchestration. For API access, prefer typed API adapters or store actions instead of direct ad hoc HTTP calls in deeply nested UI.

### Widget Layer

Widgets live in `front/src/widgets`.

A widget is a domain UI module with business meaning. It is not a generic primitive.

Current widget areas:

- `widgets/tournament/` - competition blocks, cards, fights, nominations, brackets, marshal registration, tournament header, and tournament workspace;
- `widgets/fighter/` - fighter cards and fighter presentation;
- `widgets/marshal/` - marshal-related tournament UI;
- `widgets/rating/` - rating visualization;
- `widgets/user/` - user administration UI;
- `widgets/AlertWidget/` - global alert UI.

Complex widgets should keep pure view derivation and local UI state near the component. For example:

- `FightCard` has colocated scoring and warning presentation helpers and tests;
- `OlympicBracket` has colocated view derivation and presentational subcomponents;
- `DisciplinaryCards` has table and status presentation with focused tests.

Widgets that display or edit already-loaded tournament competition data should receive data through props and emit typed action payloads upward. Store calls should usually stay in page orchestration or store facades unless the widget is an accepted nested flow.

### UI Component Layer

Generic primitives live in `front/src/components/ui`.

This layer contains reusable presentational components and wrappers around Reka UI, VueUse, Tailwind utilities, and small local helpers.

Examples:

- `button`;
- `sheet`;
- `dialog`;
- `tabs`;
- `select`;
- `table`;
- `calendar`;
- `date-picker`;
- `imageUpload`;
- `loader`;
- `spinner`.

UI primitives should not import domain stores, route params, API adapters, or business models unless they are generic type parameters. Domain UI belongs in `features/` or `widgets/`.

### Composable Layer

Reusable orchestration and view state lives in `front/src/composables`.

Composables should own focused behavior that would otherwise make pages or widgets too broad:

- authentication initialization;
- editable entity form lifecycle;
- tournament page orchestration;
- tournament competition state/action grouping;
- tournament report download;
- tournament card-derived state;
- persisted collapsible state;
- fighter profile stats;
- rating page data.

`useTournamentPage` is the largest page facade. It composes stores, route state, i18n, tournament loading, nomination selection, competition actions, cards, marshal registration, and report download. Narrower composables keep the facade from turning into a single unstructured state machine.

### Store Layer

Pinia stores live in `front/src/stores`.

Stores own frontend state, cached collections, store-level mutations, and some API orchestration. They are the frontend state facades used by pages and composables.

Current stores:

- `auth` - user, access token, refresh token, localStorage persistence;
- `apiUi` - global loading and error state;
- `commonData` - countries, cities, clubs, nominations;
- `fightersList`;
- `marshalsList`;
- `tournamentsList`;
- `usersList`;
- `settings`;
- `disciplinaryCards`;
- `tournamentMarshals`;
- `competition`.

List stores reuse `stores/shared/listStorePolicy.ts` for common list behavior: search mutation, filtering, remote-count guards, id-based merge/replace/upsert, next-id calculation, sorting, and fallback rows.

The competition store is a slice folder:

- `store.ts` - Pinia facade and public actions;
- `commands.ts` - HTTP commands;
- `mapper.ts` - backend state to frontend read model mapping;
- `stateApplication.ts` - applying mapped state to the store;
- `scoreDrafts.ts` and `resultDrafts.ts` - draft persistence;
- `fightScoring.ts` - frontend scoring helpers.

Callers should import the competition store from `@/stores/competition`, not from private slice files.

Competition state includes `pendingTie` for unresolved backend ordering decisions. The frontend stores the server scope and identifiers, including `fightId` for Olympic double-red conflicts, and sends them back through the typed `resolveTie` command instead of deriving hidden fallback winners client-side.

### API Layer

HTTP infrastructure lives in `front/src/api`.

Key files:

- `http.ts` - shared Axios instance and runtime API base URL;
- `interceptors.ts` - token attachment, refresh-token recovery, global loading, and global errors;
- `auth.ts` - typed auth endpoint functions;
- `ratings.ts` - typed rating endpoint functions;
- `tournamentMarshals.ts` - typed tournament marshal endpoint functions.

The Axios instance uses `window.__HMBTR_CONFIG__?.VITE_API_BASE_URL` when runtime config is available, otherwise it falls back to `import.meta.env.VITE_API_BASE_URL`.

Interceptors use Pinia stores directly and keep refresh recovery independent from feature composables. Auth endpoint calls are excluded from refresh recovery to avoid retry loops.

New page-level HTTP calls should usually be added as typed API functions or store actions. Route pages should not accumulate direct `http` calls when the behavior belongs to a reusable data boundary.

### Model And Shared Contract Layer

Frontend domain types live in `front/src/model`.

Focused modules include:

- `competition.ts`;
- `disciplinaryCards.ts`;
- `fighter.ts`;
- `location.ts`;
- `marshal.ts`;
- `nomination.ts`;
- `rating.ts`;
- `tournament.ts`;
- `user.ts`.

`model/index.ts` remains a compatibility barrel for older imports. New or heavily refactored code should prefer narrow imports such as `@/model/competition` or `@/model/rating`.

Shared backend/frontend contracts are imported through `@shared`, especially:

- `@shared/routes`;
- `@shared/fightScoring`.

The frontend should not duplicate route strings or scoring contracts when a shared contract exists.

### Pure Helper Layer

Pure helpers live in `front/src/lib` and focused colocated helper files.

Examples:

- `checkAccess.ts` - role and permission checks;
- `dateUtils.ts` - date formatting helpers;
- `fightResult.ts` - fight result presentation/derivation;
- `groupsStatistic.ts` - group statistic calculation;
- `tournamentMarshalRegistration.ts` - marshal registration policy;
- `utils.ts` - shared UI/data helpers.

Pure helpers should remain deterministic when possible. If a helper starts requiring store state, HTTP, router, or i18n lifecycle, it should probably become a composable, store action, or feature-level module.

### I18n Layer

i18n setup lives in `front/src/i18n`.

Translations are stored in:

- `front/src/i18n/locales/en.json`;
- `front/src/i18n/locales/ru.json`.

The selected language is stored in `localStorage` under `HMBTRi18nextLng`. The default language is Russian.

Components use `$t` in templates or `useTranslation()` in script setup. Domain data with multilingual fields is formatted through helpers such as `tData`.

### Styling And Build Layer

Global styles live in `front/src/styles/globals.css`.

The frontend uses Tailwind CSS v4 with the Vite Tailwind plugin. UI components use Tailwind utility classes and shared primitives instead of page-specific CSS whenever practical.

Vite configuration lives in `front/vite.config.ts`. It defines:

- Vue and Vue JSX plugins;
- Tailwind plugin;
- Vue DevTools plugin;
- `@` and `@shared` aliases;
- manual vendor chunks for Vue, router, i18n, Axios, UI dependencies, date helpers, flags, and text utilities.

Manual chunks are used to keep the initial `index` chunk small and to avoid hiding large bundle problems behind `chunkSizeWarningLimit`.

## Domain Areas

## Auth

Frontend auth is split between:

- `stores/auth.ts` - persisted auth state and role getters;
- `api/auth.ts` - typed endpoint functions;
- `features/auth/useAuthService.ts` - auth workflow facade that updates the store;
- `features/auth/LoginWidget.vue` - login and registration UI;
- `app/shell/UserMenu/UserMenu.vue` - logged-in user menu and logout action;
- `composables/useAuthInit.ts` - stored token initialization.

Access tokens and refresh tokens are stored in `localStorage`. Axios interceptors attach the access token to outgoing requests and perform refresh-token recovery for non-auth 401 responses.

## Lists And Reference Data

Fighters, marshals, tournaments, and users use Pinia list stores. These stores cache arrays, expose filtered getters, and avoid refetching when the local remote-item count matches the backend count.

`commonData` caches countries, cities, clubs, and nominations. Entity stores use it to convert backend id-based payloads into frontend read models with display names.

## Tournament Page And Competition

The tournament page is the most complex frontend area.

Main owners:

- `pages/TournamentPage.vue` - route shell and template composition;
- `composables/useTournamentPage.ts` - page facade;
- `stores/competition` - competition state facade and backend command execution;
- `widgets/tournament/TournamentCompetitionWorkspace` - domain workspace adapter;
- tournament widgets for nominations, competitors, groups, fights, brackets, cards, marshal registration, and podiums.

The expected flow is:

1. The route provides `tournamentId`.
2. `useTournamentPage` loads tournament, common data, fighters, cards, and marshals.
3. Active nomination selection sets tournament and nomination ids in the competition store.
4. The competition store fetches competitors and competition state.
5. `mapper.ts` converts backend state into frontend `CompetitionBlock` read models.
6. Widgets render the read model and emit typed actions upward.
7. `useTournamentCompetitionActions` calls store actions and keeps UI errors/report side effects centralized.

This boundary keeps tournament widgets from becoming API owners while still allowing rich local presentation state.

`TieResolver` is a tournament widget for manual ordering conflicts. It handles group ties, Olympic third-place cutoff ties, and Olympic double-red conflicts from the same `pendingTie` read model. It should present the server-provided competitors and emit ordered competitor ids upward; the backend remains responsible for validating the scope and applying the resulting state transition.

## Disciplinary Cards

Disciplinary card state lives in `stores/disciplinaryCards.ts`. Tournament card presentation lives under `widgets/tournament/DisciplinaryCards`.

Tournament page orchestration derives:

- active card types;
- attached card counts by fight;
- red-card fighter keys;
- deletion impact counts for rollback actions.

Widgets may own local edit drafts and issue-dialog state, but backend mutations should flow through store actions or page orchestration.

## Ratings And Fighter Profiles

Rating API functions live in `api/ratings.ts`. Rating page data is loaded through `useRatingPageData`.

Fighter profile statistics are loaded through `useFighterProfileStats`. `FighterRatingChart` owns rating-history visualization and uses generic chart primitives from `components/ui/chart`.

## Settings And Administration

Settings and user administration use route-level pages with focused stores and widgets:

- `SettingsPage.vue` coordinates nominations and disciplinary card settings;
- `UsersListPage.vue` uses `widgets/user/UsersTabs`;
- `stores/settings.ts` owns settings endpoint calls;
- `stores/usersList.ts` owns user list loading and updates.

Admin-only routes are guarded in router metadata.

## Cross-Boundary Rules

### Pages And Widgets

Pages own route context and orchestration. Widgets own domain UI. Widgets should not fetch route params or create global stores unless the feature explicitly owns that nested workflow.

### Stores And API

Stores may call typed API functions or direct shared Axios commands when they are the data facade. Repeated or cross-feature endpoint calls should move into `front/src/api`.

### Frontend And Backend Contracts

Use `@shared/routes` for route constants and `@shared/fightScoring` for scoring contracts. Avoid copying backend route strings or fight-scoring shapes into frontend-only files.

### i18n And Domain Data

Static UI text belongs in locale JSON files. Multilingual domain data should be selected through helpers such as `tData`, using the active i18next language.

## Error Handling

Global HTTP loading and error presentation are owned by `apiUi` and Axios interceptors.

Request flow:

- request interceptor starts loading and clears the previous global error;
- response success stops loading;
- response error stops loading, tries token refresh for eligible 401 responses, then writes a normalized error message to `apiUi`;
- `App.vue` renders `AlertWidget` when `apiUi.error` is set.

Local components may still track local loading state when needed, for example form submission buttons or report downloads.

## Authentication And Authorization

Authentication state is stored in `auth` Pinia store. Role getters expose:

- `isAuthenticated`;
- `isAdmin`;
- `isOrganizer`;
- `isSecretary`.

Authorization is enforced in the router for protected routes and in frontend helpers for conditional UI. Frontend checks are for user experience only; backend guards remain the security boundary.

## Test Architecture

Frontend tests use Vitest and Vue Test Utils.

Focused tests exist for:

- API interceptors;
- shared list-store policy;
- competition mapping, scoring, and drafts;
- tournament widgets;
- fight card behavior;
- disciplinary-card table behavior;
- image upload crop math and component behavior;
- rating and fighter UI helpers;
- settings page behavior;
- shell user menu behavior.

Test files are colocated with the behavior they cover. Pure helpers and composables should be tested directly when they own meaningful logic. Vue component tests should focus on rendered behavior, emitted payloads, and important user workflows.

End-to-end tests are configured through Cypress scripts, but the default validation policy favors focused Vitest and type/build checks unless the changed workflow requires browser-level coverage.

## Build And Validation

Use the `minimal-validation` skill and `docs/validation-policy.md` before choosing checks. Prefer focused validation for the changed behavior instead of running every frontend check by default.

Typical frontend checks:

```sh
npm run check:no-any
npm run check:front:type
npm run check:front:build
```

Focused unit tests can be run with:

```sh
npm --prefix front run check:unit -- <spec-file>
```

Use `npm run check:front:build` for changes that affect Vite config, route-level chunks, imports, assets, or runtime bundling.

## Current Architecture Rules

### Preserve Route And Store Contracts

Do not change route names, paths, route meta semantics, store action names, or public widget props/emits unless the requested change requires it.

### Keep Pages As Composition Shells

If a page starts owning multiple independent workflows, move behavior into a composable, store slice, or domain widget.

### Keep Widgets Domain-Focused

Widgets should express tournament, fighter, marshal, rating, or user concepts. Generic primitives belong in `components/ui`.

### Keep API Boundaries Typed

Do not introduce untyped endpoint helpers. Response DTOs, request payloads, and store-facing read models should have explicit TypeScript types.

### Do Not Use `any`

Project policy forbids explicit `any`. Use domain interfaces, generics, `unknown` with narrowing, or library-provided types.

### Avoid Duplicate List Logic

List stores should reuse `stores/shared/listStorePolicy.ts` for repeated search, merge, upsert, sorting, and remote-count behavior.

### Avoid Accidental Bundle Growth

Keep route pages dynamically imported. Lazy-load non-critical shell features when they are not needed for first render. Keep manual chunking intentional and do not suppress large chunk warnings by raising `chunkSizeWarningLimit` without understanding the cause.

## When To Refactor Further

Refactor when:

- a page file becomes a collection of unrelated workflows;
- a widget calls stores or HTTP for behavior that should be orchestrated by the page;
- several stores repeat the same cache/search/upsert policy;
- API response mapping is duplicated in pages and stores;
- tests need casts or private access to reach important behavior;
- a route chunk grows because non-critical UI is imported eagerly.

Do not refactor when the split only creates pass-through files or hides a small cohesive component behind extra indirection.

## Known Pragmatic Choices

- The architecture is layered but not strict FSD. Existing folder ownership matters more than enforcing a naming doctrine.
- Some stores still call `http` directly. This is acceptable for store-owned data facades, but repeated endpoint logic should move into `api/`.
- `model/index.ts` remains for compatibility. New code should prefer narrow model imports.
- `AlertWidget` stays as a top-level widget until a narrower ownership boundary becomes clear.
- The tournament page remains a large orchestration area, but its state and actions are split into narrower composables and widgets.
