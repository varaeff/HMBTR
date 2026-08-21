# Архитектура Backend

Документ описывает текущую архитектуру backend части проекта HMBTR. Это карта фактической структуры кода после проведенных рефакторингов, а не абстрактная целевая схема.

## Общая Картина

Backend построен на NestJS. Основной код находится в `backend/src`, Prisma-схема - в `backend/prisma`, сгенерированный клиент Prisma - в `backend/src/generated/prisma`.

Приложение собирается вокруг `AppModule`. В него подключены:

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

Глобальные инфраструктурные элементы регистрируются в `AppModule`:

- `JwtAuthGuardGlobal` - глобальная JWT-авторизация, кроме маршрутов с `@Public()`;
- `AllExceptionsFilter` - единый формат HTTP-ошибок;
- `UpdateLoggerInterceptor` - логирование изменяющих HTTP-запросов;
- `WinstonModule` - инфраструктура логирования;
- `EmailService` - отправка email.

Основной архитектурный стиль backend сейчас: публичные Nest-сервисы остаются стабильными фасадами для контроллеров и соседних модулей, а реальная бизнес-логика разнесена по внутренним сервисам, сгруппированным по задачам.

## Слои

### Слой Контроллеров

Контроллеры отвечают за HTTP-границу:

- привязку маршрутов;
- прием DTO;
- применение `@Public()`, guards и проверок пользователя из запроса;
- передачу управления публичному сервису модуля.

Контроллеры не должны владеть бизнес-логикой, Prisma-запросами или сложными переходами состояния.

Примеры:

- `auth/auth.controller.ts`;
- `competition/competition.controller.ts`;
- `disciplinary-cards/disciplinary-cards.controller.ts`;
- `tournaments/tournaments.controller.ts`;
- `ratings/ratings.controller.ts`.

### Слой DTO

DTO находятся в папках `dto/` внутри модулей. Они задают входной контракт HTTP-маршрутов через `class-validator` и `class-transformer`.

Глобальный `ValidationPipe` настроен в `main.ts` и повторяется в bootstrap integration-тестов:

- `whitelist: true`;
- `forbidNonWhitelisted: false`;
- `transform: true`.

DTO не должны содержать бизнес-логику. Их задача - описать форму входных данных и базовые технические ограничения.

### Слой Публичных Сервисов-Фасадов

Публичный сервис - это стабильная точка входа в модуль. Контроллеры и соседние модули обращаются именно к нему.

Примеры:

- `CompetitionService`;
- `DisciplinaryCardsService`;
- `TournamentsService`;
- `RatingsService`;
- `AuthService`.

Для сложных модулей публичный сервис должен быть фасадом:

- сохраняет публичные методы;
- делегирует выполнение внутренним сервисам;
- не накапливает приватные вспомогательные методы бизнес-логики;
- возвращает результаты внутренних сервисов без изменения формы ответа.

### Слой Внутренних Сервисов

Внутренние сервисы группируются по бизнес-задачам, а не по технической случайности.

Хороший внутренний сервис отвечает на вопрос: "за какую конкретную бизнес-задачу отвечает этот файл?".

Примеры:

- `competition/results/result-submission.validator.ts`;
- `competition/rankings/pending-tie.service.ts`;
- `disciplinary-cards/automatic-reds/automatic-red-card.service.ts`;
- `tournaments/reports/tournament-report-reader.service.ts`;
- `ratings/calculation/rating-calculation.service.ts`.

### Слой Чистой Логики

Файлы чистой логики содержат детерминированные алгоритмы без Nest DI, Prisma и побочных эффектов.

Примеры:

- `competition/logic/group-generation.ts`;
- `competition/logic/rankings.ts`;
- `competition/logic/olympic-seeding.ts`;
- `competition/logic/olympic-advancement.ts`;
- `ratings/ratings.logic.ts`;
- вспомогательные функции из `@shared/fightScoring`.

Такие функции проще тестировать и безопаснее менять, потому что они не работают напрямую с инфраструктурой.

### Слой Persistence

Слой сохранения данных реализован через Prisma 7 и `@prisma/adapter-pg`.

`PrismaModule` является глобальным модулем и экспортирует `PrismaService`.

`PrismaService`:

