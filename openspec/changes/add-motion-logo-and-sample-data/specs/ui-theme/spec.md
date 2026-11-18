# Spec Delta

## ADDED Requirements

### Requirement: Animate page changes
The system SHALL animate a change of page: the marked navigation entry SHALL move over to the entry of the new page, and the content of the new page SHALL fade in, each within 300 ms. When the system setting asks for reduced motion, or the browser cannot animate the change, the new page SHALL be shown at once. The animation SHALL NOT delay or change what the page loads or shows.

#### Scenario: Switch to another page
- **GIVEN** the Drones page is open
- **WHEN** the user opens the Loans page from the navigation
- **THEN** the marking moves from "Drones" to "Loans" within 300 ms
- **AND** the Loans page content fades in within 300 ms

#### Scenario: Reduced motion
- **GIVEN** the system setting asks for reduced motion
- **WHEN** the user opens another page
- **THEN** the new page and its marked navigation entry are shown at once without movement

### Requirement: Fade between themes
The system SHALL fade the whole page from the old to the new theme within 300 ms when the user chooses a theme or the followed system setting changes, and the marking of the theme switch SHALL move to the chosen button at the same time. When the system setting asks for reduced motion, or the browser cannot fade, the theme SHALL change at once. The first page load SHALL still show the right theme without any fade or flash.

#### Scenario: Choose the dark theme
- **GIVEN** the Latte theme is shown
- **WHEN** the user chooses the dark theme
- **THEN** the page fades to the Macchiato theme within 300 ms
- **AND** the marking of the theme switch moves from the light to the dark button at the same time

#### Scenario: Reduced motion
- **GIVEN** the system setting asks for reduced motion
- **WHEN** the user chooses the dark theme
- **THEN** the Macchiato theme is shown at once

#### Scenario: Page load
- **GIVEN** the stored choice is the dark theme
- **WHEN** a page is opened
- **THEN** the Macchiato theme is shown from the first frame without a fade

### Requirement: Show the logo
The system SHALL show a logo that combines a quadcopter and a lock before the name "Drone Lending System" in the header, in the accent color of the shown theme, and the same logo as the browser tab icon. The browser tab title SHALL be "Drone Lending System". The logo SHALL stay recognizable at 16 px, and it SHALL be hidden from assistive technology because the name next to it already says what it is.

#### Scenario: Header logo
- **GIVEN** any page is open
- **WHEN** the header is shown
- **THEN** the logo is shown before the name "Drone Lending System" in the accent color
- **AND** a screen reader announces the name only once

#### Scenario: Browser tab
- **GIVEN** the app is opened in a browser
- **WHEN** the tab is shown
- **THEN** its title is "Drone Lending System"
- **AND** its icon is the logo
