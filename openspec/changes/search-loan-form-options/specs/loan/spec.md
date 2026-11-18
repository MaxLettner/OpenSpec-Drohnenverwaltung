## REMOVED Requirements

### Requirement: Choose from a short list of options
**Reason**: The form now searches every list with 2 or more options, so a clickable list only remains for a single option.
**Migration**: See "Show a single option" and "Search the options".

### Requirement: Search a long list of options
**Reason**: Searching now starts at 2 options instead of more than 6.
**Migration**: See "Search the options".

## ADDED Requirements

### Requirement: Show a single option
Per REQ-004 and REQ-005 the loan form SHALL show the only drone that can be loaned, or the only student group, as a visible option with its name and, for a drone, its description, without a search box. Only `Available` drones SHALL be offered.

#### Scenario: The only drone is shown as an option
- **GIVEN** "TELLO-07" ("right propeller guard damaged") is the only available drone and "TELLO-02" is loaned
- **WHEN** the Loans page is opened
- **THEN** the loan form shows "TELLO-07" with its description as an option without a search box
- **AND** "TELLO-02" is not offered

### Requirement: Search the options
Per REQ-004 and REQ-005 the loan form SHALL show a search box for the drone and the student group whenever the list has 2 or more options; only `Available` drones SHALL be offered. Opening the box without text SHALL offer all options, and typing SHALL narrow them to names containing the text, ignoring case, without a backend request. Choosing an offered option by click or keyboard SHALL make it the chosen one. When nothing matches, the form SHALL say so.

#### Scenario: Search box for two or more options
- **GIVEN** "TELLO-07" and "TELLO-08" are available and "TELLO-02" is loaned
- **WHEN** the Loans page is opened and the user opens the drone search box
- **THEN** the loan form shows a search box for the drone instead of a list of options
- **AND** "TELLO-07" and "TELLO-08" are offered and "TELLO-02" is not

#### Scenario: Typing narrows the options
- **GIVEN** the available drones include "TELLO-07", "TELLO-08" and "MAVIC-01"
- **WHEN** the user types "tello" into the drone search box
- **THEN** "TELLO-07" and "TELLO-08" are offered
- **AND** "MAVIC-01" is not offered
- **AND** no request is sent to the backend

#### Scenario: Choose a searched option
- **GIVEN** the drone search box offers "TELLO-07" after typing "07"
- **WHEN** the user chooses "TELLO-07" by click or by keyboard
- **THEN** "TELLO-07" is the chosen drone
- **AND** the search box shows "TELLO-07"

#### Scenario: Choose a drone and a group by searching
- **GIVEN** the loan form offers the drones "TELLO-07" and "TELLO-08" and the groups "Group 1" and "Group 3"
- **WHEN** the user chooses "TELLO-07" and "Group 3" in the search boxes
- **THEN** submitting the form sends a loan request for "TELLO-07" and "Group 3"

#### Scenario: Changing the search text clears the choice
- **GIVEN** "TELLO-07" was chosen in the drone search box
- **WHEN** the user changes the text in the box to "TELLO"
- **THEN** no drone is chosen until an offered option is chosen again
- **AND** the loan cannot be submitted meanwhile

#### Scenario: No matching option
- **GIVEN** 2 or more student groups exist and none contains "xyz"
- **WHEN** the user types "xyz" into the group search box
- **THEN** no group is offered
- **AND** the form says that no group matches