- создает `pg.Pool`;
- подключает `PrismaPg` adapter;
- наследуется от сгенерированного `PrismaClient`;
- вызывает `$connect()` в `onModuleInit`;
- закрывает `$disconnect()` и `pg.Pool.end()` в `onModuleDestroy`.

Псевдонимы типов для транзакций в сложных модулях основаны на сгенерированном `PrismaClient`, а не на Nest-specific `PrismaService`. Это важно, чтобы lifecycle hooks Nest не попадали в тип клиента транзакции.

Примеры:

- `competition/competition-internal.types.ts`;
- `ratings/ratings-internal.types.ts`.

## Архитектура Модулей

## Auth

Папка: `backend/src/auth`

Назначение:

- регистрация;
- вход, выход и профиль пользователя;
- refresh tokens;
- JWT strategy;
- password hashing;
- уведомление администраторов о регистрации нового пользователя.

Ключевые файлы:

- `auth.controller.ts` - HTTP-маршруты;
- `auth.service.ts` - публичный сервис и основная логика авторизации;
- `strategies/jwt.strategy.ts` - JWT strategy для Passport;
- `guards/jwt-auth.guard.ts` - JWT guard уровня маршрута;
- `guards/jwt-auth-global.guard.ts` - глобальный guard с поддержкой `@Public()`;
- `decorators/public.decorator.ts` - маркер публичного маршрута.

`AuthService` сейчас является достаточно цельным сервисом. Он отвечает за один связанный процесс авторизации:

- проверку уникальности пользователя;
- hashing пароля;
- выпуск пары access/refresh tokens;
- сохранение refresh token;
- orchestration email-уведомления.

Отправка email вынесена в `EmailService`. Ошибки доставки уведомлений не ломают регистрацию.

## Common

Папка: `backend/src/common`

Назначение:

- общая инфраструктура;
- filters;
- interceptors;
- logger config;
- общие сервисы.

Ключевые элементы:

- `AllExceptionsFilter` - нормализует HTTP-ошибки;
- `UpdateLoggerInterceptor` - логирует изменяющие HTTP-запросы и скрывает чувствительные поля;
- `EmailService` - инфраструктурный сервис отправки email через nodemailer;
- `winston.config.ts` - конфигурация логирования.

Слой `common` не должен знать доменную логику соревнований, дисциплинарных карточек, турниров или рейтингов.

## Prisma

Папка: `backend/src/prisma`

Назначение:

- единая точка доступа к базе;
- управление жизненным циклом клиента Prisma и `pg.Pool`;
- глобальный Nest-модуль.

`PrismaModule` помечен `@Global()`, поэтому модули могут получать `PrismaService` через DI.

Правила:

- raw SQL допустим, когда Prisma API не покрывает нужную операцию или нужна проверка совместимости на существование таблицы;
- raw SQL должен быть локализован в сервисах чтения или хранения;
- вспомогательные функции транзакций должны принимать типизированный клиент транзакции, а не полный `PrismaService`.

## Competition

Папка: `backend/src/competition`

Это самый сложный backend-модуль. Он отвечает за жизненный цикл соревнований:

- состояние номинации;
- групповой этап;
- олимпийскую сетку;
- генерацию и фиксацию боев;
- сохранение результатов;
- рейтинги внутри этапа;
- выявление и разрешение ничьих;
- продвижение участников;
- процессы rollback/cancel;
- финальные места;
- последствия красных карточек внутри соревнований.

### Публичная Граница

Внешние точки входа:

- `CompetitionController` для HTTP;
- `CompetitionService` для контроллера и соседних модулей.

`CompetitionModule` экспортирует только `CompetitionService`.

Это важно: `DisciplinaryCardsModule` не должен импортировать внутренние сервисы соревнований напрямую. Его граница интеграции - публичные методы `CompetitionService`.

### Корневые Файлы

- `competition.service.ts` - фасад;
- `competition-red-card.service.ts` - фасад для методов красных карточек, нужных на границе competition и disciplinary-cards;
- `competition.controller.ts` - HTTP-маршруты;
- `competition.module.ts` - регистрация providers;
- `competition.constants.ts` - constants для блока, статуса, жизненного цикла и области действия;
- `competition.helpers.ts` - небольшие общие вспомогательные функции;
- `competition-internal.types.ts` - общие внутренние типы и `PrismaTx`;
- `competition.logic.ts` - barrel-файл совместимости для exports чистой логики.

