## ADDED Requirements

### Requirement: Edit a student group
Per REQ-003 the system SHALL change the `Name` of an existing student group with the same rules as when it is created; the group keeps its `Id` and its loans. A retired group SHALL NOT be edited, and an unknown group SHALL be rejected. On the Student groups page each group SHALL offer an "Edit" action that opens a dialog with the current name.

#### Scenario: Rename a group
- **GIVEN** the group "Group 3" exists and has an active loan
- **WHEN** the user edits it to the name "Group 3a"
- **THEN** the group list shows "Group 3a"
- **AND** the active loan is listed with "Group 3a"

#### Scenario: Name taken by another group
- **GIVEN** the groups "Group 1" and "Group 3" exist
- **WHEN** "Group 3" is edited to the name "group 1"
- **THEN** the request is rejected as a conflict
- **AND** the dialog stays open and shows the error

#### Scenario: Edit an unknown or retired group
- **GIVEN** no group with the `Id` 999 exists and "Group 9" is retired
- **WHEN** group 999 or "Group 9" is edited
- **THEN** the edit of 999 is rejected as not found
- **AND** the edit of "Group 9" is rejected as a conflict

### Requirement: Retire a student group
Per REQ-003 and REQ-010 the system SHALL retire a student group by storing a `Retired` flag; the group and its loans SHALL NOT be deleted. A group with an active loan, an already retired group and an unknown group SHALL be rejected. On the Student groups page each group SHALL offer a "Retire" action that asks for confirmation first.

#### Scenario: Retire a group without active loans
- **GIVEN** "Group 9" has only returned loans
- **WHEN** the user retires "Group 9" and confirms
- **THEN** "Group 9" is no longer in the group list or the loan form
- **AND** the history still lists its returned loans with "Group 9"

#### Scenario: Group with an active loan cannot be retired
- **GIVEN** "Group 1" has an active loan
- **WHEN** "Group 1" is retired
- **THEN** the request is rejected as a conflict
- **AND** an error message is shown and "Group 1" stays in the list

### Requirement: Restore a retired student group
Per REQ-003 the backend SHALL restore a retired student group by clearing its `Retired` flag, after which it is listed and can borrow again. A group that is not retired, and an unknown group, SHALL be rejected. The frontend SHALL NOT offer this action.

#### Scenario: Restore a group
- **GIVEN** "Group 9" is retired
- **WHEN** "Group 9" is restored
- **THEN** the group list shows "Group 9"

#### Scenario: Restore a group that is not retired
- **GIVEN** "Group 1" is not retired
- **WHEN** "Group 1" is restored
- **THEN** the request is rejected as a conflict

### Requirement: Show student group details
Per REQ-003, REQ-007 and REQ-010 the Student groups page and the History SHALL open a dialog with the group's details from the backend when its name is clicked: name, whether it is retired, all its active loans with drone, loan date, days out, batteries, propellers and a "Return" action, oldest loan date first, and its last 5 returned loans, latest return first. The dialog SHALL close with Escape. An unknown group SHALL be rejected.

#### Scenario: Details of a group with loans
- **GIVEN** today is 15.03.2026, "Group 1" has "TELLO-02" since 10.03.2026 with 2 batteries and 4 propellers, and 6 returned loans
- **WHEN** the user clicks "Group 1" on the Student groups page
- **THEN** a dialog shows "Group 1", "TELLO-02", 10.03.2026, 5 days out, 2 batteries and 4 propellers with a "Return" action
- **AND** it lists the 5 latest returned loans, latest return first

#### Scenario: Return from the group dialog
- **GIVEN** the dialog of "Group 1" shows the active loan of "TELLO-02"
- **WHEN** the user uses its "Return" action
- **THEN** the loan is returned
- **AND** the dialog lists it under the returned loans

#### Scenario: Details of a retired group
- **GIVEN** "Group 9" is retired and has a returned loan
- **WHEN** the user clicks "Group 9" in the History
- **THEN** the dialog shows "Group 9" and "Retired"

#### Scenario: Unknown group
- **GIVEN** no group with the `Id` 999 exists
- **WHEN** the details of group 999 are requested
- **THEN** the request is rejected as not found

#### Scenario: Close the group dialog with Escape
- **GIVEN** the group dialog is open
- **WHEN** the user presses Escape
- **THEN** the dialog closes
- **AND** the focus is back on the group's name

## MODIFIED Requirements

### Requirement: Show student groups
Per REQ-003 the system SHALL list all student groups that are not retired with `Id` and `Name` so that a group can be selected for a loan.

#### Scenario: Groups are listable for loan selection
- **GIVEN** the student groups "Group 1" and "Group 3" exist
- **WHEN** the student group list is requested
- **THEN** both groups are returned

#### Scenario: No groups
- **GIVEN** no student group exists
- **WHEN** the student group list is requested
- **THEN** an empty list is returned

#### Scenario: Retired groups are not listed
- **GIVEN** "Group 9" is retired and "Group 1" is not
- **WHEN** the student group list is requested
- **THEN** only "Group 1" is returned
