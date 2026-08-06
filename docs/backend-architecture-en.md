# Backend Architecture

This document describes the current backend architecture of the HMBTR project. It is a map of the actual code structure after the recent refactors, not an abstract target design.

## Overview

The backend is built with NestJS. Main source code lives in `backend/src`, the Prisma schema lives in `backend/prisma`, and the generated Prisma client lives in `backend/src/generated/prisma`.

The application is composed around `AppModule`. It imports:

- `AuthModule`;
- `UsersModule`;
- `FightersModule`;
- `TournamentsModule`;
- `CountriesModule`;
- `CitiesModule`;
- `ClubsModule`;
- `NominationsModule`;
- `CompetitorsModule`;
- `GroupsModule`;
- `GroupCompetitorsModule`;
- `CompetitionModule`;
- `DisciplinaryCardsModule`;
- `RatingsModule`;
- `MarshalsModule`;
- `SettingsModule`.

Global infrastructure is registered in `AppModule`:

- `JwtAuthGuardGlobal` - global JWT authorization, except routes marked with `@Public()`;
- `AllExceptionsFilter` - unified HTTP error shape;
- `UpdateLoggerInterceptor` - logging for mutating HTTP requests;
- `WinstonModule` - logging infrastructure;
- `EmailService` - email delivery.

The current backend architecture style is: public Nest services stay as stable facades for controllers and neighboring modules, while real business logic is moved into task-oriented internal services.

## Layers

### Controller Layer

Controllers own the HTTP boundary:

- route mapping;
- DTO binding;
- applying `@Public()`, guards, and request user checks;
- delegating to the public module service.

Controllers should not own business logic, Prisma queries, or complex state transitions.

Examples:

- `auth/auth.controller.ts`;
- `competition/competition.controller.ts`;
- `disciplinary-cards/disciplinary-cards.controller.ts`;
- `tournaments/tournaments.controller.ts`;
- `ratings/ratings.controller.ts`.

### DTO Layer

DTOs live in `dto/` folders inside modules. They define route input contracts through `class-validator` and `class-transformer`.

The global `ValidationPipe` is configured in `main.ts` and mirrored in the integration-test bootstrap:

- `whitelist: true`;
- `forbidNonWhitelisted: false`;
- `transform: true`.

DTOs should not contain business logic. Their job is to describe input shape and basic technical constraints.

### Public Service Facade Layer

A public service is the stable entry point into a module. Controllers and neighboring modules should call it instead of internal collaborators.

Examples:

- `CompetitionService`;
- `DisciplinaryCardsService`;
- `TournamentsService`;
- `RatingsService`;
- `AuthService`.

For complex modules, the public service should be a facade:

- preserve public methods;
- delegate to internal services;
- avoid accumulating private business helpers;
- return collaborator results without changing response shape.

### Internal Service Layer

Internal services are grouped by business task, not by technical accident.

A good internal service answers: "Which specific business task does this file own?"

Examples:

- `competition/results/result-submission.validator.ts`;
- `competition/rankings/pending-tie.service.ts`;
- `disciplinary-cards/automatic-reds/automatic-red-card.service.ts`;
- `tournaments/reports/tournament-report-reader.service.ts`;
- `ratings/calculation/rating-calculation.service.ts`.

### Pure Logic Layer

Pure logic files contain deterministic algorithms without Nest DI, Prisma, or side effects.

Examples:

- `competition/logic/group-generation.ts`;
- `competition/logic/rankings.ts`;
- `competition/logic/olympic-seeding.ts`;
- `competition/logic/olympic-advancement.ts`;
- `ratings/ratings.logic.ts`;
- helpers from `@shared/fightScoring`.

Pure functions are easier to test and safer to change because they do not talk directly to infrastructure.

### Persistence Layer

Persistence is implemented with Prisma 7 and `@prisma/adapter-pg`.

`PrismaModule` is global and exports `PrismaService`.

`PrismaService`:

