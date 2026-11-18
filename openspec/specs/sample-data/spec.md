# sample-data Specification

## Purpose
Gives every developer the same realistic drones, student groups and loans in a fresh development database, so that demos and manual checks start from known data.

## Requirements

### Requirement: Fill an empty development database
Per REQ-001 to REQ-010 the system SHALL, when it starts in Development with sample data enabled and the database holds no drone, no student group and no loan, add one fixed set of sample data: drones, student groups, active loans and returned loans. The set SHALL follow every loan rule, so that the derived availability, the active loans list and the history show it like any other data.

#### Scenario: Empty development database
- **GIVEN** the system starts in Development with an empty database
- **WHEN** the drone list is requested
- **THEN** it lists the sample drones, some "Available" and some "Loaned"
- **AND** the active loans list and the history show the sample loans

#### Scenario: Sample data follows the loan rules
- **GIVEN** the sample data has been added
- **WHEN** its loans are checked
- **THEN** no drone has more than one active loan
- **AND** every returned loan has a return date on or after its loan date
- **AND** every accessory quantity is a whole number of 0 or more

### Requirement: Sample data is always the same
The system SHALL add exactly the same drones, student groups and loans, with the same names, quantities and dates, every time the sample data is written.

#### Scenario: Two fresh databases
- **GIVEN** two empty development databases
- **WHEN** the system starts once on each
- **THEN** both hold the same drones, student groups and loans

### Requirement: Existing data and other environments stay untouched
The system SHALL NOT add sample data when the database already holds a drone, a student group or a loan, and SHALL NOT add it outside Development or when sample data is disabled.

#### Scenario: Database with own data
- **GIVEN** the development database holds the drone "TELLO-99" and nothing else
- **WHEN** the system starts
- **THEN** the drone list contains only "TELLO-99"

#### Scenario: Production
- **GIVEN** an empty database
- **WHEN** the system starts in Production on it
- **THEN** the database still holds no drones, student groups or loans

#### Scenario: Sample data disabled
- **GIVEN** the system starts in Development with sample data disabled and an empty database
- **WHEN** the drone list is requested
- **THEN** it is empty
