# Spec Delta

## Purpose

Manage the lendable drones of the school and show which of them are currently available for a loan.

## ADDED Requirements

### Requirement: Create a drone
Per REQ-001 the system SHALL create a drone from a `Name` and an optional free-text `Description` and assign it an `Id`. The `Name` SHALL NOT be blank and SHALL be unique among drones, ignoring case. The request SHALL NOT contain a status; availability follows from the drone's loans.

#### Scenario: Create a drone
- **GIVEN** no drone named "TELLO-07" exists
- **WHEN** a drone "TELLO-07" with the description "SSID: TELLO-9FA21B, right propeller guard damaged" is created
- **THEN** the drone "TELLO-07" exists with a generated `Id`
- **AND** its availability is "Available"

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

#### Scenario: Duplicate name is rejected
- **GIVEN** the drone "TELLO-07" exists
- **WHEN** another drone named "TELLO-07" is created
- **THEN** the request is rejected
- **AND** only one drone named "TELLO-07" exists

### Requirement: Show drones
Per REQ-002 the system SHALL list all drones with `Name`, availability (`Available` or `Loaned`) and `Description`. Availability SHALL be derived from the drone's active loan: a drone is `Loaned` exactly when it has an active loan, otherwise `Available`. Availability SHALL NOT be stored as separate data.

#### Scenario: List drones with and without a loan
- **GIVEN** "TELLO-02" has an active loan
- **AND** "TELLO-07" has no active loan
- **WHEN** the drone list is requested
- **THEN** "TELLO-02" is listed as "Loaned"
- **AND** "TELLO-07" is listed as "Available"

#### Scenario: Drone is available again after return
- **GIVEN** "TELLO-07" was loaned and the loan has been returned
- **WHEN** the drone list is requested
- **THEN** "TELLO-07" is listed as "Available"

#### Scenario: Empty inventory
- **GIVEN** no drone exists
- **WHEN** the drone list is requested
- **THEN** an empty list is returned
