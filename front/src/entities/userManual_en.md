# User Guide

HMBTR is a tournament management system designed to manage fighters, judges, tournaments, nominations, fight results, disciplinary cards, prize placements, Elo ratings, and Russia HMB ratings.

## 1. Logging Into the System

Only secretaries and tournament organizers need to register in the system. Registration is not required for viewing information.

To log in, open **Organizer Login**. The login panel contains two tabs:

- **Login**: enter your username and password.
- **Registration**: enter your username, password, last name, first name, patronymic (optional), and email (optional).

## 2. Roles and Access Rights

Access rights (roles) are assigned manually by administrators after registration in the system.

Users with the “Organizer” role can:

- create fighters,
- create tournaments,
- register fighters for tournaments,
- close fighter registration,
- create competition brackets,
- generate fights,
- enter and save fight results,
- issue and edit disciplinary cards,
- download tournament PDF reports after all nominations are completed.

Users with the “Secretary” role can:

- create and edit marshals,
- register marshals/judges for tournaments while marshal registration is open.

Administrators have access to all protected pages and actions, including:

- the users page,
- fighter editing,
- card deletion (where deletion is still allowed),
- all organizer and secretary workflows.

If a page is opened without the required permissions, the application will display a 403 page.

## 3. Searching and Adding Items

Search fields are displayed on list pages (“Fighters”, “Marshals”, and “Tournaments”). A new item can only be added after entering text into the search field to prevent duplicates.

## 4. Fighters

A fighter profile can be opened by clicking on the fighter card in the list.

Authorized organizers and administrators can add a fighter:

1. First, search for the fighter to avoid duplicates.
2. If the fighter is not found, use **Add Fighter**.

If you started adding a fighter from the tournament registration menu, the application will return to that tournament after saving.

### Fighter Profile

The fighter profile displays:

- fighter photo and personal data,
- tournaments in which the fighter participated,
- total number of fights and victories,
- fights and victories by nomination,
- HMB rating by completed tournaments and nominations,
- Elo rating summary by nomination,
- Elo rating history chart,
- Russia HMB rating summary by year,
- disciplinary cards (if any).

Administrators can edit fighter data from the fighter profile.

Fighter statistics are based on completed tournament nominations.

## 5. Marshals

Searching, adding, and viewing marshal information works the same way as for fighters.

Only administrators and secretaries can add marshals to the system.

### Marshal Profile

The marshal profile displays:

- marshal photo and personal data,
- tournaments where the marshal worked.

Each tournament where judging took place contains a link to that tournament’s page. Administrators and secretaries can edit marshal data from the marshal profile.

## 6. Tournaments

Each tournament card contains:

- tournament name,
- country and city,
- event date,
- selected nominations,
- completion status (when all nominations are completed).

Tournaments can be created by organizers and system administrators.

## 7. Tournament Page

The tournament page is the main working screen. It displays the tournament name, location, date, tournament judges, disciplinary cards, nomination tabs, registered fighters, competition brackets, fights, tie resolution, and prize winners.

Each nomination has its own tab.

### Marshal Registration

Users with permission to manage tournament marshals can use the **Add Judges** button while registration for at least one fighter nomination is still open and marshal registration has not yet been completed.

Marshals are assigned to the entire tournament, not to individual nominations. After marshal registration is completed, the interface does not provide a mechanism to reopen it.

### Fighter Registration

Organizers and administrators can register fighters while registration is open.

A fighter already registered for the tournament is excluded from the selection list.

While registration is open and the competition has not yet started, authorized users can remove fighters. When at least three fighters are registered in a nomination, authorized users can close registration.

### Creating Competition Brackets

After registration is closed, authorized users can create the first competition bracket.

Available options depend on the number of fighters:

- **Create Groups** creates a group stage bracket.
- **Olympic Bracket** creates a single-elimination bracket if the number of participants is 4, 8, or 16.

When creating groups, fighters are automatically distributed among them. The system attempts to reduce repeated matchups between fighters from the same city or club. Before fights are generated, users can drag and drop fighters between groups. A fighter can be dragged into an empty area, in which case a new single-member group will be created.

Each group must contain at least three fighters in order to generate group fights.

After fight generation, the group composition becomes locked.

### Group Stage

In the group stage bracket:

1. Check the group distribution.
2. Adjust groups if necessary by dragging fighters.
3. Use **Generate Fights**.
4. Enter the result of each fight.
5. Use **Save Results**.

Fight results must determine a winner. A 0:0 score means that the result has not yet been entered. If the base rounds do not determine a winner, the system adds extra rounds until the first round where one fighter scores more points. The number of extra rounds is not limited.

