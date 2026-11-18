# Proposal

## Why

The app opens on the Drones page, so nobody sees at a glance how many drones are out, which loans have been running for a long time or how busy the last weeks were. A drone row only shows name, availability and description: to see who has a loaned drone, or to return it, the user has to switch to the Loans page and find the row again (REQ-007, REQ-008). The pages also differ when a list is empty: Drones and History show a bare line of text, Student groups and Loans an empty card. The page background gradient is so faint that it is hard to see.

## What Changes

- A new Home page at `/` with its own "Home" entry first in the navigation. It shows live figures that the backend computes from the current data: fleet availability (available and loaned drones as a ring chart, plus totals of drones, student groups, active and returned loans), the batteries and propellers out in active loans, the 5 longest running active loans with their days out and a "Return" action, and the loans started per week over the last 8 weeks as a bar chart.
- New endpoint `GET /api/dashboard` that returns these figures.
- The drone list (`GET /api/drones`) carries the derived `activeLoanId` of a loaned drone. A `Loaned` drone gets a "Return" action on the Drones page that returns its active loan through the existing `POST /api/loans/{id}/return`.
- Clicking a drone name on the Drones page opens a dialog with the drone's details: name, description, availability, the active loan (group, loan date, days out, batteries, propellers) with a "Return" action, or a "Loan" action when it is available, and its last 5 returned loans. New endpoint `GET /api/drones/{id}`.
- The out-of-scope rule "no reports, statistics or exports" in `requirements.md`, `AGENTS.md` and `openspec/config.yaml` is narrowed: the Home page may show live figures computed from the current data. Exports, printable reports and stored statistics stay out of scope.
- Styling fixes without spec change, under the existing ui-theme requirements: every list page shows its empty and loading text inside the list card, the page gradient becomes clearly visible while text keeps 4.5:1, and cards get a border highlight that follows the pointer.

## Capabilities

### New Capabilities

- `dashboard`: the Home page and its figures (REQ-002, REQ-007, REQ-008, REQ-010).

### Modified Capabilities

- `drone`: modifies "Show drones" (adds `activeLoanId`), adds "Return a loan from the drone list" and "Show drone details" (REQ-002, REQ-007, REQ-008, REQ-010).

## Impact

- **Backend**: `DroneQueries`, `DroneEndpoints`, a new dashboard query and endpoint, their tests. No database change; all figures are derived.
- **Frontend**: new Home page and route, `DronesPage`, a drone details dialog, `LoanHistoryPage`, `StudentGroupsPage`, `styles.css`, the Spartan card, their specs.
- **Documentation**: the out-of-scope wording in `requirements.md`, `AGENTS.md` and `openspec/config.yaml`.

## Out of Scope

- Exports, printable reports, stored or historical statistics beyond what the loans already hold.
- Charts or figures on any page other than Home.
- Search, filtering or sorting of lists; edit or delete of drones, groups or loans.
- A confirmation step before a return; returning stays a single click as on the Loans page.
- Login/roles, reservations, damage management.
