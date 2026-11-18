# loan Specification

## Purpose
Lend drones with batteries and propellers to student groups, take them back, and keep a traceable record of active and past loans.

## Requirements

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

### Requirement: Offer a returned drone for a new loan
Per REQ-008 and REQ-005 the system SHALL offer a drone for a new loan on the Loans page as soon as its loan has been returned there, without reloading the page. The choices and quantities the user has already entered in the loan form SHALL stay unchanged. A return that is rejected SHALL NOT change the offered drones.

#### Scenario: Returned drone is offered again
- **GIVEN** "TELLO-07" is loaned to "Group 3" and the Loans page shows "No drones available."
- **WHEN** the loan of "TELLO-07" is returned on the Loans page
- **THEN** "TELLO-07" is offered as a drone for a new loan
- **AND** the page has not been reloaded

#### Scenario: Entered values are kept
- **GIVEN** the user has chosen the drone "TELLO-08" and the group "Group 1" and entered 2 batteries in the loan form
- **WHEN** the loan of "TELLO-07" is returned on the Loans page
- **THEN** "TELLO-08", "Group 1" and 2 batteries are still chosen and entered
- **AND** "TELLO-07" is offered in addition

#### Scenario: Rejected return changes nothing
- **GIVEN** "TELLO-07" is loaned to "Group 3" and the Loans page shows "No drones available."
- **WHEN** the return of that loan is rejected
- **THEN** "TELLO-07" is not offered
- **AND** the loan stays in the active loans list

#### Scenario: Returned drone can be loaned again at once
- **GIVEN** the loan of "TELLO-07" to "Group 3" has just been returned on the Loans page
- **WHEN** "TELLO-07" is chosen for "Group 1" and the loan is submitted
- **THEN** a new active loan for "TELLO-07" and "Group 1" is created

### Requirement: Choose from a short list of options
Per REQ-004 and REQ-005 the loan form SHALL show the drones that can be loaned and the student groups as lists of clickable options while a list has at most 6 options. Every option SHALL be visible without opening a menu, a drone option SHALL show the drone's name and description, and one option per list SHALL be chosen by clicking it or by keyboard. Only `Available` drones SHALL be offered.

#### Scenario: Drones are shown as options
- **GIVEN** the drones "TELLO-07" ("right propeller guard damaged") and "TELLO-08" are available and "TELLO-02" is loaned
- **WHEN** the Loans page is opened
- **THEN** the loan form shows "TELLO-07" with its description and "TELLO-08" as options without opening a menu
- **AND** "TELLO-02" is not offered

#### Scenario: Choose a drone and a group by clicking
- **GIVEN** the loan form offers the drones "TELLO-07" and "TELLO-08" and the groups "Group 1" and "Group 3"
- **WHEN** the user clicks "TELLO-07" and "Group 3"
- **THEN** "TELLO-07" and "Group 3" are marked as chosen
- **AND** submitting the form sends a loan request for "TELLO-07" and "Group 3"

#### Scenario: Choose by keyboard
- **GIVEN** the loan form offers the drones "TELLO-07" and "TELLO-08"
- **WHEN** the user moves the focus to the drone options and selects "TELLO-08" with the keyboard
- **THEN** "TELLO-08" is marked as chosen

### Requirement: Search a long list of options
Per REQ-004 the loan form SHALL show a search box instead of the list when a list has more than 6 options. Typing SHALL narrow the offered options to those whose name contains the typed text, ignoring case, without a new request to the backend. Choosing an offered option SHALL make it the chosen drone or group. When nothing matches, the form SHALL say so.

#### Scenario: Search box for more than 6 options
- **GIVEN** 7 drones are available
- **WHEN** the Loans page is opened
- **THEN** the loan form shows a search box for the drone instead of a list of options

#### Scenario: Typing narrows the options
- **GIVEN** the available drones include "TELLO-07", "TELLO-08" and "MAVIC-01" and there are more than 6 of them
- **WHEN** the user types "tello" into the drone search box
- **THEN** "TELLO-07" and "TELLO-08" are offered
- **AND** "MAVIC-01" is not offered
- **AND** no request is sent to the backend

#### Scenario: Choose a searched option
- **GIVEN** the drone search box offers "TELLO-07" after typing "07"
- **WHEN** the user chooses "TELLO-07" by click or by keyboard
- **THEN** "TELLO-07" is the chosen drone
- **AND** the search box shows "TELLO-07"

#### Scenario: Changing the search text clears the choice
- **GIVEN** "TELLO-07" was chosen in the drone search box
- **WHEN** the user changes the text in the box to "TELLO"
- **THEN** no drone is chosen until an offered option is chosen again
- **AND** the loan cannot be submitted meanwhile

#### Scenario: No matching option
- **GIVEN** more than 6 student groups exist and none contains "xyz"
- **WHEN** the user types "xyz" into the group search box
- **THEN** no group is offered
- **AND** the form says that no group matches

### Requirement: Choose a single option automatically
Per REQ-004 the loan form SHALL choose the only drone that can be loaned, and the only student group, when its list holds exactly one option and nothing is chosen yet. This SHALL also apply after the form was cleared following a successful loan. A choice the user has made SHALL NOT be replaced.

#### Scenario: Only one drone and one group
- **GIVEN** "TELLO-07" is the only available drone and "Group 3" is the only student group
- **WHEN** the Loans page is opened
- **THEN** "TELLO-07" and "Group 3" are already chosen
- **AND** the loan can be submitted without choosing anything

#### Scenario: Several options are not chosen automatically
- **GIVEN** the drones "TELLO-07" and "TELLO-08" are available
- **WHEN** the Loans page is opened
- **THEN** no drone is chosen

#### Scenario: Single option is chosen again after a loan
- **GIVEN** "Group 3" is the only student group and it is chosen in the loan form
- **WHEN** a loan is submitted successfully and the form is cleared
- **THEN** "Group 3" is chosen again

### Requirement: Open the loan form with a chosen drone
Per REQ-004 and REQ-005 the Loans page SHALL choose a drone in the loan form when it is opened with that drone's `Id` in its address and the drone is `Available`. When the drone is not available or does not exist, no drone SHALL be chosen and the rest of the form SHALL work as usual.

#### Scenario: Opened with an available drone
- **GIVEN** the drones "TELLO-07" and "TELLO-08" are available
- **WHEN** the Loans page is opened for "TELLO-08"
- **THEN** "TELLO-08" is chosen in the loan form

#### Scenario: Opened with a drone that is loaned
- **GIVEN** "TELLO-02" is loaned and "TELLO-07" and "TELLO-08" are available
- **WHEN** the Loans page is opened for "TELLO-02"
- **THEN** no drone is chosen
- **AND** "TELLO-07" and "TELLO-08" are offered

#### Scenario: Opened with an unknown drone
- **GIVEN** no drone with the `Id` 999 exists
- **WHEN** the Loans page is opened for the drone `Id` 999
- **THEN** no drone is chosen
- **AND** no error is shown

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
