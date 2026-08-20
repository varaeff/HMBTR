## Purpose

Defines a Russia HMB rating workflow that calculates official per-tournament nomination points, stores them separately from Elo ratings, and exposes yearly leaderboards and fighter profile summaries.

## ADDED Requirements

### Requirement: Finished nomination exposes Russia HMB rating action
The system SHALL expose Russia HMB rating actions below the winner podium after a tournament nomination result is finalized.

#### Scenario: Calculate action is visible to administrators and secretaries before calculation
- **WHEN** an administrator or secretary views a finished tournament nomination with no saved Russia HMB rating
- **THEN** the system shows a centered "Подсчитать рейтинг ИСБ России" action below the top-three winners

#### Scenario: Calculate action is hidden from other users before calculation
- **WHEN** a user who is not an administrator or secretary views a finished tournament nomination with no saved Russia HMB rating
- **THEN** the system does not show the Russia HMB rating calculation action

#### Scenario: Saved rating action is visible to everyone
- **WHEN** any user views a finished tournament nomination with a saved Russia HMB rating
- **THEN** the system shows a centered "Рейтинг ИСБ России" action below the top-three winners

#### Scenario: Action is hidden before nomination finalization
- **WHEN** a tournament nomination result is not finalized
- **THEN** the system does not show the Russia HMB rating action below the podium

### Requirement: Russia HMB rating calculation modal collects tournament coefficient
The system SHALL let administrators and secretaries choose the tournament coefficient before calculating Russia HMB rating.

#### Scenario: Calculation modal opens with default coefficient
- **WHEN** an administrator or secretary activates "Подсчитать рейтинг ИСБ России"
- **THEN** the system opens a modal with a top-right close action
- **AND** the modal shows "Коэффициент турнира" and a coefficient selector in one row
- **AND** the selector offers `1`, `2`, and `4`
- **AND** coefficient `1` is selected by default
- **AND** the modal shows a "Сделать рассчет" action below the selector

#### Scenario: Modal can be dismissed before calculation
- **WHEN** the calculation modal is open
- **AND** the user activates the top-right close action
- **THEN** the modal closes without saving Russia HMB rating

### Requirement: Russia HMB rating is calculated from fights, placements, coefficient, and penalties
The system SHALL calculate each nomination participant's Russia HMB rating as `(Qc + Qn) * K - Qm`.

#### Scenario: Winner fight points are counted
- **WHEN** a finished nomination fight has a winner
- **THEN** the winning fighter receives `2` Qc points for that fight

#### Scenario: Total-score loser receives close-loss points
- **WHEN** a finished nomination fight does not use round-win scoring
- **AND** the losing fighter's total score is at least half of the winning fighter's total score
- **THEN** the losing fighter receives `1` Qc point for that fight

#### Scenario: Total-score loser receives round-performance points
- **WHEN** a finished nomination fight does not use round-win scoring
- **AND** the losing fighter won or drew at least one persisted round
- **THEN** the losing fighter receives `1` Qc point for that fight

#### Scenario: Round-win loser uses only round-performance condition
- **WHEN** a finished nomination fight uses round-win scoring
- **AND** the losing fighter won or drew at least one persisted round
- **THEN** the losing fighter receives `1` Qc point for that fight

#### Scenario: Round-win loser does not use total-score close-loss condition
- **WHEN** a finished nomination fight uses round-win scoring
- **AND** the losing fighter did not win or draw any persisted round
- **THEN** the losing fighter receives no Qc loss point for that fight regardless of aggregate total-score difference

#### Scenario: Placement points are counted
- **WHEN** a finished nomination has saved final placements
- **THEN** the first-place fighter receives `6` Qn points
- **AND** the second-place fighter receives `4` Qn points
- **AND** the third-place fighter receives `2` Qn points

#### Scenario: No-show penalties are counted
- **WHEN** a nomination participant has an active no-show withdrawal in the nomination
- **THEN** the fighter receives `10` Qm penalty points for the no-show

#### Scenario: Yellow card penalties are counted
- **WHEN** a nomination participant has yellow cards attached to fights in the nomination
- **THEN** the fighter receives `10` Qm penalty points for each yellow card
- **AND** yellow cards closed or consumed by a red card are still counted

#### Scenario: Active red card penalties are counted
- **WHEN** a nomination participant has an active red card attached to a fight in the nomination
- **THEN** the fighter receives `30` Qm penalty points for that red card

#### Scenario: Inactive red card penalties are ignored
- **WHEN** a nomination participant has an inactive red card attached to a fight in the nomination
- **THEN** the fighter receives no Qm penalty points for that red card

### Requirement: Russia HMB rating calculation is persisted once per tournament nomination
The system SHALL persist Russia HMB rating results for all participants in a finished tournament nomination and SHALL keep those results separate from Elo rating data.

#### Scenario: Calculation saves all participant results
- **WHEN** an administrator or secretary calculates Russia HMB rating for a finished tournament nomination
- **THEN** the system saves one Russia HMB rating result for every participant in that nomination
- **AND** each result stores the selected coefficient and calculated rating points

#### Scenario: Calculation does not change Elo rating
- **WHEN** Russia HMB rating is calculated for a tournament nomination
- **THEN** the system does not modify Elo rating values, Elo fight counts, Elo history, or Elo calculation status

#### Scenario: Duplicate calculation is rejected
- **WHEN** Russia HMB rating already exists for a tournament nomination
- **AND** an administrator or secretary requests calculation again
- **THEN** the system rejects the duplicate calculation without overwriting saved Russia HMB rating results

#### Scenario: Direct calculation requires administrator or secretary
- **WHEN** a user who is not an administrator or secretary requests Russia HMB rating calculation directly
- **THEN** the system rejects the request

