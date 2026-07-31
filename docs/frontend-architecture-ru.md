# Архитектура Frontend

Документ описывает текущую архитектуру frontend части проекта HMBTR. Это карта фактической структуры Vue-кода, а не абстрактная целевая схема.

## Общая картина

Frontend построен на Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS, примитивах Reka UI и i18next.

Основной код находится в `front/src`. Общие контракты между backend и frontend импортируются из `shared` через алиас `@shared`. Код приложения использует алиас `@` для `front/src`.

Приложение запускается в `front/src/app/main.ts`. Начальная загрузка отвечает за:

- создание Vue-приложения;
- создание и подключение Pinia;
- подключение Axios interceptors;
- инициализацию сохраненного состояния авторизации;
- подключение Vue Router;
- подключение i18next;
- регистрацию глобальной директивы `v-focus`;
- монтирование приложения.

Корневая оболочка находится в `front/src/app/App.vue`. Она рендерит:

- `AppShellNav` как фиксированную навигацию приложения;
- глобальный индикатор загрузки из `apiUi`;
- глобальное окно ошибки;
- текущий маршрут через `RouterView`.

Текущий архитектурный стиль frontend - прагматичная слоистая Vue-архитектура, а не строгий Feature-Sliced Design. Папки описывают ответственность и владение кодом:

- `app/` отвечает за запуск приложения и общую оболочку между маршрутами;
- `pages/` отвечают за композицию на уровне маршрутов;
- `features/` отвечают за переиспользуемые пользовательские сценарии и действия;
- `widgets/` отвечают за доменные UI-модули;
- `components/ui/` отвечает за универсальные UI-примитивы;
- `composables/` отвечают за переиспользуемую оркестрацию и состояние представления;
- `stores/` отвечают за Pinia-состояние и side effects на уровне хранилищ;
- `api/` отвечает за типизированные HTTP-адаптеры;
- `model/` отвечает за frontend-типы домена;
- `lib/` отвечает за чистые вспомогательные функции и политики;
- `i18n/` отвечает за переводы и настройку языка.

## Слои

### Слой приложения

Слой приложения - это точка входа и общая оболочка.

Ключевые файлы:

- `front/src/app/main.ts`;
- `front/src/app/App.vue`;
- `front/src/app/shell/AppShellNav/AppShellNav.vue`;
- `front/src/app/shell/LanguageSwitch/LanguageSwitch.vue`;
- `front/src/app/shell/UserMenu/UserMenu.vue`.

Слой приложения может связывать глобальные плагины, навигационную оболочку, инициализацию темы, инициализацию авторизации и глобальную обратную связь интерфейса. Он не должен владеть загрузкой данных конкретной страницы или доменными сценариями.

`AppShellNav` собирает навигационные ссылки, вход в систему, переключение языка и переключение темы. `LoginWidget` загружается лениво, потому что форма входа не нужна для первого рендера.

### Слой роутера

Роутер находится в `front/src/router/index.ts`.

Компоненты маршрутов импортируются динамически, поэтому страницы становятся отдельными чанками уровня маршрута. Метаданные маршрутов управляют авторизацией:

- `requiresAuth`;
- `requiresAdmin`;
- `requiresOrganizer`;
- `requiresMarshalManager`.

Глобальный navigation guard читает `useAuthStore` и один раз инициализирует профиль, если есть сохраненный access token. Администраторы проходят проверки ролей без дополнительных ограничений.

Роутер должен оставаться картой маршрутов и входной точкой проверки доступа. Он не должен становиться владельцем загрузки данных страниц, сложных бизнес-сценариев или HTTP-деталей.

### Слой страниц

Страницы находятся в `front/src/pages`.

Страницы - это композиционные оболочки на уровне маршрутов. Они должны:

- читать параметры маршрута и query params;
- выбирать общий layout страницы;
- вызывать page composables и stores;
- передавать типизированные props и actions в widgets и features;
- сохранять шаблоны понятными.

Крупные сценарии нужно выносить из файла страницы в composables или доменные widgets. `TournamentPage.vue` движется в этом направлении через `useTournamentPage`, который работает как фасад над более узкими tournament composables.

Примеры:

- `HomeViewPage.vue`;
- `FightersListPage.vue`;
- `FighterPage.vue`;
- `TournamentsListPage.vue`;
- `TournamentPage.vue`;
- `RatingPage.vue`;
- `UsersListPage.vue`;
- `SettingsPage.vue`.

