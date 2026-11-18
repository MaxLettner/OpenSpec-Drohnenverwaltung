# Spec Delta

## ADDED Requirements

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
