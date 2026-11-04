# student-group Specification

## Purpose
Manage the student groups that borrow drones, so that every loan can name the responsible group.

## Requirements

### Requirement: Create a student group
Per REQ-003 the system SHALL create a student group from a `Name` and assign it an `Id`. The `Name` SHALL be stored without leading and trailing whitespace, SHALL NOT be blank, SHALL NOT be longer than 100 characters and SHALL be unique among student groups, ignoring case. Further attributes such as class, members or a responsible student are not part of this capability.

#### Scenario: Create a student group
- **GIVEN** no student group named "Group 3" exists
- **WHEN** the student group "Group 3" is created
- **THEN** the student group "Group 3" exists with a generated `Id`
- **AND** the response contains the `Id` and the `Name` and a `Location` header for the new group

#### Scenario: Blank name is rejected
- **GIVEN** a student group creation request
- **WHEN** the name is empty or consists only of whitespace
- **THEN** the request is rejected with a validation error
- **AND** no student group is created

#### Scenario: Name is trimmed
- **GIVEN** no student group named "Group 3" exists
- **WHEN** the student group "  Group 3 " is created
- **THEN** the student group "Group 3" exists

#### Scenario: Too long name is rejected
- **GIVEN** a student group creation request
- **WHEN** the name is longer than 100 characters
- **THEN** the request is rejected with a validation error
- **AND** no student group is created

#### Scenario: Duplicate name is rejected
- **GIVEN** the student group "Group 3" exists
- **WHEN** another student group named "Group 3" is created
- **THEN** the request is rejected
- **AND** only one student group named "Group 3" exists

### Requirement: Show student groups
Per REQ-003 the system SHALL list all student groups with `Id` and `Name` so that a group can be selected for a loan.

#### Scenario: Groups are listable for loan selection
- **GIVEN** the student groups "Group 1" and "Group 3" exist
- **WHEN** the student group list is requested
- **THEN** both groups are returned

#### Scenario: No groups
- **GIVEN** no student group exists
- **WHEN** the student group list is requested
- **THEN** an empty list is returned