### Слой features

Features находятся в `front/src/features`.

Feature - это переиспользуемый пользовательский сценарий или действие, которое может использоваться страницами или оболочкой приложения. Feature конкретнее UI-примитива, но меньше привязана к одному маршруту, чем страница.

Текущие области features:

- `auth` - вход, регистрация, auth service, части формы username/password;
- `location-select` - сценарий выбора страны, города и клуба;
- `person-name-form` - переиспользуемая группа полей ФИО;
- `search` - переиспользуемый поисковый виджет;
- `tournament-fighter-registration` - сценарий регистрации бойца на турнир.

Feature-компоненты могут владеть локальным состоянием форм, подсказками валидации и оркестрацией действий. Для доступа к API лучше использовать типизированные API-адаптеры или store actions, а не прямые произвольные HTTP-вызовы глубоко внутри UI.

### Слой widgets

Widgets находятся в `front/src/widgets`.

Widget - это доменный UI-модуль с бизнес-смыслом. Это не универсальный UI-примитив.

Текущие области widgets:

- `widgets/tournament/` - блоки соревнования, карточки, бои, номинации, сетки, регистрация судей, заголовок турнира и рабочая область турнира;
- `widgets/fighter/` - карточки бойцов и представление данных бойца;
- `widgets/marshal/` - турнирный UI, связанный с судьями;
- `widgets/rating/` - визуализация рейтинга;
- `widgets/user/` - администрирование пользователей;
- `widgets/AlertWidget/` - глобальное окно предупреждения.

Сложные widgets должны держать чистое вычисление представления и локальное UI-состояние рядом с компонентом. Например:

- `FightCard` содержит рядом helpers и тесты для счета и предупреждений;
- `OlympicBracket` содержит рядом построение view-модели и презентационные подкомпоненты;
- `DisciplinaryCards` содержит таблицу, отображение статуса и сфокусированные тесты.

Widgets, которые показывают или редактируют уже загруженные данные соревнования, должны получать данные через props и поднимать типизированные payloads действий наверх через emits. Вызовы stores обычно должны оставаться в оркестрации страницы или store facades, если только widget не является явно принятым вложенным сценарием.

### Слой UI-компонентов

Универсальные примитивы находятся в `front/src/components/ui`.

Этот слой содержит переиспользуемые презентационные компоненты и обертки вокруг Reka UI, VueUse, Tailwind utilities и небольших локальных helpers.

Примеры:

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

UI-примитивы не должны импортировать доменные stores, route params, API-адаптеры или бизнес-модели, если это не generic-типы. Доменный UI должен находиться в `features/` или `widgets/`.

### Слой composables

Переиспользуемая оркестрация и состояние представления находятся в `front/src/composables`.

Composables должны владеть сфокусированным поведением, которое иначе сделало бы pages или widgets слишком широкими:

- инициализация авторизации;
- жизненный цикл редактируемой entity form;
- оркестрация страницы турнира;
- группировка состояния и действий соревнования;
- скачивание отчета турнира;
- состояние, производное от карточек турнира;
- сохраненное состояние раскрытия блоков;
- статистика профиля бойца;
- данные страницы рейтинга.

`useTournamentPage` - самый крупный page facade. Он собирает stores, route state, i18n, загрузку турнира, выбор номинации, competition actions, карточки, регистрацию судей и скачивание отчета. Более узкие composables не дают фасаду превратиться в одну неструктурированную state machine.

### Слой stores

Pinia stores находятся в `front/src/stores`.

Stores владеют frontend-состоянием, кешированными коллекциями, мутациями на уровне хранилища и частью API-оркестрации. Это фасады состояния, которые используют страницы и composables.

Текущие stores:

- `auth` - пользователь, access token, refresh token, сохранение в localStorage;
- `apiUi` - глобальное состояние загрузки и ошибки;
- `commonData` - страны, города, клубы, номинации;
- `fightersList`;
- `marshalsList`;
- `tournamentsList`;
- `usersList`;
- `settings`;
- `disciplinaryCards`;
- `tournamentMarshals`;
- `competition`.

List stores переиспользуют `stores/shared/listStorePolicy.ts` для общего поведения списков: изменение поисковой строки, фильтрация, проверки количества записей на backend, merge/replace/upsert по id, расчет следующего id, сортировка и fallback rows.

Competition store оформлен как slice folder:

