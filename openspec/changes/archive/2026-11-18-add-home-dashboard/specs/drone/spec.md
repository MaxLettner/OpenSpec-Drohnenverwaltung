# Spec Delta

## MODIFIED Requirements

### Requirement: Show drones
Per REQ-002 the system SHALL list all drones with `Name`, availability (`Available` or `Loaned`) and `Description`. Availability SHALL be derived from the drone's active loan: a drone is `Loaned` exactly when it has an active loan, otherwise `Available`. Availability SHALL NOT be stored as separate data. Each drone SHALL carry the `Id` of its active loan, empty when it is `Available`.

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

## ADDED Requirements

### Requirement: Return a loan from the drone list
Per REQ-008 the Drones page SHALL show a "Return" action in the row of every `Loaned` drone. The action SHALL return the drone's active loan, after which the row SHALL show the drone as `Available` with a "Loan" action, without reloading the page. A rejected return SHALL leave the row unchanged.

#### Scenario: Return action for a loaned drone
- **GIVEN** "TELLO-02" is loaned and "TELLO-07" is available
- **WHEN** the Drones page is shown
- **THEN** the row of "TELLO-02" shows a "Return" action
- **AND** the row of "TELLO-07" shows no "Return" action

#### Scenario: Return from the drone list
- **GIVEN** "TELLO-02" is loaned to "Group 1"
- **WHEN** the user uses the "Return" action of "TELLO-02" on the Drones page
- **THEN** the loan is returned
- **AND** "TELLO-02" is shown as "Available" with a "Loan" action

#### Scenario: Rejected return
- **GIVEN** "TELLO-02" is shown as loaned
- **WHEN** its return is rejected
- **THEN** "TELLO-02" is still shown as "Loaned"

### Requirement: Show drone details
Per REQ-002, REQ-007 and REQ-010 the Drones page SHALL open a dialog with the drone's details from the backend when its name is clicked: name, description, availability, the active loan or a "Loan" action, and the last 5 returned loans. The active loan SHALL show group, loan date, days out, batteries, propellers and a "Return" action. The dialog SHALL close with Escape. An unknown drone SHALL be rejected.

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
