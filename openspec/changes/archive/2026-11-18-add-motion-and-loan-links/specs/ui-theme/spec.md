## ADDED Requirements

### Requirement: Subtle motion
The system SHALL ease changes in with short motion: dialogs fade and scale in, buttons give press feedback, table rows fade in one after another when a list loads, and the Home figures count up while the ring chart and the weekly bars grow. Each element SHALL finish within 300 ms, except the Home figures, which SHALL finish within 600 ms. When the system setting asks for reduced motion, the final state SHALL be shown at once. Motion SHALL NOT change the values or texts that are shown at the end.

#### Scenario: Home figures count up
- **GIVEN** 3 drones exist
- **WHEN** the Home page loads
- **THEN** the drone figure counts up and shows 3 at the end
- **AND** its accessible label says 3 from the start

#### Scenario: Reduced motion
- **GIVEN** the system setting asks for reduced motion
- **WHEN** a dialog opens, a list loads or the Home page loads
- **THEN** everything is shown in its final state at once

### Requirement: Loading placeholders
While a list on the Drones, Student groups, Loans or History page or the Home page loads, the system SHALL show shimmering placeholder rows in place of the content, and SHALL give assistive technology the loading text, such as "Loading drones...". Under reduced motion the placeholders SHALL NOT shimmer.

#### Scenario: Loading the drone list
- **GIVEN** the drone list has not arrived yet
- **WHEN** the Drones page is shown
- **THEN** placeholder rows are shown in the list card
- **AND** a screen reader announces "Loading drones..."