- `store.ts` - Pinia facade и публичные actions;
- `commands.ts` - HTTP commands;
- `mapper.ts` - маппинг backend state во frontend read model;
- `stateApplication.ts` - применение mapped state к store;
- `scoreDrafts.ts` и `resultDrafts.ts` - сохранение draft-состояния;
- `fightScoring.ts` - frontend helpers для счета.

Внешний код должен импортировать competition store из `@/stores/competition`, а не из приватных файлов slice.

### Слой API

HTTP-инфраструктура находится в `front/src/api`.

Ключевые файлы:

- `http.ts` - общий Axios instance и runtime API base URL;
- `interceptors.ts` - добавление token, refresh-token recovery, глобальная загрузка и глобальные ошибки;
- `auth.ts` - типизированные функции auth endpoints;
- `ratings.ts` - типизированные функции rating endpoints;
- `tournamentMarshals.ts` - типизированные функции endpoints для судей турнира.

Axios instance использует `window.__HMBTR_CONFIG__?.VITE_API_BASE_URL`, если доступен runtime config, иначе берет `import.meta.env.VITE_API_BASE_URL`.

Interceptors напрямую используют Pinia stores и держат refresh recovery независимым от feature composables. Auth endpoints исключены из refresh recovery, чтобы не создавать циклы повторных запросов.

Новые HTTP-вызовы уровня страницы обычно нужно добавлять как типизированные API functions или store actions. Route pages не должны накапливать прямые `http` calls, если поведение относится к переиспользуемой границе данных.

### Слой моделей и shared contracts

Frontend-типы домена находятся в `front/src/model`.

Сфокусированные модули:

- `competition.ts`;
- `disciplinaryCards.ts`;
- `fighter.ts`;
- `location.ts`;
- `marshal.ts`;
- `nomination.ts`;
- `rating.ts`;
- `tournament.ts`;
- `user.ts`.

`model/index.ts` остается compatibility barrel для старых импортов. Новый или сильно переработанный код должен предпочитать узкие импорты, например `@/model/competition` или `@/model/rating`.

Общие контракты backend/frontend импортируются через `@shared`, особенно:

- `@shared/routes`;
- `@shared/fightScoring`.

Frontend не должен дублировать route strings или scoring contracts, если уже есть shared contract.

### Слой чистых helpers

Чистые helpers находятся в `front/src/lib` и в сфокусированных colocated helper files.

Примеры:

- `checkAccess.ts` - проверки ролей и прав;
- `dateUtils.ts` - helpers для форматирования дат;
- `fightResult.ts` - представление и вычисление результата боя;
- `groupsStatistic.ts` - расчет статистики групп;
- `tournamentMarshalRegistration.ts` - политика регистрации судей;
- `utils.ts` - общие UI/data helpers.

Чистые helpers по возможности должны оставаться детерминированными. Если helper начинает требовать store state, HTTP, router или lifecycle i18n, его, скорее всего, нужно превратить в composable, store action или feature-level module.

### Слой I18n

Настройка i18n находится в `front/src/i18n`.

Переводы хранятся в:

- `front/src/i18n/locales/en.json`;
- `front/src/i18n/locales/ru.json`.

Выбранный язык сохраняется в `localStorage` под ключом `HMBTRi18nextLng`. Язык по умолчанию - русский.

Компоненты используют `$t` в templates или `useTranslation()` в script setup. Доменные данные с мультиязычными полями форматируются через helpers вроде `tData`.

### Слой стилизации и сборки

Глобальные стили находятся в `front/src/styles/globals.css`.

Frontend использует Tailwind CSS v4 через Vite Tailwind plugin. UI-компоненты используют Tailwind utility classes и общие primitives вместо page-specific CSS, когда это практично.

Vite configuration находится в `front/vite.config.ts`. Она задает:

- Vue и Vue JSX plugins;
- Tailwind plugin;
- Vue DevTools plugin;
- алиасы `@` и `@shared`;
- ручные vendor chunks для Vue, router, i18n, Axios, UI-зависимостей, date helpers, flags и text utilities.

Manual chunks используются, чтобы держать начальный `index` chunk небольшим и не скрывать реальные проблемы размера bundle через повышение `chunkSizeWarningLimit`.

## Доменные области

## Auth

Frontend auth разделен между:

- `stores/auth.ts` - сохраненное auth state и role getters;
- `api/auth.ts` - типизированные endpoint functions;
- `features/auth/useAuthService.ts` - фасад auth-сценария, который обновляет store;
- `features/auth/LoginWidget.vue` - UI входа и регистрации;
- `app/shell/UserMenu/UserMenu.vue` - меню авторизованного пользователя и logout action;
- `composables/useAuthInit.ts` - инициализация сохраненных tokens.

