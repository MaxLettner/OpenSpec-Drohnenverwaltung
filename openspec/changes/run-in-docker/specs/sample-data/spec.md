# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Fill an empty development database`
- TO: `### Requirement: Fill an empty database`

## MODIFIED Requirements

### Requirement: Fill an empty database
Per REQ-001 to REQ-010 the system SHALL, when it starts with sample data enabled and the database holds no drone, no student group and no loan, add one fixed set of sample data: drones, student groups, active loans and returned loans. Sample data SHALL be enabled by default in Development and disabled by default in every other environment, and the configuration SHALL be able to switch it on or off in any environment. The set SHALL follow every loan rule, so that the derived availability, the active loans list and the history show it like any other data.

#### Scenario: Empty development database
- **GIVEN** the system starts in Development with an empty database
- **WHEN** the drone list is requested
- **THEN** it lists the sample drones, some "Available" and some "Loaned"
- **AND** the active loans list and the history show the sample loans

#### Scenario: Sample data switched on in Production
- **GIVEN** the system starts in Production with sample data switched on and an empty database
- **WHEN** the drone list is requested
- **THEN** it lists the sample drones, some "Available" and some "Loaned"

#### Scenario: Sample data follows the loan rules
- **GIVEN** the sample data has been added
- **WHEN** its loans are checked
- **THEN** no drone has more than one active loan
- **AND** every returned loan has a return date on or after its loan date
- **AND** every accessory quantity is a whole number of 0 or more

### Requirement: Existing data and other environments stay untouched
The system SHALL NOT add sample data when the database already holds a drone, a student group or a loan, and SHALL NOT add it when sample data is disabled, which outside Development is the default.

#### Scenario: Database with own data
- **GIVEN** the development database holds the drone "TELLO-99" and nothing else
- **WHEN** the system starts
- **THEN** the drone list contains only "TELLO-99"

#### Scenario: Production
- **GIVEN** an empty database and no sample data setting
- **WHEN** the system starts in Production on it
- **THEN** the database still holds no drones, student groups or loans

#### Scenario: Sample data disabled
- **GIVEN** the system starts in Development with sample data disabled and an empty database
- **WHEN** the drone list is requested
- **THEN** it is empty
