# Spec Delta

## Purpose

Lend drones with batteries and propellers to student groups, take them back, and keep a traceable record of active and past loans.

## ADDED Requirements

### Requirement: Loan a drone
Per REQ-004 the system SHALL loan an available drone to an existing student group by creating a `Loan` with status `Active`, the drone, the group and a `LoanDate`. The `LoanDate` SHALL be the current date in UTC and SHALL NOT be supplied by the caller. A loan SHALL be rejected when the drone or the student group does not exist. The response SHALL contain the `Id`, the drone and group `Id`s, the status, the `LoanDate`, the `ReturnDate` (empty while active) and the accessory items.

#### Scenario: Loan an available drone
- **GIVEN** the drone "TELLO-07" is available
- **AND** the student group "Group 3" exists
- **WHEN** "TELLO-07" is loaned to "Group 3"
- **THEN** an active loan is created
- **AND** the loan records "Group 3", "TELLO-07" and the loan date
- **AND** the loan has no return date

#### Scenario: Loan to an unknown group
- **GIVEN** the drone "TELLO-07" is available
- **AND** no student group "Group 9" exists
- **WHEN** "TELLO-07" is loaned to "Group 9"
- **THEN** the loan is rejected
- **AND** no loan is created

#### Scenario: Loan of an unknown drone
- **GIVEN** the student group "Group 3" exists
- **AND** no drone with the requested `Id` exists
- **WHEN** that drone is loaned to "Group 3"
- **THEN** the loan is rejected
- **AND** no loan is created

### Requirement: One active loan per drone
Per REQ-005 the system SHALL ensure a drone has at most one active loan. A loan attempt for a drone that already has an active loan SHALL be rejected and SHALL NOT change any existing loan. This SHALL also hold for simultaneous attempts.

#### Scenario: Reject a second loan
- **GIVEN** "TELLO-07" already has an active loan
- **WHEN** another group tries to loan "TELLO-07"
- **THEN** the loan is rejected
- **AND** exactly one active loan for "TELLO-07" exists

#### Scenario: Reject an unavailable drone
- **GIVEN** "TELLO-07" is listed as "Loaned"
- **WHEN** "TELLO-07" is loaned again
- **THEN** the loan is rejected

#### Scenario: Simultaneous loan attempts
- **GIVEN** "TELLO-07" is available
- **WHEN** two groups try to loan "TELLO-07" at the same time
- **THEN** exactly one loan succeeds
- **AND** the other attempt is rejected
- **AND** exactly one active loan for "TELLO-07" exists

### Requirement: Loan accessories
Per REQ-006 the system SHALL store the accessories of a loan as `LoanItem`s of type `Battery` or `Propeller`, each with a whole-number quantity of 0 or more. A type SHALL appear at most once per loan. The system SHALL reject negative or non-integer quantities, unknown types and a repeated type, and in that case SHALL NOT create the loan. Accessories are optional.

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

### Requirement: Return a loan
Per REQ-008 the system SHALL set the status of an active loan to `Returned`, which makes the drone available again. A loan that is already returned SHALL NOT be returned again, and an unknown loan SHALL be rejected. Returning SHALL NOT change the loan's drone, group, `LoanDate` or accessories.

#### Scenario: Return a loan
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the loan is marked as returned
- **AND** "TELLO-07" becomes available again

#### Scenario: Return twice is rejected
- **GIVEN** a loan for "TELLO-07" is already returned
- **WHEN** the same loan is returned again
- **THEN** the request is rejected
- **AND** the loan stays returned with its original return date

#### Scenario: Return of an unknown loan
- **GIVEN** no loan with the requested `Id` exists
- **WHEN** that loan is returned
- **THEN** the request is rejected

#### Scenario: Simultaneous returns
- **GIVEN** a loan for "TELLO-07" is active
- **WHEN** the same loan is returned twice at the same time
- **THEN** exactly one return succeeds
- **AND** the other is rejected
- **AND** the loan keeps the return date of the successful return

#### Scenario: Drone can be loaned again after return
- **GIVEN** the loan of "TELLO-07" to "Group 3" has been returned
- **WHEN** "TELLO-07" is loaned to "Group 1"
- **THEN** a new active loan is created
- **AND** the returned loan is unchanged

### Requirement: Store the return date
Per REQ-009 the system SHALL set the `ReturnDate` of a loan to the current date in UTC when the loan is returned. An active loan SHALL have no `ReturnDate`. The `ReturnDate` SHALL NOT be before the `LoanDate` and SHALL be kept unchanged afterwards.

#### Scenario: ReturnDate is set on return
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the loan is returned
- **THEN** the loan has a return date
- **AND** the return date is not before the loan date

#### Scenario: Active loan has no return date
- **GIVEN** "TELLO-07" has an active loan
- **WHEN** the loan is requested
- **THEN** the loan has no return date

### Requirement: Show active loans
Per REQ-007 the system SHALL list all active loans with group, drone, batteries, propellers and loan date. The accessory columns SHALL show the quantity of that type and 0 when the loan has no item of that type. The loan date SHALL be displayed as `dd.MM.yyyy`. Returned loans SHALL NOT be listed. Each row SHALL carry the loan `Id`, and group and drone as names.

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

### Requirement: Show loan history
Per REQ-010 the system SHALL list returned loans as a history with group, drone, batteries, propellers, loan date and return date, both displayed as `dd.MM.yyyy`. Active loans SHALL NOT be part of the history. Each row SHALL carry the loan `Id`, and group and drone as names.

#### Scenario: Returned loan stays in history
- **GIVEN** "TELLO-07" was loaned to "Group 3" and returned
- **WHEN** the loan history is requested
- **THEN** the loan is listed with its loan date and return date
- **AND** the loan is listed with its group, drone and accessory quantities

#### Scenario: Active loans are not in the history
- **GIVEN** "TELLO-07" has an active loan
- **WHEN** the loan history is requested
- **THEN** that loan is not listed

### Requirement: Retain returned loans
Per REQ-010 the system SHALL keep every loan permanently, including its accessories. No operation of the system SHALL delete a loan. A returned loan SHALL keep its group, drone, dates and accessories.

#### Scenario: Return does not delete the loan
- **GIVEN** a loan for "TELLO-07" is active with 4 batteries and 8 propellers
- **WHEN** the loan is returned
- **THEN** the same loan still exists with status "Returned"
- **AND** its accessory quantities are still 4 batteries and 8 propellers

#### Scenario: No way to delete a loan
- **GIVEN** a returned loan exists
- **WHEN** a client attempts to delete the loan
- **THEN** the request is rejected as unsupported
- **AND** the loan still exists
