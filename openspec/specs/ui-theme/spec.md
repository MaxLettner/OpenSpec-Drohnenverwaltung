# ui-theme Specification

## Purpose
Defines how the Drone Lending System looks and which color theme it uses: a consistent component style across all pages with Catppuccin Latte accents in the light theme and Catppuccin Macchiato accents in the dark theme. It changes no behavior of the Drone, StudentGroup and Loan requirements.

## Requirements

### Requirement: Theme follows the system setting
The system SHALL show the Catppuccin Latte theme when the operating system prefers a light color scheme and the Catppuccin Macchiato theme when it prefers a dark color scheme, as long as the user has not chosen a theme manually. When the system setting changes, the shown theme SHALL change with it.

#### Scenario: Light system setting
- **GIVEN** the user has not chosen a theme and the system prefers light
- **WHEN** any page is opened
- **THEN** the Latte theme is shown

#### Scenario: Dark system setting
- **GIVEN** the user has not chosen a theme and the system prefers dark
- **WHEN** any page is opened
- **THEN** the Macchiato theme is shown

#### Scenario: System setting changes while the app is open
- **GIVEN** the user has not chosen a theme and the Latte theme is shown
- **WHEN** the system changes to dark
- **THEN** the Macchiato theme is shown without reloading the page

### Requirement: Choose the theme manually
The system SHALL offer a theme switch in the header on every page with the choices light and dark. A chosen theme SHALL override the system setting, SHALL be kept when the page is reloaded, and SHALL be applied to all pages. When the stored choice is unreadable or invalid, the system setting SHALL be used.

#### Scenario: Switch to dark on a light system
- **GIVEN** the system prefers light and the Latte theme is shown
- **WHEN** the user chooses the dark theme
- **THEN** the Macchiato theme is shown on the current page and on every other page

#### Scenario: Choice survives a reload
- **GIVEN** the user has chosen the dark theme on a system that prefers light
- **WHEN** the page is reloaded
- **THEN** the Macchiato theme is shown

#### Scenario: Chosen theme beats the system setting
- **GIVEN** the user has chosen the light theme and the system changes to dark
- **WHEN** the system setting changes
- **THEN** the Latte theme stays shown

#### Scenario: Invalid stored choice
- **GIVEN** the stored theme choice is neither light nor dark
- **WHEN** a page is opened
- **THEN** the theme of the system setting is shown

### Requirement: Catppuccin accents with neutral surfaces
The system SHALL use the Catppuccin flavor of the shown theme for its accent colors (primary actions, focus indication, links, active navigation, status badges and error messages) and a neutral shadcn-style palette for page background, cards and text. The text of every control and message SHALL keep a contrast ratio of at least 4.5:1 against its background in both themes.

#### Scenario: Accents come from the active flavor
- **GIVEN** the Latte theme is shown
- **WHEN** the primary action button of a form is rendered
- **THEN** its background is the Latte accent color
- **AND** in the Macchiato theme it is the Macchiato accent color

#### Scenario: Readable text in both themes
- **GIVEN** a page with a button, an input, a table, a badge and an error message
- **WHEN** it is shown in the Latte and in the Macchiato theme
- **THEN** each text has a contrast ratio of at least 4.5:1 against its background

### Requirement: Consistent restyled pages
The system SHALL show the header with navigation, the Drones page, the Student groups page, the Loans page and the History page with the same shared styles for headings, cards, forms, buttons, tables, empty states and loading states. The active navigation entry SHALL be visibly marked, and the layout SHALL stay usable at a viewport width of 360 px without horizontal scrolling of the page.

#### Scenario: Navigation marks the current page
- **GIVEN** the Loans page is open
- **WHEN** the header is shown
- **THEN** the "Loans" entry is visibly marked as active
- **AND** the other entries are not

#### Scenario: Same look on every page
- **GIVEN** the four pages are opened one after another
- **WHEN** their forms, buttons and tables are compared
- **THEN** all use the same style for the same kind of element

#### Scenario: Narrow viewport
- **GIVEN** a viewport width of 360 px
- **WHEN** any page with a table is shown
- **THEN** the page itself does not scroll horizontally
- **AND** all columns of a table remain reachable

### Requirement: Availability is readable without color
Per REQ-002 the system SHALL show the `Availability` of a Drone as a badge that contains the text "Available" or "Loaned" and has a different accent color for each value. The meaning of the badge SHALL NOT depend on color alone.

#### Scenario: Available and loaned badges
- **GIVEN** the drone "TELLO-07" is loaned and "TELLO-08" is not
- **WHEN** the Drones page is shown
- **THEN** the row of "TELLO-07" shows a badge with the text "Loaned"
- **AND** the row of "TELLO-08" shows a badge with the text "Available"
- **AND** the two badges differ in color

### Requirement: Errors stay visible and dismissible
Per the error handling of REQ-001 to REQ-008 the system SHALL show the message of a rejected request as a notification in the error color of the shown theme. The notification SHALL be announced to assistive technology, SHALL not hide the content of the page, and SHALL be dismissible by the user.

#### Scenario: Backend error is shown
- **GIVEN** a drone named "TELLO-07" already exists
- **WHEN** a drone "tello-07" is created
- **THEN** the rejection message is shown in a notification in the error color
- **AND** the notification is announced as an alert

#### Scenario: Dismiss a notification
- **GIVEN** an error notification is shown
- **WHEN** the user dismisses it
- **THEN** the notification disappears
- **AND** the page content is unchanged

### Requirement: Restyling keeps behavior unchanged
The system SHALL keep the behavior of REQ-001 to REQ-010 unchanged by the restyling: the same inputs, buttons, columns, texts, validation and disabled states exist, and the same backend requests are sent as before.

#### Scenario: Loan flow still works
- **GIVEN** an available drone "TELLO-07" and a student group "Group 3"
- **WHEN** the user chooses both, enters 2 batteries and 4 propellers and submits the loan form
- **THEN** one loan request with these values is sent
- **AND** the active loans list shows "Group 3", "TELLO-07", 2, 4 and the loan date

#### Scenario: Form validation is unchanged
- **GIVEN** the Drones page is open
- **WHEN** the name field is empty or only whitespace
- **THEN** the "Create drone" button is disabled

#### Scenario: Return flow still works
- **GIVEN** "TELLO-07" is loaned to "Group 3"
- **WHEN** the user returns the loan from the active loans list
- **THEN** the row disappears from the active loans list
- **AND** the loan appears on the History page