#### Scenario: Direct calculation requires finalized nomination
- **WHEN** a user requests Russia HMB rating calculation for an unfinished tournament nomination
- **THEN** the system rejects the request

### Requirement: Calculation modal shows saved Russia HMB rating results
The system SHALL replace calculation controls with a saved Russia HMB rating result list after calculation.

#### Scenario: Modal switches to result list after successful calculation
- **WHEN** Russia HMB rating calculation succeeds
- **THEN** the modal title becomes "Рейтинг ИСБ России"
- **AND** the modal shows nomination fighters ordered by rating points descending
- **AND** each row shows the row number, fighter identity, and rating points
- **AND** the bottom action becomes "Закрыть окно"

#### Scenario: Saved result action opens result list
- **WHEN** any user activates "Рейтинг ИСБ России" for a nomination with saved Russia HMB rating
- **THEN** the modal opens directly in the saved result-list state

### Requirement: Russia HMB yearly leaderboard is public
The system SHALL provide a public Russia HMB rating page with year and nomination filters.

#### Scenario: Menu exposes Russia HMB rating page
- **WHEN** any user views the main navigation
- **THEN** the system shows a "Рейтинг ИСБ" navigation action after "Рейтинг Эло"

#### Scenario: Leaderboard year selector lists calculated years
- **WHEN** a user opens the Russia HMB rating page
- **THEN** the year selector contains every year that has at least one tournament with saved Russia HMB rating
- **AND** it does not contain years without saved Russia HMB rating

#### Scenario: Leaderboard default year prefers current year
- **WHEN** the current calendar year has saved Russia HMB rating
- **THEN** the current year is selected by default

#### Scenario: Leaderboard default year falls back to maximum available year
- **WHEN** the current calendar year has no saved Russia HMB rating
- **AND** an earlier or later year has saved Russia HMB rating
- **THEN** the maximum available year is selected by default

#### Scenario: Nomination selector is filtered by year
- **WHEN** a year is selected on the Russia HMB rating page
- **THEN** the nomination selector contains only nominations with saved Russia HMB rating in that year

#### Scenario: Leaderboard shows yearly nomination totals
- **WHEN** a year and nomination are selected on the Russia HMB rating page
- **THEN** the table lists fighters in that nomination with summed Russia HMB rating points for that year
- **AND** the table is ordered by summed rating points descending
- **AND** the Elo "Бои" column is replaced by a "Турниры" column that counts tournaments contributing to the total

#### Scenario: Empty leaderboard state is shown
- **WHEN** there are no saved Russia HMB ratings
- **THEN** the Russia HMB rating page shows an empty state instead of year, nomination, or rating rows

### Requirement: Elo rating visibility is role-gated and renamed
The system SHALL identify the existing rating as Elo rating and restrict it to authenticated users with at least one role.

#### Scenario: Elo rating navigation is visible only to role-bearing users
- **WHEN** an unauthenticated user or authenticated user without assigned roles views the main navigation
- **THEN** the system does not show the "Рейтинг Эло" navigation action

#### Scenario: Elo rating navigation is visible to role-bearing users
- **WHEN** an authenticated user with at least one assigned role views the main navigation
- **THEN** the system shows the existing Elo rating navigation action as "Рейтинг Эло"

#### Scenario: Elo rating page requires role-bearing user
- **WHEN** an unauthenticated user or authenticated user without assigned roles opens the Elo rating page directly
- **THEN** the system denies access

#### Scenario: Elo rating page title is renamed
- **WHEN** an authenticated user with at least one assigned role opens the existing Elo rating page
- **THEN** the page title identifies the page as "Рейтинг Эло"

### Requirement: Fighter profile includes Russia HMB rating data
The system SHALL show Russia HMB rating data on fighter profiles without requiring authentication.

#### Scenario: Completed tournaments show per-nomination Russia HMB rating
- **WHEN** a user views a fighter profile with completed tournament nominations
- **THEN** the completed tournaments section includes a "Рейтинг ИСБ" column for each nomination entry
- **AND** each nomination entry shows the saved Russia HMB rating points or a dash when rating has not been calculated

#### Scenario: Fighter profile shows Russia HMB rating section when data exists
- **WHEN** a fighter has at least one saved Russia HMB rating result
- **THEN** the fighter profile shows a "Рейтинг ИСБ" section after the fights/wins section

#### Scenario: Fighter profile hides Russia HMB rating section when data is absent
- **WHEN** a fighter has no saved Russia HMB rating results
- **THEN** the fighter profile does not show the Russia HMB rating section

#### Scenario: Fighter profile Russia HMB years follow available rating years
- **WHEN** the fighter profile shows the Russia HMB rating section
- **THEN** the year selector contains every year where the fighter has saved Russia HMB rating
- **AND** the default year uses the current year when available, otherwise the maximum available year

#### Scenario: Fighter profile Russia HMB section shows yearly nomination totals
- **WHEN** a year is selected in the fighter profile Russia HMB rating section
- **THEN** the section lists nominations where the fighter has saved Russia HMB rating in that year
- **AND** each nomination row shows the summed Russia HMB rating points for that year

### Requirement: Fighter Elo rating block is role-gated and renamed
The system SHALL identify the existing fighter profile rating block as Elo rating and restrict it to authenticated users with at least one role.

#### Scenario: Fighter Elo rating block is hidden from users without roles
- **WHEN** an unauthenticated user or authenticated user without assigned roles views a fighter profile
- **THEN** the existing Elo rating block is hidden

#### Scenario: Fighter Elo rating block is visible to role-bearing users
- **WHEN** an authenticated user with at least one assigned role views a fighter profile
- **THEN** the existing Elo rating block is visible as "Рейтинги Эло"