- creates a `pg.Pool`;
- attaches the `PrismaPg` adapter;
- extends the generated `PrismaClient`;
- calls `$connect()` in `onModuleInit`;
- closes `$disconnect()` and `pg.Pool.end()` in `onModuleDestroy`.

Transaction aliases in complex modules are based on the generated `PrismaClient`, not the Nest-specific `PrismaService`. This prevents Nest lifecycle hooks from leaking into transaction client types.

Examples:

- `competition/competition-internal.types.ts`;
- `ratings/ratings-internal.types.ts`.

## Module Architecture

## Auth

Folder: `backend/src/auth`

Responsibilities:

- registration;
- login/logout/profile;
- refresh tokens;
- JWT strategy;
- password hashing;
- administrator notification after new user registration.

Key files:

- `auth.controller.ts` - HTTP routes;
- `auth.service.ts` - public service and main auth logic;
- `strategies/jwt.strategy.ts` - Passport JWT strategy;
- `guards/jwt-auth.guard.ts` - route-level JWT guard;
- `guards/jwt-auth-global.guard.ts` - global guard with `@Public()` support;
- `decorators/public.decorator.ts` - public route marker.

`AuthService` is currently a cohesive service. It owns one related authorization workflow:

- user uniqueness checks;
- password hashing;
- access/refresh token issuance;
- refresh token persistence;
- email notification orchestration.

Email delivery is extracted into `EmailService`. Notification delivery failures do not break registration.

## Common

Folder: `backend/src/common`

Responsibilities:

- shared infrastructure;
- filters;
- interceptors;
- logger config;
- shared services.

Key elements:

- `AllExceptionsFilter` - normalizes HTTP errors;
- `UpdateLoggerInterceptor` - logs mutating HTTP requests and sanitizes sensitive fields;
- `EmailService` - infrastructure email service backed by nodemailer;
- `winston.config.ts` - logging configuration.

The `common` layer should not know competition, disciplinary-card, tournament, or rating domain logic.

## Prisma

Folder: `backend/src/prisma`

Responsibilities:

- single database access point;
- Prisma client and `pg.Pool` lifecycle management;
- global Nest module.

`PrismaModule` is marked with `@Global()`, so modules can inject `PrismaService` through DI.

Rules:

- raw SQL is acceptable when Prisma API does not cover the needed operation or compatibility table-existence checks are required;
- raw SQL should be localized in reader/storage services;
- transaction helpers should accept a typed transaction client, not the full `PrismaService`.

## Competition

Folder: `backend/src/competition`

This is the most complex backend module. It owns the tournament competition lifecycle:

- nomination state;
- group stage;
- Olympic bracket;
- fight generation and fixation;
- result persistence;
- stage rankings;
- tie detection and tie resolution;
- competitor advancement;
- rollback/cancel flows;
- final placements;
- red-card consequences inside competition.

### Public Boundary

External entry points:

- `CompetitionController` for HTTP;
- `CompetitionService` for the controller and neighboring modules.

`CompetitionModule` exports only `CompetitionService`.

This is important: `DisciplinaryCardsModule` should not import internal competition services directly. Its integration boundary is the public methods on `CompetitionService`.

### Root Files

- `competition.service.ts` - facade;
- `competition-red-card.service.ts` - facade for red-card methods needed by the competition and disciplinary-cards boundary;
- `competition.controller.ts` - HTTP routes;
- `competition.module.ts` - provider registration;
- `competition.constants.ts` - block/status/lifecycle/scope constants;
- `competition.helpers.ts` - small shared helpers;
- `competition-internal.types.ts` - shared internal types and `PrismaTx`;
- `competition.logic.ts` - compatibility barrel for pure logic exports.

### Pure Logic

Folder: `competition/logic`

- `domain-types.ts` - types for pure domain functions;
- `group-generation.ts` - group splitting and round-robin helpers;
- `rankings.ts` - standings and tie-detection algorithms;
- `olympic-seeding.ts` - Olympic bracket size and seeding;
- `olympic-advancement.ts` - third-place advancement.

