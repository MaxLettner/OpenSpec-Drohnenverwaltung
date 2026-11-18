# dashboard Specification

## Purpose
Show on the Home page, at a glance, how the fleet is used: live figures computed from the current drones, student groups and loans, and a quick way to return a long running loan.

## Requirements

### Requirement: Home page as start page
The system SHALL show the Home page when the app is opened at its root address, and the navigation SHALL show a "Home" entry before "Drones". Unknown addresses SHALL lead to the Home page.

#### Scenario: Open the app
- **GIVEN** the app is not open
- **WHEN** the user opens its root address
- **THEN** the Home page is shown
- **AND** the "Home" entry is marked as active

### Requirement: Fleet figures
Per REQ-002 and REQ-007 the Home page SHALL show the number of drones, how many are `Available` and how many are `Loaned` as a ring chart with the counts as text, and the number of student groups, active loans and returned loans. The figures SHALL be computed by the backend from the current data.

#### Scenario: Figures match the data
- **GIVEN** 3 drones exist, "TELLO-02" has an active loan, 2 student groups exist and one loan is returned
- **WHEN** the Home page is shown
- **THEN** it shows 3 drones, 2 available and 1 loaned
- **AND** it shows 2 student groups, 1 active loan and 1 returned loan

#### Scenario: Empty database
- **GIVEN** no drone, student group or loan exists
- **WHEN** the Home page is shown
- **THEN** every figure is 0
- **AND** no error is shown

### Requirement: Accessories out now
Per REQ-006 and REQ-007 the Home page SHALL show the total batteries and the total propellers of all active loans. Returned loans SHALL NOT count.

#### Scenario: Only active loans count
- **GIVEN** an active loan with 3 batteries and 4 propellers, an active loan with 2 batteries, and a returned loan with 5 batteries
- **WHEN** the Home page is shown
- **THEN** it shows 5 batteries and 4 propellers out

### Requirement: Longest active loans
Per REQ-007 and REQ-008 the Home page SHALL list at most 5 active loans with group, drone, loan date and days out, the oldest loan date first. Days out SHALL be the days from the loan date to today. Each row SHALL offer a "Return" action that returns the loan and updates the figures without reloading the page.

#### Scenario: Oldest loans first
- **GIVEN** today is 15.03.2026 and 6 active loans exist with loan dates from 01.03.2026 to 06.03.2026
- **WHEN** the Home page is shown
- **THEN** 5 loans are listed, the first one from 01.03.2026 with 14 days out
- **AND** the loan from 06.03.2026 is not listed

#### Scenario: Return from the Home page
- **GIVEN** the Home page lists the active loan of "TELLO-02"
- **WHEN** the user uses its "Return" action
- **THEN** the loan is returned
- **AND** the figures show one active loan less and one returned loan more

### Requirement: Loans per week
Per REQ-010 the Home page SHALL show how many loans started in each of the last 8 weeks, Monday to Sunday, the current week last, as a bar chart with the counts as text. Active and returned loans SHALL both count.

#### Scenario: Loans counted by week
- **GIVEN** today is 15.03.2026, one loan started on 09.03.2026, one on 15.03.2026 and one on 02.03.2026
- **WHEN** the Home page is shown
- **THEN** the week starting 09.03.2026 shows 2 loans
- **AND** the week starting 02.03.2026 shows 1 loan
- **AND** 8 weeks are shown, the first starting 19.01.2026