### Чистая Логика

Папка: `competition/logic`

- `domain-types.ts` - типы для чистых доменных функций;
- `group-generation.ts` - разбиение на группы и вспомогательные функции round-robin;
- `rankings.ts` - алгоритмы standings и tie detection;
- `olympic-seeding.ts` - размер олимпийской сетки и seeding;
- `olympic-advancement.ts` - продвижение третьих мест.

Эти файлы не должны импортировать Nest-сервисы или Prisma.

### State

Папка: `competition/state`

- `CompetitionStateReader`

Отвечает за:

- `getState`;
- поиск tournament nomination;
- поиск active block;
- поиск следующего этапа;
- поиск registered competitors;
- подготовку модели чтения для состояния frontend.

Сервис чтения состояния владеет общими запросами чтения, чтобы сервисы сценариев использования не дублировали формы `include`/`select`.

### Blocks

Папка: `competition/blocks`

- `CompetitionBlockService`

Отвечает за:

- создание group block;
- создание Olympic block;
- сохранение draft groups;
- group start index;
- lock предыдущего active block при старте следующего этапа.

Сервис блоков не должен владеть фиксацией результатов, ранжированием или сохранением данных подсчета.

### Fights

Папка: `competition/fights`

- `CompetitionFightService`

Отвечает за:

- генерацию боев группового этапа;
- сохранение round-robin боев;
- фиксацию боев олимпийской сетки;
- swap bracket slots;
- нумерацию боев;
- вызовы нормализации для порядка bronze-before-final.

Сервис боев работает с жизненным циклом формирования и фиксации боев, но не с правилами сохранения результатов.

### Results

Папка: `competition/results`

Фасад:

- `CompetitionResultService`

Внутренние сервисы:

- `ResultSubmissionValidator` - проверяет принадлежность блока и боя, дубликаты, зафиксированное состояние и полноту отправки;
- `FightResultEvaluationService` - строит исходные и эффективные оценки, определяет победителя, учитывает бонусы за предупреждения и forfeits от красных карточек;
- `FightResultPersistenceService` - сохраняет счет боя, снимки счета по раундам и предупреждения;
- `ResultFixationService` - фиксирует переходы состояния для результатов группового этапа и олимпийской сетки, запускает продвижение олимпийской сетки;
- `result-types.ts` - локальные структурные типы результатов.

Важное правило процесса подсчета: отправка редактируемых или фиксируемых результатов боя должна присылать `round_scores`, а не агрегированные `competitor1_score` / `competitor2_score`. Итоговый счет считается из снимков раундов.

Forfeits от красных карточек являются результатами, сгенерированными сервером: они обязательны для полной отправки результатов, но не переоцениваются и не перезаписываются обычным процессом сохранения результатов.

### Scoring

Папка: `competition/scoring`

- `CompetitionScoringService`

Отвечает за:

- эффективный итоговый счет;
- бонусы за предупреждения;
- замену снимков счета по раундам;
- форму счета для forfeit от красной карточки.

Низкоуровневые алгоритмы подсчета находятся в общей логике, а сервис занимается интеграцией с сохранением данных через Prisma.

### Rankings

Папка: `competition/rankings`

Фасад:

- `CompetitionRankingsService`

Внутренние сервисы:

- `GroupRankingReader` - standings группы через эффективный счет и ручной порядок;
- `TieBreakerService` - общие метрики tie-break для продвижения и double-red: активные желтые текущего турнира и эффективная разница очков;
- `PendingTieService` - обычные ничьи в группе, выявление ничьи за третьи места перед олимпийской сеткой и double-red conflict в олимпийской сетке;
- `AdvancementService` - выбор участников, проходящих дальше, и исключение бойцов с активной красной карточкой;
- `TieResolutionService` - сохранение ручных мест и перевод group block в `RESULTS_FIXED`.

Правило active-red: бойцы с активной красной карточкой видны в статистике standings, но исключаются из прохождения дальше и проверок ничьих там, где это влияет на дальнейший этап. Ничьи, влияющие на продвижение, разрешаются по меньшему числу активных желтых карточек текущего турнира, затем по эффективной разнице очков с учетом штрафов за желтые; если равенство остается, оно решается вручную.

