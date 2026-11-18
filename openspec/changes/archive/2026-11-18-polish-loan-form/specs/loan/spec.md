# Spec Delta

## ADDED Requirements

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
