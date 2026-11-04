# Spec Delta

## ADDED Requirements

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