### Olympic

Папка: `competition/olympic`

- `CompetitionOlympicService` - низкоуровневые вспомогательные методы для сетки, продвижение слотов, создание боев из bracket slots;
- `CompetitionOlympicProgressService` - публичная транзакционная обертка для процесса продвижения.

Олимпийский модуль владеет деталями продвижения сетки. Другие сервисы должны вызывать его через узкие методы, а не пересобирать логику сетки.

### Lifecycle

Папка: `competition/lifecycle`

- `CompetitionLifecycleService`

Отвечает за обратные процессы:

- cancel result fixation;
- отмену фиксации боев;
- rollback;
- forfeit-safe resets;
- вызовы перенумерации боев.

Сервис жизненного цикла не должен становиться местом сброса несвязанной логики создания, результатов и ранжирования.

### Finish

Папка: `competition/finish`

- `CompetitionFinishService`

Отвечает за:

- финальные места;
- завершение nomination;
- reset/scheduling рейтинга через `RatingsService`.

Процесс завершения является отдельной бизнес-операцией и не должен жить в results/rankings.

### Красные Карточки Внутри Competition

Папка: `competition/red-cards`

Фасад:

- `CompetitionRedCardService`

Внутренние сервисы:

- `RedCardConsequencesService` - competition-side процессы красных карточек;
- `RedCardForfeitService` - применение и reset forfeits;
- `RedCardRegistrationService` - удаление незасеянных регистраций и поиск участников с активной красной карточкой;
- `RedCardStorageService` - active-card queries и tournament check date;
- `red-card-policy.ts` - чистые policy-функции.

Модуль соревнований владеет последствиями карточек для боев и сетки. Модуль дисциплинарных карточек владеет выпуском, редактированием и удалением карточек.

### Withdrawals Inside Competition

Folder: `competition/withdrawals`

- `CompetitionWithdrawalService`

Owns nomination-scoped no-show and fight-card withdrawals:

- creation and cancelation validation;
- active withdrawal state and source metadata;
- generated technical forfeits linked through `forfeit_withdrawal_id`;
- exclusion of withdrawn competitors from advancement while preserving standings visibility;
- cleanup of fight-sourced withdrawals when their source fights are deleted by lifecycle rollback/cancel flows.

Pre-block no-show withdrawals are not tied to a source fight and should survive fight rollback so consequences can be reapplied after fights are regenerated. Fight-card withdrawals are tied to a source fight; lifecycle deletion must remove those withdrawals and reset their generated forfeits before deleting fights.

## Disciplinary Cards

Папка: `backend/src/disciplinary-cards`

Назначение:

- CRUD ручных желтых и красных карточек;
- автоматические красные карточки по порогу желтых карточек;
- поиск активных красных карточек для других модулей;
- расчет expiration;
- проверку судьи;
- закрытие/восстановление исходных желтых карточек;
- вызовы в `CompetitionService` при побочных эффектах, вызванных карточками.

### Публичная Граница

Внешние точки входа:

- `DisciplinaryCardsController`;
- `DisciplinaryCardsService`.

`DisciplinaryCardsModule` экспортирует только `DisciplinaryCardsService`.

`CompetitorsService` и другие модули должны использовать публичные методы:

- `hasActiveRedForTournament`;
- `getActiveRedFighterIdsForTournament`.

### Внутренние Сервисы

- `cards/DisciplinaryCardReader` - списки, модель чтения и UI-флаги;
- `cards/DisciplinaryCardStorage` - готовность хранилища, raw insert/update/delete, поиск сохраненной карточки;
- `policy/DisciplinaryCardPolicyService` - проверка цели карточки, проверка судьи, ограничения редактирования/удаления, ограничения автоматических карточек;
- `expiration/DisciplinaryCardExpirationService` - расчет даты истечения и вспомогательные функции для date-only значений;
- `active-reds/ActiveRedCardService` - проверки активной красной карточки на дату турнира;
- `automatic-reds/AutomaticRedCardService` - выявление порога желтых карточек и создание автоматической красной карточки;
- `red-yellow-sources/RedYellowSourceService` - связи автоматической красной карточки с исходными желтыми, процессы закрытия/восстановления/удаления;
- `consequences/DisciplinaryCardConsequencesService` - побочные эффекты карточек и вызовы в `CompetitionService`.

