## MODIFIED Requirements

### Requirement: Home page as start page
The system SHALL show the Home page when the app is opened at its root address. The app name in the header SHALL lead to the Home page and mark itself as the current page there; the navigation SHALL have no separate "Home" entry. Unknown addresses SHALL lead to the Home page.

#### Scenario: Open the app
- **GIVEN** the app is not open
- **WHEN** the user opens its root address
- **THEN** the Home page is shown
- **AND** the app name is marked as the current page
- **AND** no navigation entry is marked as active
- **AND** the navigation shows "Drones", "Student groups", "Loans" and "History"

#### Scenario: Go home from the header
- **GIVEN** the Loans page is open
- **WHEN** the user clicks the app name "Drone Lending System" in the header
- **THEN** the Home page is shown
