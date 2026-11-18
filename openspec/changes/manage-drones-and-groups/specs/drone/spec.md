## ADDED Requirements

### Requirement: Edit a drone
Per REQ-001 the system SHALL change the `Name` and `Description` of an existing drone with the same rules as when it is created; the drone keeps its `Id` and its loans. A retired drone SHALL NOT be edited, and an unknown drone SHALL be rejected. On the Drones page each drone SHALL offer an "Edit" action that opens a dialog with the current values.

#### Scenario: Rename a drone
- **GIVEN** the drone "TELLO-07" exists and has a returned loan
- **WHEN** the user edits it to the name "TELLO-07B" and the description "New propeller guard"
- **THEN** the drone list shows "TELLO-07B" with "New propeller guard"
- **AND** the history lists the returned loan with "TELLO-07B"

#### Scenario: Name taken by another drone
- **GIVEN** the drones "TELLO-07" and "TELLO-08" exist
- **WHEN** "TELLO-08" is edited to the name "tello-07"
- **THEN** the request is rejected as a conflict
- **AND** the dialog stays open and shows the error

#### Scenario: Invalid name
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** it is edited to a blank name
- **THEN** the request is rejected with a validation error
- **AND** the drone keeps the name "TELLO-07"

#### Scenario: Edit an unknown or retired drone
- **GIVEN** no drone with the `Id` 999 exists and "TELLO-05" is retired
- **WHEN** drone 999 or "TELLO-05" is edited
- **THEN** the edit of 999 is rejected as not found
- **AND** the edit of "TELLO-05" is rejected as a conflict

### Requirement: Retire a drone
Per REQ-001 and REQ-010 the system SHALL retire a drone by storing a `Retired` flag; the drone and its loans SHALL NOT be deleted. A drone with an active loan, an already retired drone and an unknown drone SHALL be rejected. On the Drones page each drone SHALL offer a "Retire" action that asks for confirmation first.

#### Scenario: Retire an available drone
- **GIVEN** "TELLO-05" is available and has a returned loan
- **WHEN** the user retires "TELLO-05" and confirms
- **THEN** "TELLO-05" is no longer in the drone list or the loan form
- **AND** the history still lists its returned loan with "TELLO-05"

#### Scenario: Loaned drone cannot be retired
- **GIVEN** "TELLO-02" has an active loan
- **WHEN** "TELLO-02" is retired
- **THEN** the request is rejected as a conflict
- **AND** an error message is shown and "TELLO-02" stays in the list

#### Scenario: Cancel the retirement
- **GIVEN** the user has chosen "Retire" for "TELLO-05"
- **WHEN** the user cancels the confirmation
- **THEN** "TELLO-05" is not retired

### Requirement: Restore a retired drone
Per REQ-001 the backend SHALL restore a retired drone by clearing its `Retired` flag, after which it is listed and can be loaned again. A drone that is not retired, and an unknown drone, SHALL be rejected. The frontend SHALL NOT offer this action.

#### Scenario: Restore a drone
- **GIVEN** "TELLO-05" is retired
- **WHEN** "TELLO-05" is restored
- **THEN** the drone list shows "TELLO-05" as "Available"

#### Scenario: Restore a drone that is not retired
- **GIVEN** "TELLO-07" is not retired
- **WHEN** "TELLO-07" is restored
- **THEN** the request is rejected as a conflict

## MODIFIED Requirements

### Requirement: Show drones
Per REQ-002 the system SHALL list all drones that are not retired with `Name`, availability (`Available` or `Loaned`) and `Description`. Availability SHALL be derived from the drone's active loan: a drone is `Loaned` exactly when it has an active loan, otherwise `Available`. Availability SHALL NOT be stored as separate data. Each drone SHALL carry the `Id` of its active loan, empty when it is `Available`.

#### Scenario: List drones with and without a loan
- **GIVEN** "TELLO-02" has an active loan
- **AND** "TELLO-07" has no active loan
- **WHEN** the drone list is requested
- **THEN** "TELLO-02" is listed as "Loaned" with the `Id` of its active loan
- **AND** "TELLO-07" is listed as "Available" without an active loan `Id`

#### Scenario: Drone is available again after return
- **GIVEN** "TELLO-07" was loaned and the loan has been returned
- **WHEN** the drone list is requested
- **THEN** "TELLO-07" is listed as "Available"

#### Scenario: Empty inventory
- **GIVEN** no drone exists
- **WHEN** the drone list is requested
- **THEN** an empty list is returned

#### Scenario: Retired drones are not listed
- **GIVEN** "TELLO-05" is retired and "TELLO-07" is not
- **WHEN** the drone list is requested
- **THEN** only "TELLO-07" is listed

### Requirement: Show drone details
Per REQ-002, REQ-007 and REQ-010 the Drones page and the History SHALL open a dialog with the drone's details from the backend when its name is clicked: name, description, availability, whether it is retired, the active loan or a "Loan" action, and the last 5 returned loans. The active loan SHALL show group, loan date, days out, batteries, propellers and a "Return" action. A retired drone SHALL show "Retired" and no "Loan" action. The dialog SHALL close with Escape. An unknown drone SHALL be rejected.

#### Scenario: Details of a loaned drone
- **GIVEN** today is 15.03.2026 and "TELLO-02" is loaned to "Group 1" since 10.03.2026 with 2 batteries and 4 propellers
- **WHEN** the user clicks "TELLO-02" on the Drones page
- **THEN** a dialog shows "TELLO-02", "Loaned", "Group 1", 10.03.2026, 5 days out, 2 batteries and 4 propellers
- **AND** it offers a "Return" action

#### Scenario: Details of an available drone
- **GIVEN** "TELLO-07" is available and has 6 returned loans
- **WHEN** the user clicks "TELLO-07" on the Drones page
- **THEN** the dialog shows "Available" and a "Loan" action
- **AND** it lists the 5 latest returned loans, latest return first

#### Scenario: Details of a retired drone
- **GIVEN** "TELLO-05" is retired and has a returned loan
- **WHEN** the user clicks "TELLO-05" in the History
- **THEN** the dialog shows "TELLO-05" and "Retired"
- **AND** it offers no "Loan" action

#### Scenario: Return from the dialog
- **GIVEN** the dialog of the loaned drone "TELLO-02" is open
- **WHEN** the user uses its "Return" action
- **THEN** the loan is returned
- **AND** the dialog and the drone list show "TELLO-02" as "Available"

#### Scenario: Unknown drone
- **GIVEN** no drone with the `Id` 999 exists
- **WHEN** the details of drone 999 are requested
- **THEN** the request is rejected as not found

#### Scenario: Close with Escape
- **GIVEN** the details dialog is open
- **WHEN** the user presses Escape
- **THEN** the dialog closes
- **AND** the focus is back on the drone's name