Access token и refresh token сохраняются в `localStorage`. Axios interceptors добавляют access token к исходящим запросам и выполняют refresh-token recovery для 401-ответов, не относящихся к auth endpoints.

## Списки и справочные данные

Бойцы, судьи, турниры и пользователи используют Pinia list stores. Эти stores кешируют массивы, предоставляют filtered getters и избегают повторной загрузки, если количество локально загруженных записей совпадает с количеством на backend.

`commonData` кеширует страны, города, клубы и номинации. Entity stores используют его, чтобы преобразовывать backend payloads с id во frontend read models с display names.

## Страница турнира и competition

Страница турнира - самая сложная область frontend.

Основные владельцы:

- `pages/TournamentPage.vue` - route shell и композиция template;
- `composables/useTournamentPage.ts` - page facade;
- `stores/competition` - facade состояния competition и выполнение backend commands;
- `widgets/tournament/TournamentCompetitionWorkspace` - adapter доменного workspace;
- tournament widgets для номинаций, участников, групп, боев, сеток, карточек, регистрации судей и пьедесталов.

Ожидаемый сценарий:

1. Маршрут предоставляет `tournamentId`.
2. `useTournamentPage` загружает турнир, common data, бойцов, карточки и судей.
3. Выбор активной номинации устанавливает tournament id и nomination id в competition store.
4. Competition store загружает участников и competition state.
5. `mapper.ts` преобразует backend state во frontend read models `CompetitionBlock`.
6. Widgets рендерят read model и поднимают типизированные actions наверх.
7. `useTournamentCompetitionActions` вызывает store actions и централизует UI errors и side effects отчета.

Эта граница не дает tournament widgets становиться владельцами API, но оставляет им богатое локальное состояние представления.

## Disciplinary Cards

Состояние disciplinary cards находится в `stores/disciplinaryCards.ts`. Представление карточек на странице турнира находится в `widgets/tournament/DisciplinaryCards`.

Оркестрация страницы турнира вычисляет:

- активные типы карточек;
- количество карточек, связанных с боем;
- ключи бойцов с красными карточками;
- количество удаляемых сущностей для rollback actions.

Widgets могут владеть локальными edit drafts и состоянием issue dialog, но backend mutations должны проходить через store actions или оркестрацию страницы.

## Ratings и профили бойцов

Rating API functions находятся в `api/ratings.ts`. Данные страницы рейтинга загружаются через `useRatingPageData`.

Статистика профиля бойца загружается через `useFighterProfileStats`. `FighterRatingChart` отвечает за визуализацию истории рейтинга и использует generic chart primitives из `components/ui/chart`.

## Settings и администрирование

Settings и администрирование пользователей используют страницы уровня маршрута с focused stores и widgets:

- `SettingsPage.vue` координирует номинации и настройки disciplinary cards;
- `UsersListPage.vue` использует `widgets/user/UsersTabs`;
- `stores/settings.ts` отвечает за вызовы settings endpoints;
- `stores/usersList.ts` отвечает за загрузку и обновление списка пользователей.

Admin-only routes защищены через route metadata в роутере.

## Правила границ

### Pages и widgets

Pages владеют контекстом маршрута и оркестрацией. Widgets владеют доменным UI. Widgets не должны читать параметры маршрута или создавать global stores, если feature явно не владеет этим вложенным сценарием.

### Stores и API

Stores могут вызывать типизированные API functions или прямые команды общего Axios instance, если они являются data facade. Повторяющиеся или cross-feature endpoint calls нужно выносить в `front/src/api`.

### Frontend и backend contracts

Используйте `@shared/routes` для route constants и `@shared/fightScoring` для scoring contracts. Не копируйте backend route strings или fight-scoring shapes во frontend-only files.

### I18n и доменные данные

Статический UI-текст должен находиться в locale JSON files. Мультиязычные доменные данные нужно выбирать через helpers вроде `tData`, используя активный язык i18next.

## Обработка Ошибок

Глобальная HTTP-загрузка и отображение ошибок принадлежат `apiUi` и Axios interceptors.

Поток запроса:

- request interceptor запускает loading и очищает предыдущую глобальную ошибку;
- успешный response останавливает loading;
- response error останавливает loading, пытается обновить token для подходящих 401-ответов, затем записывает нормализованное сообщение ошибки в `apiUi`;
- `App.vue` рендерит `AlertWidget`, когда в `apiUi.error` есть значение.