The group table displays victories and point difference after fight results are entered. Placements are determined by the following criteria:

1. number of victories,
2. point difference,
3. manual tie resolution order when both values are equal (if necessary).

After all group fights are completed, the system may offer:

- **Next Subgroups** for another group stage with advancing fighters,
- **Olympic Bracket** when 4, 8, or 16 fighters advance from groups,
- **Olympic Bracket with Best 3rd Places** if enough third-place fighters are available to form a 4, 8, or 16 fighter bracket,
- **Complete Nomination** when a single group determines the final top three winners.

### Tie Resolution

When fighters have the same number of victories and the same point difference, and it is necessary to determine who advances, the **Resolve Tie** panel appears.

Use the **Up** and **Down** buttons to define the final fighter placements within the group.

Tie resolution can be applied within a group or among third-place candidates when forming an Olympic bracket with the best third places.

### Olympic Bracket

Olympic brackets support 4, 8, or 16 fighters.

Before the results of any fight in the bracket are saved, authorized users can drag fighters with the mouse to adjust matchups. After the first result in the bracket is saved, bracket cell positions become locked.

The application automatically creates fights for the next bracket stages after saving the results of the current stage.

A nomination is completed automatically after both the final and the bronze medal fight are finished. After that, the page displays the top three winners.

## 8. Fight Results, Warnings, and Disciplinary Cards

Authorized users can enter scores for unfinished fights. Scores are saved only after pressing the **Save Results** button for the corresponding competition bracket or round.

Each fight starts with the base rounds configured for the nomination. If the base rounds end without a winner, the fight card adds extra rounds. Extra rounds continue until the next extra round determines a winner. This rule applies both to total-score fights and to nominations with win by rounds enabled.

The **Show round times** toggle displays a **Time:** field for each conducted round. The exact duration can be entered separately for every base and extra round. If the duration is not changed manually, the defaults from the nomination settings are used: main round time for base rounds and extra round time for extra rounds.

Right-clicking a fighter name in an unfinished fight opens a context menu. From this menu, users can issue a disciplinary card, issue a warning, or record a fighter withdrawal when the action is available for the current fight state.

### Fight Warnings

A warning is part of the result of one specific fight. It is not a disciplinary card, does not appear on the fighter profile as a sanction, and does not carry over to other fights.

To issue a warning, use **Issue warning** in the fighter context menu. The dialog requires selecting a round and entering a reason.

Each warning adds **+3** points to the fighter's opponent in the selected round. A warning icon is displayed next to the fighter name; hovering over it shows the reason and, for multi-round fights, the round number.

Three warnings for the same fighter cause a technical defeat. Warnings are saved together with fight results and are used in the final score, group standings, bracket progression, and reports. If result fixation is canceled, saved warnings become editable draft data again.

### Disciplinary Cards

To issue a disciplinary card, use **Issue a card** in the fighter context menu. The issue dialog allows selecting:

- a yellow card,
- a red card,
- a judge,
- a reason.

The issue date is tied to the tournament date (if available).

Disciplinary card tables are displayed on tournament and fighter pages. They show the card type, fighter or tournament, judge, nomination, fight, reason, active status, and expiration date.

Inactive cards are hidden by default. If a fighter or tournament has inactive cards, the table shows a **Show inactive** toggle.

Users with card-management access can edit the available card fields. For manual cards, the reason and judge can be changed; in fighter card tables, the expiration date can also be changed. Card type and active status can be changed only while they are not locked by fixed results. Deletion is available only while the related stage can still be rolled back and the nomination has not been completed.

Expiration rules and principles for disciplinary cards:

- Yellow cards expire at the end of the calendar year.
- A red card expires after 90 days, or after 120 days if the fighter had active yellow cards at the moment of issue.
- A red card is issued automatically when a fighter receives a second yellow card during the same tournament.
- A red card can also be created automatically when a fighter has three active yellow cards across tournaments. This card is inactive at first and can be activated from the fighter card table by a user with card-management access.
- Yellow cards consumed by an automatic red card remain in history but become inactive.
- When a fighter receives a red card, they are removed from other tournament nominations where registration has not yet been closed.
- A fighter with a red card automatically receives a technical defeat in all subsequent fights.
- Technical defeats caused by red cards are not included in Elo rating calculations and do not award fight points to the losing fighter in the Russia HMB rating.

## 9. PDF Reports

When all tournament nominations are completed, organizers and administrators will see PDF download buttons.

The first report request triggers report generation, which may take some time.

## 10. Elo Rating

