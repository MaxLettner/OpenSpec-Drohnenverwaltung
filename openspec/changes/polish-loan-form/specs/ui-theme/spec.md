# Spec Delta

## MODIFIED Requirements

### Requirement: Catppuccin accents with neutral surfaces
The system SHALL use the Catppuccin flavor of the shown theme for its accent colors (primary actions, focus indication, links, active navigation, status badges and error messages) and a neutral shadcn-style palette for cards and text. The page background SHALL be the neutral background with a subtle gradient tinted by the accent colors of the shown flavor; it SHALL stay still while the page scrolls. The text of every control and message SHALL keep a contrast ratio of at least 4.5:1 against its background in both themes.

#### Scenario: Accents come from the active flavor
- **GIVEN** the Latte theme is shown
- **WHEN** the primary action button of a form is rendered
- **THEN** its background is the Latte accent color
- **AND** in the Macchiato theme it is the Macchiato accent color

#### Scenario: Readable text in both themes
- **GIVEN** a page with a button, an input, a table, a badge and an error message
- **WHEN** it is shown in the Latte and in the Macchiato theme
- **THEN** each text has a contrast ratio of at least 4.5:1 against its background

#### Scenario: Background gradient in both themes
- **GIVEN** any page is open
- **WHEN** it is shown in the Latte and in the Macchiato theme
- **THEN** the page background shows a gradient tinted with that flavor's accent colors
- **AND** cards keep their solid neutral surface

#### Scenario: Text on the page background stays readable
- **GIVEN** the page heading, an empty-state text and a loading text are shown directly on the page background
- **WHEN** the page is shown in the Latte and in the Macchiato theme
- **THEN** each of these texts has a contrast ratio of at least 4.5:1 against the lightest and the darkest point of the gradient behind it