Локальные компоненты все еще могут хранить локальное состояние загрузки, когда это нужно, например для кнопок отправки формы или скачивания отчета.

## Аутентификация и авторизация

Состояние аутентификации хранится в Pinia store `auth`. Role getters предоставляют:

- `isAuthenticated`;
- `isAdmin`;
- `isOrganizer`;
- `isSecretary`.

Авторизация применяется в роутере для защищенных маршрутов и во frontend helpers для условного UI. Frontend-проверки нужны для пользовательского опыта; backend guards остаются реальной границей безопасности.

## Тестовая архитектура

Frontend tests используют Vitest и Vue Test Utils.

Focused tests есть для:

- API interceptors;
- общей политики list stores;
- competition mapping, scoring и drafts;
- tournament widgets;
- поведения fight card;
- поведения таблицы disciplinary cards;
- crop math и поведения image upload;
- rating и fighter UI helpers;
- поведения settings page;
- поведения shell user menu.

Test files лежат рядом с поведением, которое они покрывают. Чистые helpers и composables нужно тестировать напрямую, когда они владеют значимой логикой. Vue component tests должны фокусироваться на отрисованном поведении, emitted payloads и важных пользовательских сценариях.

End-to-end tests настроены через Cypress scripts, но стандартная validation policy предпочитает focused Vitest и type/build checks, если измененный сценарий не требует browser-level coverage.

## Сборка и валидация

Типовые frontend-проверки:

```sh
npm run check:no-any
npm run check:front:type
npm run check:front:build
```

Focused unit tests можно запускать так:

```sh
npm --prefix front run check:unit -- <spec-file>
```

Используйте `npm run check:front:build` для изменений, которые влияют на Vite config, route-level chunks, imports, assets или runtime bundling.

## Текущие архитектурные правила

### Сохраняйте контракты маршрутов и stores

Не меняйте route names, paths, семантику route meta, имена store actions или публичные props/emits widgets, если это не требуется задачей.

### Держите pages композиционными оболочками

Если page начинает владеть несколькими независимыми сценариями, выносите поведение в composable, store slice или доменный widget.

### Держите widgets доменными

Widgets должны выражать понятия турниров, бойцов, судей, рейтинга или пользователей. Универсальные primitives должны находиться в `components/ui`.

### Держите API-границы типизированными

Не добавляйте нетипизированные endpoint helpers. Response DTOs, request payloads и read models для stores должны иметь явные TypeScript-типы.

### Не используйте `any`

Проектная политика запрещает явный `any`. Используйте доменные interfaces, generics, `unknown` с narrowing или типы, предоставленные библиотеками.

### Не дублируйте логику списков

List stores должны переиспользовать `stores/shared/listStorePolicy.ts` для повторяющегося поведения поиска, merge, upsert, сортировки и remote-count guards.

### Не допускайте случайного роста bundle

Route pages должны оставаться динамически импортируемыми. Некритичные shell features стоит загружать лениво, если они не нужны для первого рендера. Manual chunking должен быть осознанным; не подавляйте large chunk warnings повышением `chunkSizeWarningLimit` без понимания причины.

## Когда рефакторить дальше

Рефакторинг нужен, когда:

- page file превращается в набор несвязанных сценариев;
- widget вызывает stores или HTTP для поведения, которое должна оркестрировать страница;
- несколько stores повторяют одну и ту же политику кеша, поиска или upsert;
- маппинг API response дублируется в pages и stores;
- тестам нужны casts или доступ к приватным деталям, чтобы проверить важное поведение;
- route chunk растет из-за eager import некритичного UI.

Не стоит рефакторить, если разделение только создает pass-through files или прячет небольшой цельный компонент за лишней абстракцией.

## Известные прагматичные решения

- Архитектура слоистая, но не строгий FSD. Существующее владение папками важнее следования терминологии.
- Некоторые stores все еще вызывают `http` напрямую. Это приемлемо для data facades на уровне stores, но повторяющуюся endpoint logic нужно выносить в `api/`.
- `model/index.ts` остается для compatibility. Новый код должен предпочитать узкие model imports.
- `AlertWidget` остается top-level widget, пока не появится более точная граница владения.
- Страница турнира остается крупной зоной оркестрации, но ее состояние и actions разделены между более узкими composables и widgets.
