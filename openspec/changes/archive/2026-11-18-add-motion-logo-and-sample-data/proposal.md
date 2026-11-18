# Proposal

## Why

The app switches pages and themes abruptly: the content and the nav highlight jump, and light/dark flips in one frame. It has no logo; the header shows a plain dot and the browser tab says "DroneInventoryUi" with the Angular default icon. A fresh development database is empty, so every demo and every manual check starts with typing drones, groups and loans by hand, and everyone sees different data.

## What Changes

- Switching pages moves the nav highlight over to the new entry and fades the new content in (about 200 ms).
- Switching the theme crossfades the page from one theme to the other (about 250 ms).
- Both animations are left out when the system asks for reduced motion, and in browsers without the needed support the change is instant as today.
- A logo that combines a quadcopter and a lock replaces the dot in the header, and an SVG version becomes the favicon. The tab title becomes "Drone Lending System".
- In Development, an empty database is filled at startup with one fixed set of sample drones, student groups, active loans and returned loans. A database that already holds data is not touched. Other environments never get sample data.

## Capabilities

### New Capabilities

- `sample-data`: the fixed sample data set and when it is written.

### Modified Capabilities

- `ui-theme`: adds the requirements "Animate page changes", "Fade between themes" and "Show the logo". No existing requirement text changes.

## Impact

- **Frontend** (`frontend/drone-inventory-ui`): `app.config.ts` (router view transitions), `app.html` (nav highlight, logo), `styles.css` (transition styles), `ThemeService`, a logo component, `index.html` (title, favicon), `public/` (favicon SVG); their specs.
- **Backend** (`backend/DroneInventory.Api`): a sample data writer in `Infrastructure`, its call in `Program.cs`, `appsettings.Development.json`; the test factory switches seeding off. No API or schema change.
- **Specs:** `ui-theme` gains three requirements; `sample-data` is created after archive.

## Out of Scope

- Animations of other elements (rows, toasts, form fields, the loan pickers).
- A choice of theme animation by the user, or a "system" theme option.
- Sample data in tests, in production, or as part of a migration; a way to reset or reseed an existing database.
- Any change of the loan rules (REQ-001 to REQ-010), the REST API or the database schema.
- Login/roles, reservations, damage management, reports/exports, edit/delete, search/filter/sort of lists.