Правило границы: disciplinary-cards не реализует competition forfeits сам. Он вызывает публичные методы competition.

## Tournaments

Папка: `backend/src/tournaments`

Назначение:

- CRUD турниров;
- управление nominations турнира;
- tournament marshals;
- генерация и кэширование отчетов турнира.

### Публичная Граница

- `TournamentsController`;
- `TournamentsService`.

`TournamentsService` является фасадом над сфокусированными сервисами.

### Внутренние Сервисы

- `core/TournamentCrudService` - базовый CRUD турнира;
- `nominations/TournamentNominationService` - добавление/обновление nominations и изменение stage;
- `marshals/TournamentMarshalService` - жизненный цикл регистрации судей турнира;
- `reports/TournamentReportService` - фасад отчетов;
- `reports/TournamentReportReader` - модель чтения отчета и большие include trees;
- `reports/TournamentReportStorage` - сохранение кэша отчета и проверка готовности хранилища;
- `reports/TournamentReportMarkdownBuilder` - сборка markdown отчета;
- `reports/TournamentReportCompetitionFormatter` - sections соревнований;
- `reports/TournamentReportFightScoreFormatter` - форматирование счета;
- `reports/TournamentFightNumberNormalizer` - нормализация совместимости для нумерации бронзового и финального боев перед отчетом;
- `tournament-report.pdf.ts` - PDF adapter и helper для markdown-таблиц.

Процесс формирования отчета отделен от CRUD турнира. Генерация PDF - внешний ввод/вывод и должна оставаться за границей сервиса/адаптера отчетов.

## Ratings

Папка: `backend/src/ratings`

Назначение:

- таблица лидеров;
- профиль рейтинга бойца;
- расчет рейтинга после завершения турнира;
- сохранение рейтинга и истории;
- расчет рейтинга ИСБ России, сохраненные результаты номинации, публичные
  годовые таблицы лидеров и сводки для профиля бойца.

### Публичная Граница

- `RatingsController`;
- `RatingsService`.

`RatingsModule` экспортирует `RatingsService`, потому что процесс завершения соревнования использует его.

### Внутренние Сервисы

- `leaderboard/RatingLeaderboardService` - таблица лидеров по nomination;
- `profile/FighterRatingProfileService` - данные рейтинга для профиля бойца;
- `calculation/RatingCalculationReader` - чтение данных завершенного турнира и боев для расчета;
- `calculation/RatingCalculationService` - сценарий расчета рейтинга и orchestration транзакции;
- `calculation/RatingPersistenceService` - сохранение рейтинга и истории;
- `russia-hmb/RussiaHmbRatingService` - facade рейтинга ИСБ России для
  расчета и публичных read models;
- `russia-hmb/RussiaHmbRatingReader` - read model завершенной номинации,
  боев, мест, снятий и карточек для расчета ИСБ России;
- `russia-hmb/RussiaHmbRatingPersistence` - one-time сохранение расчета ИСБ
  России и результатов бойцов;
- `russia-hmb-rating.logic.ts` - чистая формула очков ИСБ России;
- `ratings.logic.ts` - чистые алгоритмы рейтинга;
- `ratings-internal.types.ts` - локальные типы рейтинга и `PrismaTx`.

Ratings не должен знать детали жизненного цикла соревнования сверх сохраненных финальных/завершенных данных, нужных для расчета.
Elo и ИСБ России - отдельные рейтинговые системы: ИСБ читает завершенные
соревнования, карточки и снятия, но не должен менять таблицы или статус
расчета Elo.

## Helpers Счета Боёв

Папка: `backend/src/fights`

Назначение:

- общие helper-функции для отправки счета боя;
- преобразование данных счета боя;
- нормализация warning-подачи, которую использует сохранение результатов competition.

Ключевые файлы:

- `fight-score-submission.ts`;
- `fight-score-data.ts`;
- `fight-score-persistence.ts`;
- `fight-warning-submission.ts`;
- `fight-score.types.ts`.

Отдельного API-модуля боев больше нет. Competition владеет жизненным циклом боев турнира, фиксацией результатов и оркестрацией сохранения. Файлы в `backend/src/fights` являются общими helper-функциями для competition и потоков отчетов/результатов.

## Простые CRUD-Модули

