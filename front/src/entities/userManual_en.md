# User Guide

HMBTR is a tournament management system designed to manage fighters, judges, tournaments, nominations, fight results, disciplinary cards, prize placements, and fighter rankings based on the Elo rating system.

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
- nomination rating summary,
- rating history chart,
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

Fight results must determine a winner. A 0:0 score means that the result has not yet been entered. Equal non-zero scores are blocked by the system because draws are not allowed.

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

## 8. Fight Results and Disciplinary Cards

Authorized users can enter scores for unfinished fights. Scores are saved only after pressing the **Save Results** button for the corresponding competition bracket or round.

To issue a disciplinary card, right-click on the fighter’s name in an unfinished fight. The issue dialog allows selecting:

- a yellow card,
- a red card,
- a reason.

The issue date is tied to the tournament date (if available).

Disciplinary card tables are displayed on tournament and fighter pages. They show the card type, fighter or tournament, nomination, fight, reason, and expiration date.

Authorized organizers and administrators can edit the reason for issued cards. In fighter card tables, the card expiration date can also be edited. Administrators can delete cards only while the related stage is still active and the nomination has not yet been completed.

Expiration rules and principles for disciplinary cards:

- Yellow cards expire at the end of the calendar year.
- A red card expires after 90 days, or after 120 days if the fighter had active yellow cards at the moment of issue.
- A red card is issued automatically when a fighter receives a second yellow card during the same tournament.
- When a fighter receives a red card, they are removed from other tournament nominations where registration has not yet been closed.
- A fighter with a red card automatically receives a technical defeat in all subsequent fights.
- Technical defeats caused by red cards are not included in Elo rating calculations.

## 9. PDF Reports

When all tournament nominations are completed, organizers and administrators will see PDF download buttons.

The first report request triggers report generation, which may take some time.

## 10. Rating and Elo Principles

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

### Fighter Rating History

The fighter profile contains a **Ratings** section with summary information for specific nominations.

The rating chart starts at the initial value of 1000 and shows rating changes after nomination completion at tournaments. Each history point is linked to a specific tournament.

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
