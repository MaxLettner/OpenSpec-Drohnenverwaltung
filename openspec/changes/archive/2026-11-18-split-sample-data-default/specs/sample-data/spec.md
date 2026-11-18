# Spec Delta

## MODIFIED Requirements

### Requirement: Fill an empty database
Per REQ-001 to REQ-010 the system SHALL, when it starts with sample data enabled and the database holds no drone, no student group and no loan, add one fixed set of sample data: drones, student groups, active loans and returned loans. The set SHALL follow every loan rule, so that the derived availability, the active loans list and the history show it like any other data.

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

## ADDED Requirements

### Requirement: Sample data default per environment
Per REQ-001 to REQ-010 sample data SHALL be enabled by default in Development and disabled by default in every other environment, and the configuration SHALL be able to switch it on or off in any environment.

#### Scenario: On by default in Development
- **GIVEN** the system starts in Development with an empty database and no sample data setting of its own
- **WHEN** the drone list is requested
- **THEN** it lists the sample drones
