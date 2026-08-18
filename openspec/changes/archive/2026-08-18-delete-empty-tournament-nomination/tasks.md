## 1. Backend

- [x] 1.1 Add a shared route constant/helper for deleting a tournament nomination membership.
- [x] 1.2 Add a tournament nomination delete endpoint under the existing tournaments controller boundary.
- [x] 1.3 Implement `TournamentNominationService` deletion with membership lookup, last-nomination guard, competitor-count guard, and membership-row deletion.
- [x] 1.4 Expose the service method through `TournamentsService`.
- [x] 1.5 Add focused backend tests for successful deletion, missing membership, last nomination rejection, and registered-competitor rejection.

## 2. Frontend

- [x] 2.1 Add a `tournamentsListStore` action that calls the delete route and removes the nomination from loaded tournament state.
- [x] 2.2 Add a tournament competition action for deleting the selected nomination and keeping the active tab on a remaining nomination.
- [x] 2.3 Render the delete action in the participant-list area only for an editable, empty, non-last tournament nomination.
- [x] 2.4 Add English and Russian i18n labels for the delete action.
- [x] 2.5 Add focused frontend tests for the empty-state delete action visibility and emitted/called delete behavior.

## 3. Validation

- [x] 3.1 Run the focused backend tournament service test file.
- [x] 3.2 Run the focused frontend component test file covering the participant-list empty state.
- [x] 3.3 Run TypeScript/type-check validation for touched backend, frontend, and shared route changes.
- [x] 3.4 Run the repository no-`any` check if available for this project.
