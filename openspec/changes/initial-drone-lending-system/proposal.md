# Proposal

## Why

Drones and accessories are lent to student groups today with a paper note on the cabinet door. The note answers neither "which drones are available now?" nor "who had drone X last week?", and it gets lost. This change introduces the first working version of a Drone Lending System that replaces the note with a durable, traceable record. It is also the baseline that every later change request builds on.

## What Changes

- Create and list **Drones** (REQ-001, REQ-002). Availability (`Available` | `Loaned`) is shown but never entered; it is derived from the drone's active loan.
- Create and list **StudentGroups** (REQ-003).
- Loan a drone, with `Battery` and `Propeller` quantities, to a student group (REQ-004, REQ-006). A drone has at most one active `Loan` (REQ-005).
- Return a loan: it becomes `Returned`, the `ReturnDate` is stored and the drone is available again (REQ-008, REQ-009).
- Show active loans with Group, Drone, Batteries, Propellers and Loan Date (REQ-007).
- Show the loan history; returned loans are kept permanently (REQ-010).
- Provide a REST API (ASP.NET Core, EF Core, SQLite) that owns all rules, and an Angular UI that only calls that API.

### Out of scope

Not part of this change and not to be implemented on the side:

- Login, user accounts, roles
- Item-level inventory of batteries (BAT-001 …)
- Advance reservations
- Damage management, return discrepancies
- Reports, statistics, exports
- Edit or delete of drones, student groups or loans
- Search, filtering, sorting

These arrive later as separate change requests.

## Capabilities

### New Capabilities

- `drone`: creating drones and listing them with their derived availability (REQ-001, REQ-002).
- `student-group`: creating and listing student groups that can borrow drones (REQ-003).
- `loan`: lending a drone with accessory quantities, enforcing one active loan per drone, returning loans, and showing active loans and the loan history (REQ-004 – REQ-010).

### Modified Capabilities

None. `openspec/specs/` is empty; this is the initial system.

## Impact

- **Backend** (`backend/DroneInventory.Api`): new domain model (`Drone`, `StudentGroup`, `Loan`, `LoanItem`), EF Core context and SQLite database, REST endpoints for drones, student groups and loans, loan application service, backend tests. The weather-forecast template is already removed.
- **Frontend** (`frontend/drone-inventory-ui`): replaces the Angular placeholder with a drone list and form, student group management, loan form, active loan list, return action and loan history.
- **Dependencies**: EF Core with the SQLite provider, a test framework for the backend (xUnit).
- **Documentation/process**: becomes the source for `openspec/specs/drone`, `student-group` and `loan` after archive, and for the GitHub issues created from `tasks.md`.