The **Elo rating** menu item and the **Elo ratings** section on the fighter profile are available only to authenticated users who have at least one assigned role. Elo rating is separate from the Russia HMB rating.

Fighter ratings are grouped by nominations. Select a nomination from the dropdown list to view the rating table for that nomination.

Ranks are ordered by the following criteria:

1. rating (highest to lowest),
2. number of fights (highest to lowest),
3. last name,
4. first name,
5. fighter ID.

The rating nomination selector displays only nominations that contain rating data.

### When Ratings Are Updated

Ratings are calculated when a tournament nomination is completed.

For a nomination consisting of a single group, rating calculation starts after pressing the nomination completion button. For nominations with an Olympic bracket, rating calculation is triggered immediately after both the final and bronze medal fights are completed.

Ratings are tied to specific nominations. A fighter may have one rating in one nomination and a completely different rating in another.

### How the Elo System Works in This Application

All fighters start with a base rating of **1000** in each nomination.

The application uses the Elo formula with a **K-factor of 32**. Standard Elo formulas are used for rating calculation (see Wikipedia).

Features of the Elo rating system:

- defeating a much stronger opponent grants a larger rating increase,
- losing to a much stronger opponent removes fewer points,
- defeating a much weaker opponent grants a smaller increase,
- losing to a much weaker opponent removes more points.

The application rounds rating values after each fight and processes fights strictly in chronological order.

Only completed fights with a winner determined during the match are included. Fights ending in technical defeat due to a red card are skipped in rating calculations, although the fighters remain participants in the nomination.

The number of fights displayed in the rating table represents the number of fights included in rating calculations, not all scheduled fights or fights ended by technical defeat.

### Fighter Elo Rating History

The fighter profile contains an **Elo ratings** section with summary information for specific nominations.

The rating chart starts at the initial value of 1000 and shows rating changes after nomination completion at tournaments. Each history point is linked to a specific tournament.

## 11. Russia HMB Rating

Russia HMB rating is a separate rating. It is not connected to Elo rating and does not use Elo data.

After a nomination result is fixed, the **Calculate Russia HMB rating** button appears below the top-three winners. It is available to administrators and secretaries. Clicking it opens a modal window with the **Tournament coefficient** field. The coefficient can be **1**, **2**, or **4**; **1** is selected by default. Use **Calculate** to run the calculation.

After calculation, the result is saved to the database. The modal shows the **Russia HMB rating** title, the **Nomination coefficient - K** line, and the nomination fighters sorted by rating points in descending order. After the result is saved, the nomination page button changes to **Russia HMB rating** and becomes visible to all users.

Rating formula:

`(Qc + Qn) * K - Qm`

- **Qc** is fight points. A winner receives 2 points. A losing fighter receives 1 point only for a non-technical loss when the point difference is no more than 50%, or when the fighter won or drew at least one round. For round-win nominations, only the round condition is used.
- Technical defeats caused by a red card, three warnings, or a fighter withdrawal do not award fight points to the losing fighter.
- **Qn** is placement points: 6 for first place, 4 for second place, and 2 for third place.
- **K** is the tournament coefficient selected during calculation.
- **Qm** is penalties: 10 for an unexcused no-show, 10 for each yellow card including yellow cards consumed by a red card, and 30 for an active red card.
- If a withdrawal has **Valid reason** selected, the Russia HMB no-show penalty is not applied.

The **Russia HMB ratings** page opens from the **HMB rating** menu item and is available to all users. The page has year and nomination selectors. The year selector contains only years that have tournaments with calculated HMB ratings. The nomination selector contains only nominations with rating data for the selected year.

By default, the current year is selected if it has calculated ratings. If the current year has no ratings, the latest available year is selected. The table shows rank, fighter, location, tournament count, and the fighter's total rating in the selected nomination and year.

On the fighter profile, the **Completed tournaments** section contains an **HMB rating** column. It shows HMB rating points for each nomination; if the rating has not been calculated yet, a dash is displayed. After the **Fights / Wins** section, a public **HMB rating** section appears when the fighter has calculated ratings. It allows selecting a year and viewing total points by nomination for that year.

## 12. Recommended Tournament Workflow

1. Create or verify fighters.
2. Create or verify marshals/judges.
3. Create a tournament with the required nominations.
4. Open the tournament page.
5. Add tournament judges if necessary.
6. Register fighters in open nominations.
7. Close fighter registration for the nomination.
8. Create groups or an Olympic bracket.
9. Generate fights if a group stage is used.
10. Enter and save fight results.
11. Resolve ties if the tie panel appears.
12. Create the next stage or complete the nomination.
13. Repeat the process for all nominations.