Относительно простые справочные/CRUD-модули:

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

Они обычно следуют простому Nest-паттерну:

- controller;
- service;
- module;
- DTOs при необходимости;
- прямой доступ к Prisma в сервисе.

Эти модули не требуют глубокой декомпозиции, пока в них не появляются несколько разных процессов или межмодульные побочные эффекты.

## Границы Между Модулями

### Competition И Disciplinary Cards

Направление зависимости:

- `DisciplinaryCardsModule` импортирует `CompetitionModule`;
- `DisciplinaryCardsService` вызывает публичные методы `CompetitionService`;
- `CompetitionModule` не импортирует `DisciplinaryCardsModule`.

Причина:

- disciplinary-cards владеет жизненным циклом карточек;
- competition владеет forfeits и bracket consequences.

Эта граница исключает циклическое владение поведением красных карточек.

### Competition И Ratings

Направление зависимости:

- `CompetitionModule` импортирует `RatingsModule`;
- процесс завершения соревнования вызывает `RatingsService`.

Причина:

- competition решает, когда nomination завершена;
- ratings владеет расчетом и сохранением рейтинга.

### Tournaments И Reports

Направление зависимости:

- `TournamentsService` делегирует генерацию отчета сервисам отчетов внутри этого же модуля.

Причина:

- отчет турнира - сценарий модуля tournaments;
- модель чтения отчета может включать данные соревнований, карточек и судей, но не должна переносить логику жизненного цикла в reports.

### Auth И Email

Направление зависимости:

- `AuthService` использует `EmailService` для registration notifications.

Причина:

- auth владеет процессом регистрации;
- email service владеет только механизмом доставки.

## Обработка Ошибок

Ошибки выбрасываются через Nest exceptions:

- `BadRequestException`;
- `UnauthorizedException`;
- `ForbiddenException`;
- `NotFoundException`.

`AllExceptionsFilter` нормализует HTTP-ответ:

- `error`;
- optional `details`;
- `timestamp`.

При рефакторинге нужно сохранять существующие тексты ошибок, если пользователь явно не просит изменить поведение API.

## Authentication И Authorization

JWT auth применяется глобально.

Публичные маршруты помечаются через `@Public()`. Защищенные маршруты получают `req.user` после JWT validation.

Проверки ролей сейчас реализованы локально там, где нужны. Например, маршруты управления отчетом турнира и судьями проверяют:

- `is_admin`;
- `is_organizer`;
- `is_secretary`.

Для текущего размера это прагматично. Если проверки ролей начнут активно повторяться, можно выделить отдельный слой policy/guard.

## Тестовая Архитектура

### Unit И Focused Tests

Обычные Jest tests живут рядом с модулями как `*.spec.ts`.

Текущие patterns:

- тесты чистой логики для алгоритмов;
- сфокусированные тесты сервисов для внутренних collaborators;
- тесты фасадов только для публичной совместимости;
- mocks для Prisma и соседних сервисов.

Основная команда:

```sh
cd backend
npm test -- <spec files> --runInBand
```

### Integration Tests

Integration infrastructure находится в `backend/test`.

Файлы:

- `backend/docker-compose.test.yml`;
- `backend/test/.env.test`;
- `backend/test/jest-integration.json`;
- `backend/test/setup-integration-env.ts`;
- `backend/test/prepare-integration-db.js`;
- `backend/test/run-integration.js`;
- `backend/test/integration-utils.ts`;
- `backend/test/backend.integration-spec.ts`.

Полная команда:

```sh
cd backend
npm run test:integration:full
```

Команда:

1. поднимает отдельную тестовую базу Postgres на порту `5433`;
2. сбрасывает схему через `prisma db push --force-reset`;
3. запускает интеграционные тесты Jest через реальные HTTP-маршруты Nest;
4. удаляет контейнер и Docker volume после завершения.

Текущие интеграционные сценарии покрывают:

- повторный неуспешный вход для отсутствующего пользователя;
- успешный вход и защищенный маршрут профиля;
- процесс создания группового блока соревнования, генерации боев и фиксации результатов;
- маршрут красной карточки, который запускает технические поражения в соревновании;
- генерацию PDF-отчета турнира на русском языке и сохранение кэша.

Внешний ввод/вывод мокается на границе:

- отправка email мокается в тестовом модуле Nest;
- генерация PDF мокается, но внутреннее форматирование markdown-отчета остается реальным.

## Сборка И Проверки

Перед выбором проверок используйте skill `minimal-validation` и `docs/validation-policy.md`. Для обычных изменений предпочитайте сфокусированную проверку измененного поведения, а не запуск всех backend checks по умолчанию.

Типовые backend-проверки:

```sh
cd backend
npx --no-install eslint "src/<module>/**/*.ts"
npm test -- <focused specs> --runInBand
npm run build
rg "\bany\b" src/<module>
```

Для integration-тестов:

```sh
cd backend
npx --no-install eslint "test/**/*.ts"
npm run test:integration:full
```

Не стоит запускать широкий `npm run lint` для узких задач, потому что он запускает ESLint с `--fix` по широкому glob.

## Текущие Архитектурные Правила

### Сохранять Публичный API

Не менять маршруты, поля DTO, формы ответов, экспорты модулей и имена публичных методов сервисов при внутренних рефакторингах, если это явно не запрошено.

### Избегать Супермодулей

Если сервис начинает владеть несвязанными обязанностями, разделять его по бизнес-задачам:

- чтение состояния;
- валидация;
- правила и политики;
- доменный расчет;
- сохранение данных;
- переход жизненного цикла;
- внешний побочный эффект;
- форматирование отчетов.

### Не Смешивать Ответственность

Примеры границ:

- форматирование отчета не должно менять жизненный цикл турнира;
- модуль disciplinary-cards не должен реализовывать технические поражения соревнований;
- модуль ratings не должен владеть завершением соревнования;
- контроллеры не должны содержать Prisma-запросы;
- чистая логика не должна импортировать Nest или Prisma.

### Убирать Дублирование До Абстракций

Вспомогательную функцию стоит выделять только при реальном повторении:

- проверки количества обновленных строк при оптимистичном переходе состояния;
- проверки зафиксированных результатов;
- замена строк счета, предупреждений и счета по раундам;
- сброс счета и очистка технических поражений;
- повторяющиеся типизированные формы Prisma `include`/`select`.

Не создавать сервисы-прокладки или barrel-файлы только ради внешнего вида структуры.

### Избегать Переусложнения

Файл может оставаться простым, если у него одна причина для изменения. Глубокая декомпозиция полезна для модулей competition, disciplinary-cards, отчетов турниров и расчета рейтингов, потому что там есть несколько бизнес-процессов. Для небольших CRUD-модулей это обычно не нужно.

### Не Использовать `any`

Проектная политика запрещает вводить явный `any`.

Использовать:

- сгенерированные типы Prisma;
- локальные структурные интерфейсы;
- типы на основе DTO, `Parameters<T>` и возвращаемые типы там, где это уместно;
- `unknown` на небезопасных границах с дальнейшим сужением типа;
- явные интерфейсы тестовых фикстур.

## Когда Рефакторить Дальше

Рефакторинг уместен, если выполняются хотя бы два признака:

- один файл имеет несколько несвязанных причин для изменения;
- приватные вспомогательные методы приходится тестировать через casts;
- добавление функциональности рискует затронуть несвязанные процессы;
- повторяются формы запросов или логика переходов;
- контроллер/сервис смешивает валидацию, сохранение данных, побочные эффекты и форматирование;
- появляются размытые названия вроде `workflow`, `manager`, `processor` без точной доменной задачи.

Не стоит рефакторить только из-за умеренной длины файла. Лучше цельный длинный файл, чем набор абстракций-прокладок.

## Известные Прагматичные Решения

- `PrismaModule` глобальный, чтобы упростить DI.
- Некоторые проверки совместимости используют raw SQL, потому что хранилища карточек и отчетов требуют проверки существования таблиц.
- Production-синхронизация схемы сейчас использует `prisma db push`; application-owned startup backfills допустимы для идемпотентных исправлений данных, которые `db push` не может выразить.
- Интеграционные тесты используют `prisma db push --force-reset`, потому что одноразовая тестовая база должна отражать текущую Prisma schema.
- `competition.logic.ts` остается barrel-файлом совместимости для существующих imports.
- Некоторые проверки ролей локальны в controllers/services вместо обобщенного policy-слоя; это приемлемо, пока правила авторизации не разрослись.