These files must not import Nest services or Prisma.

### State

Folder: `competition/state`

- `CompetitionStateReader`

Owns:

- `getState`;
- tournament nomination lookup;
- active block lookup;
- next stage lookup;
- registered competitors lookup;
- frontend state read-model preparation.

The state reader owns shared read queries so use-case services do not duplicate include/select shapes.

### Blocks

Folder: `competition/blocks`

- `CompetitionBlockService`

Owns:

- group block creation;
- Olympic block creation;
- draft group persistence;
- group start index;
- locking the previous active block when the next stage starts.

The block service should not own result fixation, rankings, or scoring persistence.

### Fights

Folder: `competition/fights`

- `CompetitionFightService`

Owns:

- group fight generation;
- round-robin fight persistence;
- Olympic fight fixation;
- bracket slot swaps;
- fight numbering;
- bronze-before-final normalization calls.

The fight service works with formation/fights lifecycle, not result scoring rules.

### Results

Folder: `competition/results`

Facade:

- `CompetitionResultService`

Internal services:

- `ResultSubmissionValidator` - validates block/fight ownership, duplicates, fixed state, and completeness;
- `FightResultEvaluationService` - builds raw/effective evaluations, determines winner, handles warning bonuses and red-card forfeits;
- `FightResultPersistenceService` - persists fight scores, round-score snapshots, and warnings;
- `ResultFixationService` - fixes group/Olympic result transitions and starts Olympic progression;
- `result-types.ts` - local structural result types.

Important scoring flow rule: editable/fixed fight submissions must send `round_scores`, not aggregate `competitor1_score` / `competitor2_score`. Aggregate scores are calculated from round snapshots.

Red-card forfeits are server-generated results: they are required in complete submissions, but regular result flow must not re-evaluate or overwrite them.

### Scoring

Folder: `competition/scoring`

- `CompetitionScoringService`

Owns:

- effective aggregate score;
- warning bonuses;
- round score snapshot replacement;
- red-card forfeit score shape.

Low-level scoring algorithms live in shared logic; this service integrates those algorithms with Prisma persistence.

### Rankings

Folder: `competition/rankings`

Facade:

- `CompetitionRankingsService`

Internal services:

- `GroupRankingReader` - group standings through effective scores and manual order;
- `TieBreakerService` - shared advancement and double-red tie-break metrics from active current-tournament yellows and effective score diff;
- `PendingTieService` - ordinary group ties, Olympic third-place tie detection, and Olympic double-red conflict detection;
- `AdvancementService` - advancing competitor selection and active-red exclusion;
- `TieResolutionService` - manual placements persistence and group block transition to `RESULTS_FIXED`.

Active-red rule: fighters with active red cards remain visible in standings stats, but are excluded from advancement and tie checks where this affects later progression. Ties that affect advancement are broken by fewer active yellow cards from the current tournament, then effective score diff including yellow penalties; unresolved equality remains manual.

### Olympic

Folder: `competition/olympic`

- `CompetitionOlympicService` - low-level bracket helpers, slot progression, and fight creation from bracket slots;
- `CompetitionOlympicProgressService` - public transaction wrapper for progression flow.

The Olympic module owns bracket progression details. Other services should call it through narrow methods instead of rebuilding bracket logic.

### Lifecycle

Folder: `competition/lifecycle`

- `CompetitionLifecycleService`

Owns backward flows:

- cancel result fixation;
- cancel fight fixation;
- rollback;
- forfeit-safe resets;
- fight renumbering calls.

The lifecycle service must not become a dumping ground for creation/results/ranking logic.

### Finish

Folder: `competition/finish`

- `CompetitionFinishService`

Owns:

- final placements;
- nomination completion;
- rating reset/scheduling through `RatingsService`.

Finish flow is a separate business operation and should not live in results/rankings.

### Red Cards Inside Competition

