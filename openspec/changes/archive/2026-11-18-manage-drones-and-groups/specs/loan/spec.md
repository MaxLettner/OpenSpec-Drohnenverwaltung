## ADDED Requirements

### Requirement: Retired drones and groups cannot be loaned
Per REQ-004 the system SHALL reject a loan for a retired drone or a retired student group as a conflict and SHALL NOT create the loan.

#### Scenario: Loan a retired drone
- **GIVEN** "TELLO-05" is retired and "Group 3" exists
- **WHEN** "TELLO-05" is loaned to "Group 3"
- **THEN** the request is rejected as a conflict
- **AND** no loan is created

#### Scenario: Loan to a retired group
- **GIVEN** "TELLO-07" is available and "Group 9" is retired
- **WHEN** "TELLO-07" is loaned to "Group 9"
- **THEN** the request is rejected as a conflict
- **AND** no loan is created

## MODIFIED Requirements

### Requirement: Loan accessories
Per REQ-006 the system SHALL store the accessories of a loan as `LoanItem`s of type `Battery` or `Propeller`, each with a whole-number quantity of 0 or more, at most 10 batteries and at most 20 propellers per loan. A type SHALL appear at most once per loan. The system SHALL reject negative, non-integer or too large quantities, unknown types and a repeated type, and in that case SHALL NOT create the loan. Accessories are optional.

#### Scenario: Record accessories with the loan
- **GIVEN** the drone "TELLO-07" is available
- **AND** the student group "Group 3" exists
- **WHEN** "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers
- **THEN** the loan has a battery item with quantity 4
- **AND** the loan has a propeller item with quantity 8

#### Scenario: Negative quantity is rejected
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with -1 batteries
- **THEN** the request is rejected with a validation error
- **AND** no loan is created

#### Scenario: Zero quantity is allowed
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with 0 batteries
- **THEN** the loan is created with a battery quantity of 0

#### Scenario: Fractional quantity is rejected
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with 1.5 batteries
- **THEN** the request is rejected with a validation error
- **AND** no loan is created

#### Scenario: Unknown accessory type is rejected
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with 2 chargers
- **THEN** the request is rejected with a validation error
- **AND** no loan is created

#### Scenario: Repeated accessory type is rejected
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with a battery item of 2 and another battery item of 3
- **THEN** the request is rejected with a validation error
- **AND** no loan is created

#### Scenario: Loan without accessories
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned without any accessories
- **THEN** the loan is created
- **AND** the loan has no accessory items

#### Scenario: Quantity above the limit is rejected
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with 11 batteries or with 21 propellers
- **THEN** the request is rejected with a validation error
- **AND** no loan is created

#### Scenario: Quantities at the limit are allowed
- **GIVEN** the drone "TELLO-07" is available
- **WHEN** "TELLO-07" is loaned with 10 batteries and 20 propellers
- **THEN** the loan is created with these quantities

#### Scenario: The loan form shows the limit
- **GIVEN** the loan form is open
- **WHEN** the user enters 11 batteries
- **THEN** the form shows "At most 10 batteries"
- **AND** the loan is not submitted

### Requirement: Show loan history
Per REQ-010 the system SHALL list returned loans as a history with group, drone, batteries, propellers, loan date and return date, both displayed as `dd.MM.yyyy`. Active loans SHALL NOT be part of the history. Each row SHALL carry the loan `Id`, group and drone as names and their `Id`s. Retired drones and groups SHALL stay in the history. On the History page group and drone names SHALL open their details dialogs.

#### Scenario: Returned loan stays in history
- **GIVEN** "TELLO-07" was loaned to "Group 3" and returned
- **WHEN** the loan history is requested
- **THEN** the loan is listed with its loan date and return date
- **AND** the loan is listed with its group, drone and accessory quantities

#### Scenario: Active loans are not in the history
- **GIVEN** "TELLO-07" has an active loan
- **WHEN** the loan history is requested
- **THEN** that loan is not listed

#### Scenario: Open details from the history
- **GIVEN** the history lists a returned loan of "TELLO-07" by "Group 3"
- **WHEN** the user clicks "Group 3", closes the dialog and clicks "TELLO-07"
- **THEN** the dialog of "Group 3" opens first
- **AND** then the dialog of "TELLO-07"
