## MODIFIED Requirements

### Requirement: Show active loans
Per REQ-007 the system SHALL list all active loans with group, drone, batteries, propellers and loan date. The accessory columns SHALL show the quantity of that type and 0 when the loan has no item of that type. The loan date SHALL be displayed as `dd.MM.yyyy`. Returned loans SHALL NOT be listed. Each row SHALL carry the loan `Id`, group and drone as names and their `Id`s. On the Loans page group and drone names SHALL open their details dialogs.

#### Scenario: Active loan list matches the reference example
- **GIVEN** "TELLO-02" is loaned to "Group 1" with 3 batteries and 4 propellers on 19.08.2026
- **AND** "TELLO-07" is loaned to "Group 3" with 4 batteries and 8 propellers on 19.08.2026
- **WHEN** the active loan list is requested
- **THEN** it contains the row "Group 1 | TELLO-02 | 3 | 4 | 19.08.2026"
- **AND** it contains the row "Group 3 | TELLO-07 | 4 | 8 | 19.08.2026"

#### Scenario: Returned loans are not active
- **GIVEN** a loan for "TELLO-07" was returned
- **WHEN** the active loan list is requested
- **THEN** that loan is not listed

#### Scenario: Loan without accessories
- **GIVEN** "TELLO-07" is loaned to "Group 3" without accessories
- **WHEN** the active loan list is requested
- **THEN** the row shows 0 batteries and 0 propellers

#### Scenario: No active loans
- **GIVEN** no active loan exists
- **WHEN** the active loan list is requested
- **THEN** an empty list is returned

#### Scenario: Open details from the Loans page
- **GIVEN** the Loans page lists the active loan of "TELLO-02" by "Group 1"
- **WHEN** the user clicks "Group 1", closes the dialog and clicks "TELLO-02"
- **THEN** the dialog of "Group 1" opens first
- **AND** then the dialog of "TELLO-02"