Folder: `competition/red-cards`

Facade:

- `CompetitionRedCardService`

Internal services:

- `RedCardConsequencesService` - competition-side red-card workflows;
- `RedCardForfeitService` - applying and resetting forfeits;
- `RedCardRegistrationService` - unformed registration removal and active-red competitor lookup;
- `RedCardStorageService` - active-card queries and tournament check date;
- `red-card-policy.ts` - pure policy functions.

Competition owns card consequences for fights and brackets. Disciplinary-cards owns issuing, editing, and deleting cards.

## Disciplinary Cards

Folder: `backend/src/disciplinary-cards`

Responsibilities:

- manual yellow/red card CRUD;
- automatic red cards from yellow thresholds;
- active-red lookups for other modules;
- expiration calculation;
- marshal validation;
- closing/restoring source yellows;
- calls into `CompetitionService` for card-driven side effects.

### Public Boundary

External entry points:

- `DisciplinaryCardsController`;
- `DisciplinaryCardsService`.

`DisciplinaryCardsModule` exports only `DisciplinaryCardsService`.

`CompetitorsService` and other modules should use public methods:

- `hasActiveRedForTournament`;
- `getActiveRedFighterIdsForTournament`.

### Internal Services

- `cards/DisciplinaryCardReader` - list/read model and UI flags;
- `cards/DisciplinaryCardStorage` - storage readiness, raw insert/update/delete, stored-card lookup;
- `policy/DisciplinaryCardPolicyService` - target validation, marshal validation, edit/delete restrictions, automatic-card restrictions;
- `expiration/DisciplinaryCardExpirationService` - expiration date calculation and date-only helpers;
- `active-reds/ActiveRedCardService` - active-red checks by tournament date;
- `automatic-reds/AutomaticRedCardService` - yellow threshold detection and automatic red creation;
- `red-yellow-sources/RedYellowSourceService` - links between automatic red cards and source yellows, close/restore/delete flows;
- `consequences/DisciplinaryCardConsequencesService` - card side effects and calls into `CompetitionService`.

Boundary rule: disciplinary-cards must not implement competition forfeits itself. It calls public competition methods.

## Tournaments

Folder: `backend/src/tournaments`

Responsibilities:

- tournament CRUD;
- tournament nomination management;
- tournament marshals;
- tournament report generation and caching.

### Public Boundary

- `TournamentsController`;
- `TournamentsService`.

`TournamentsService` is a facade over focused services.

### Internal Services

- `core/TournamentCrudService` - base tournament CRUD;
- `nominations/TournamentNominationService` - add/update nomination and stage changes;
- `marshals/TournamentMarshalService` - tournament marshal registration lifecycle;
- `reports/TournamentReportService` - report facade;
- `reports/TournamentReportReader` - report read model and large include trees;
- `reports/TournamentReportStorage` - cached report persistence and storage readiness;
- `reports/TournamentReportMarkdownBuilder` - report markdown orchestration;
- `reports/TournamentReportCompetitionFormatter` - competition sections;
- `reports/TournamentReportFightScoreFormatter` - score formatting;
- `reports/TournamentFightNumberNormalizer` - compatibility normalization for bronze/final numbering before reports;
- `tournament-report.pdf.ts` - PDF adapter and markdown table helper.

Report flow is separated from tournament CRUD. PDF generation is external IO and should stay behind the report service/adapter boundary.

## Ratings

Folder: `backend/src/ratings`

Responsibilities:

- leaderboard;
- fighter rating profile;
- rating calculation after tournament finish;
- rating/history persistence.

### Public Boundary

- `RatingsController`;
- `RatingsService`.

`RatingsModule` exports `RatingsService`, because competition finish flow uses it.

### Internal Services

