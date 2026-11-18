# drone Specification

## Purpose
Manage the lendable drones of the school and show which of them are currently available for a loan.

## Requirements

### Requirement: Create a drone
Per REQ-001 the system SHALL create a drone from a `Name` and an optional `Description` and assign it an `Id`. The `Name` SHALL be trimmed, not blank, at most 100 characters and unique among drones, ignoring case. The `Description` SHALL be trimmed, stored as empty when blank and at most 500 characters. The request SHALL NOT contain a status; availability follows from the drone's loans.

#### Scenario: Create a drone
- **GIVEN** no drone named "TELLO-07" exists
- **WHEN** a drone "TELLO-07" with the description "SSID: TELLO-9FA21B, right propeller guard damaged" is created
- **THEN** the drone "TELLO-07" exists with a generated `Id`
- **AND** its availability is "Available"
- **AND** the response contains the `Id`, the `Name` and the `Description` and a `Location` header for the new drone

#### Scenario: Description is optional
- **GIVEN** no drone named "TELLO-08" exists
- **WHEN** a drone "TELLO-08" is created without a description
- **THEN** the drone exists with an empty description

#### Scenario: Status is not an input
- **GIVEN** a drone creation request
- **WHEN** the request contains a status "Loaned"
- **THEN** the request is rejected with a validation error
- **AND** no drone is created

#### Scenario: Blank name is rejected
- **GIVEN** a drone creation request
- **WHEN** the name is empty or consists only of whitespace
- **THEN** the request is rejected with a validation error
- **AND** no drone is created

#### Scenario: Name and description are trimmed
- **GIVEN** no drone named "TELLO-09" exists
- **WHEN** a drone "  TELLO-09 " with the description "  spare unit " is created
- **THEN** the drone "TELLO-09" exists with the description "spare unit"

#### Scenario: Blank description is stored as empty
- **GIVEN** no drone named "TELLO-10" exists
- **WHEN** a drone "TELLO-10" with a description consisting only of whitespace is created
- **THEN** the drone exists with an empty description

#### Scenario: Too long name is rejected
- **GIVEN** a drone creation request
- **WHEN** the name is longer than 100 characters
- **THEN** the request is rejected with a validation error
- **AND** no drone is created

#### Scenario: Too long description is rejected
- **GIVEN** a drone creation request
- **WHEN** the description is longer than 500 characters
- **THEN** the request is rejected with a validation error
- **AND** no drone is created

#### Scenario: Duplicate name is rejected
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** another drone named "TELLO-07" is created
- **THEN** the request is rejected
- **AND** only one drone named "TELLO-07" exists

#### Scenario: Duplicate name is rejected ignoring case
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** another drone named "tello-07" is created
- **THEN** the request is rejected
- **AND** only one drone named "TELLO-07" exists

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

### Requirement: Start a loan from the drone list
Per REQ-002 and REQ-004 the Drones page SHALL show a "Loan" action in the row of every `Available` drone. The action SHALL open the Loans page with that drone chosen in the loan form. A `Loaned` drone SHALL NOT show the action.

#### Scenario: Loan action for an available drone
- **GIVEN** "TELLO-07" is available and "TELLO-02" is loaned
- **WHEN** the Drones page is shown
- **THEN** the row of "TELLO-07" shows a "Loan" action
- **AND** the row of "TELLO-02" shows no "Loan" action

#### Scenario: Loan action opens the loan form
- **GIVEN** "TELLO-07" and "TELLO-08" are available
- **WHEN** the user uses the "Loan" action of "TELLO-07" on the Drones page
- **THEN** the Loans page is shown
- **AND** "TELLO-07" is chosen in the loan form

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
