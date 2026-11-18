## MODIFIED Requirements

### Requirement: Home page as start page
The system SHALL show the Home page when the app is opened at its root address, and the navigation SHALL show a "Home" entry before "Drones". Unknown addresses and the app name in the header SHALL lead to the Home page.

#### Scenario: Open the app
- **GIVEN** the app is not open
- **WHEN** the user opens its root address
- **THEN** the Home page is shown
- **AND** the "Home" entry is marked as active

#### Scenario: Go home from the header
- **GIVEN** the Loans page is open
- **WHEN** the user clicks the app name "Drone Lending System" in the header
- **THEN** the Home page is shown

### Requirement: Fleet figures
Per REQ-002 and REQ-007 the Home page SHALL show the number of drones, how many are `Available` and how many are `Loaned` as a ring chart with the counts as text, and the number of student groups, active loans and returned loans. The figures SHALL be computed by the backend from the current data. Retired drones and groups SHALL NOT count.

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

#### Scenario: Retired drones and groups do not count
- **GIVEN** 3 drones and 2 student groups exist, and one drone and one group of them are retired
- **WHEN** the Home page is shown
- **THEN** it shows 2 drones and 1 student group