- `leaderboard/RatingLeaderboardService` - leaderboard by nomination;
- `profile/FighterRatingProfileService` - rating data for fighter profile;
- `calculation/RatingCalculationReader` - completed tournament/fight data for calculation;
- `calculation/RatingCalculationService` - rating calculation use case and transaction orchestration;
- `calculation/RatingPersistenceService` - rating/history persistence;
- `ratings.logic.ts` - pure rating algorithms;
- `ratings-internal.types.ts` - local rating types and `PrismaTx`.

Ratings should not know competition lifecycle details beyond persisted final/completed data needed for calculation.

## Fight Score Helpers

Folder: `backend/src/fights`

Responsibilities:

- shared fight score submission helpers;
- fight score data conversion;
- warning submission normalization used by competition result persistence.

Key files:

- `fight-score-submission.ts`;
- `fight-score-data.ts`;
- `fight-score-persistence.ts`;
- `fight-warning-submission.ts`;
- `fight-score.types.ts`.

There is no standalone fights API module. Competition owns tournament fight lifecycle, result fixation, and persistence orchestration. Files under `backend/src/fights` are shared helpers consumed by competition and report/result flows.

## Simple CRUD Modules

Relatively simple reference/CRUD modules:

- `countries`;
- `cities`;
- `clubs`;
- `fighters`;
- `marshals`;
- `nominations`;
- `users`;
- `groups`;
- `group-competitors`;
- `competitors`;
- `settings`.

They usually follow the simple Nest pattern:

- controller;
- service;
- module;
- DTOs when needed;
- direct Prisma access in the service.

These modules do not need deep decomposition until they accumulate multiple workflows or cross-module side effects.

## Cross-Module Boundaries

### Competition And Disciplinary Cards

Dependency direction:

- `DisciplinaryCardsModule` imports `CompetitionModule`;
- `DisciplinaryCardsService` calls public methods on `CompetitionService`;
- `CompetitionModule` does not import `DisciplinaryCardsModule`.

Reason:

- disciplinary-cards owns card lifecycle;
- competition owns forfeits and bracket consequences.

This boundary avoids circular ownership of red-card behavior.

### Competition And Ratings

Dependency direction:

- `CompetitionModule` imports `RatingsModule`;
- competition finish flow calls `RatingsService`.

Reason:

- competition decides when a nomination is completed;
- ratings owns rating calculation and persistence.

### Tournaments And Reports

Dependency direction:

- `TournamentsService` delegates report generation to report services inside the same module.

Reason:

- tournament report is a tournaments use case;
- report read model can include competition/card/marshal data, but lifecycle logic should not move into reports.

### Auth And Email

Dependency direction:

- `AuthService` uses `EmailService` for registration notifications.

Reason:

- auth owns the registration flow;
- email service owns delivery mechanics only.

## Error Handling

Errors are thrown through Nest exceptions:

- `BadRequestException`;
- `UnauthorizedException`;
- `ForbiddenException`;
- `NotFoundException`.

`AllExceptionsFilter` normalizes HTTP responses:

- `error`;
- optional `details`;
- `timestamp`.

During refactoring, preserve existing error texts unless the user explicitly asks to change API behavior.

## Authentication And Authorization

JWT auth is applied globally.

Public routes are marked with `@Public()`. Protected routes receive `req.user` from JWT validation.

Role-style checks are currently implemented locally where needed. For example, tournament report and marshal management routes check:

- `is_admin`;
- `is_organizer`;
- `is_secretary`.

This is pragmatic for the current size. If role checks spread further, a dedicated policy/guard layer may become appropriate.

## Test Architecture

### Unit And Focused Tests

Regular Jest tests live next to modules as `*.spec.ts`.

Current patterns:

- pure logic tests for algorithms;
- focused service tests for internal collaborators;
- facade tests only for public compatibility;
- mocks for Prisma and neighboring services.

Main command:

```sh
cd backend
npm test -- <spec files> --runInBand
```

### Integration Tests

Integration infrastructure lives in `backend/test`.

Files:

- `backend/docker-compose.test.yml`;
- `backend/test/.env.test`;
- `backend/test/jest-integration.json`;
- `backend/test/setup-integration-env.ts`;
- `backend/test/prepare-integration-db.js`;
- `backend/test/run-integration.js`;
- `backend/test/integration-utils.ts`;
- `backend/test/backend.integration-spec.ts`.

Full command:

```sh
cd backend
npm run test:integration:full
```

The command:

1. starts a separate test Postgres DB on port `5433`;
2. resets the schema with `prisma db push --force-reset`;
3. runs Jest integration tests through real Nest HTTP routes;
4. removes the container and volume after completion.

Current integration scenarios cover:

- repeated failed login for a missing user;
- successful login and protected profile route;
- group competition block/fight/result fixation flow;
- red-card route triggering competition forfeits;
- Russian tournament report PDF generation and cache persistence.

External IO is mocked at the boundary:

- email sending is mocked in the Nest testing module;
- PDF generation is mocked while internal markdown/report formatting remains real.

## Build And Validation

Use the `minimal-validation` skill and `docs/validation-policy.md` before choosing checks. Prefer focused validation for the changed behavior instead of running every backend check by default.

Typical backend checks:

```sh
cd backend
npx --no-install eslint "src/<module>/**/*.ts"
npm test -- <focused specs> --runInBand
npm run build
rg "\bany\b" src/<module>
```

For integration tests:

```sh
cd backend
npx --no-install eslint "test/**/*.ts"
npm run test:integration:full
```

Avoid broad `npm run lint` for narrow tasks because it runs ESLint with `--fix` over a wide glob.

## Current Architecture Rules

### Preserve Public API

Do not change routes, DTO fields, response shapes, module exports, or public service method names during internal refactors unless explicitly requested.

### Avoid Supermodules

If a service starts owning unrelated responsibilities, split it by business task:

- state reading;
- validation;
- policy;
- domain calculation;
- persistence;
- lifecycle transition;
- external side effect;
- report formatting.

### Do Not Mix Responsibilities

Examples of boundaries:

- report formatting should not mutate tournament lifecycle;
- disciplinary-cards should not implement competition forfeits;
- ratings should not own competition finalization;
- controllers should not contain Prisma queries;
- pure logic should not import Nest or Prisma.

### Remove Duplication Before Adding Abstractions

Extract helpers only when real repetition exists:

- optimistic transition count checks;
- fixed-result checks;
- score/warning/round-score row replacement;
- score reset/forfeit cleanup;
- repeated typed Prisma include/select shapes.

Do not create pass-through services or barrels only to make the structure look layered.

### Avoid Overengineering

A file can stay simple if it has one reason to change. Deep decomposition is useful for competition, disciplinary-cards, tournament reports, and ratings calculation because those areas have several business workflows. It is usually unnecessary for small CRUD modules.

### Do Not Use `any`

Project policy forbids introducing explicit `any`.

Use:

- generated Prisma types;
- local structural interfaces;
- DTO-derived `Parameters<T>` / return types where useful;
- `unknown` at unsafe boundaries with later narrowing;
- explicit test fixture interfaces.

## When To Refactor Further

Refactoring is appropriate when at least two signs are present:

- one file has several unrelated reasons to change;
- private helpers must be tested through casts;
- adding a feature risks touching unrelated flows;
- query shapes or transition logic repeat;
- a controller/service mixes validation, persistence, side effects, and formatting;
- vague names appear, such as `workflow`, `manager`, or `processor`, without a precise domain task.

Do not refactor only because a file is moderately long. A cohesive long file is better than a set of pass-through abstractions.

## Known Pragmatic Choices

- `PrismaModule` is global to simplify DI.
- Some compatibility checks use raw SQL because card/report storage requires table-existence checks.
- Integration tests use `prisma db push --force-reset` because the disposable test DB should reflect the current Prisma schema.
- `competition.logic.ts` remains a compatibility barrel for existing imports.
- Some role checks are local in controllers/services instead of a generalized policy layer; this is acceptable while authorization rules remain limited.

