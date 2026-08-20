## 1. Data Model And Contracts

- [x] 1.1 Add persisted nomination withdrawal records with active/canceled state, reason, excused flag, source kind, and optional source fight/block metadata.
- [x] 1.2 Add withdrawal-linked technical-forfeit tracking on fights without overloading `forfeit_card_id`.
- [x] 1.3 Regenerate Prisma/client artifacts required by the schema change.
- [x] 1.4 Extend backend DTOs and shared/frontend competition models with typed withdrawal and technical-forfeit fields.
- [x] 1.5 Add i18n keys for no-show, fighter-withdrew, cancel-withdrawal, withdrawal reason, excused reason, withdrawal marker hint text, and validation text.

## 2. Backend Withdrawal Workflow

- [x] 2.1 Add authorized endpoints/use cases for pre-block no-show, fight-card withdrawal, and cancel withdrawal.
- [x] 2.2 Validate unsafe requests: no access, wrong nomination/fighter/fight, open registration for no-show, existing blocks for no-show, fixed affected results, and finished nominations.
- [x] 2.3 Store pre-block no-show withdrawals as unexcused with reason `неявка`.
- [x] 2.4 Extract shared technical-forfeit score helpers from red-card-specific scoring while preserving existing red-card behavior.
- [x] 2.5 Apply active withdrawal consequences to current editable fights and later generated fights using source-aware applicability rules.
- [x] 2.6 Reset only withdrawal-generated technical losses when a withdrawal is canceled.
- [x] 2.7 Generalize technical-forfeit conflict handling for fights where both fighters have applicable technical-forfeit sources.

## 3. Competition Flow Integration

- [x] 3.1 Reapply active withdrawal consequences after group fight generation, Olympic fight generation, and Olympic progression where future fights may appear.
- [x] 3.2 Exclude active withdrawn group competitors from advancement selection and advancement-related tie detection while keeping them visible in standings.
- [x] 3.3 Update result fixation, rollback, and editable-result checks so withdrawal forfeits behave like server-generated technical results.
- [x] 3.4 Update rating/statistic mapping so withdrawal technical losses are not counted as ordinary match wins.
- [x] 3.5 Include active withdrawal summaries and fight technical-forfeit source data in competition state responses.

## 4. Frontend Implementation

- [x] 4.1 Add typed API/store commands for no-show, withdrawal, and cancel withdrawal, with competition-state refresh after mutations.
- [x] 4.2 Show "No-show" on closed-registration registered fighters before block formation and preserve "Remove" only while registration is open.
- [x] 4.3 Add fight-card context-menu actions for "fighter withdrew" and "cancel withdrawal" based on loaded state and editability.
- [x] 4.4 Build the withdrawal dialog with required reason, excused checkbox, cancel/save actions, and top close action matching existing dialog patterns.
- [x] 4.5 Render Lucide `TriangleAlert` withdrawal markers next to fighter names in registration lists, group displays, and fight cards for the affected nomination.
- [x] 4.6 Color withdrawal markers with base color for excused withdrawals and red for unexcused withdrawals, with hint text `боец снят: [reason]`.
- [x] 4.7 Update fight score editing, result display, round-time visibility, and fighter/standing markers to use generic technical-forfeit and withdrawal state.
- [x] 4.8 Keep tournament fight and registration widgets store-free by passing typed actions through tournament-page orchestration.

## 5. Tests And Validation

- [x] 5.1 Add focused backend tests for no-show creation, fight-card withdrawal, generated technical scores, cancelation, unsafe request rejection, and double technical-forfeit conflicts.
- [x] 5.2 Add focused backend ranking/progression tests for withdrawn competitors not advancing and future Olympic fights inheriting withdrawal consequences.
- [x] 5.3 Add focused frontend tests for registered-fighter action visibility, fight-card menu actions, withdrawal dialog validation, cancel-withdrawal visibility, and withdrawal marker placement/color/tooltips.
- [x] 5.4 Run `npm run check:no-any`.
- [x] 5.5 Run focused backend tests, including competition withdrawal/ranking tests and red-card regression tests touched by shared technical-forfeit helpers.
- [x] 5.6 Run focused frontend unit tests for changed tournament widgets/composables.
- [x] 5.7 Run `npm run check:backend:build` and `npm run check:front:type`.
