# Proposal

## Why

On the Loans page the group and drone names cannot be opened, although the Drones, Student groups and History pages open their details dialogs. The "Home" navigation entry repeats what the app name in the header already does. The card border highlight is too strong in the dark theme. The app changes state abruptly in a few places: dialogs pop in, the Home figures appear all at once, lists jump in, and loading lists show a bare line of text.

## What Changes

- Group and drone names on the Loans page open the group and drone details dialogs. Active loan rows gain `droneId` and `studentGroupId`.
- The "Home" navigation entry is removed. The app name in the header stays the way to the Home page; on the Home page no navigation entry is marked.
- Motion, all within 300 ms per element and shown at once when the system asks for reduced motion:
  - Dialogs fade in and scale up slightly, the backdrop blurs, and buttons shrink slightly while pressed.
  - The Home figures count up from 0, the ring chart draws itself and the weekly bars grow.
  - Table rows fade in one after another when a list loads.
  - Loading lists show shimmering placeholder rows; screen readers still hear the loading text.
- Styling without spec change: the card border highlight is softer in the dark theme.

## Capabilities

### Modified Capabilities

- `loan`: names on the Loans page open the details (REQ-007).
- `dashboard`: no "Home" navigation entry (REQ-002).
- `ui-theme`: motion for dialogs, Home figures, list rows and loading placeholders.

## Impact

- Backend: `ActiveLoanRow` gains `StudentGroupId` and `DroneId`.
- Frontend: Loans page, header navigation, dialogs, Home page, list pages, `styles.css`.
