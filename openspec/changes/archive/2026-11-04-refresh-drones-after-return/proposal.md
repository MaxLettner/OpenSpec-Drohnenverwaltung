# Proposal

## Why

After a loan is returned on the Loans page, the loan form keeps saying "No drones available." until the page is reloaded, although the drone is available again (REQ-008). The drone list of the form is only loaded when the page opens and after the form's own loan, so a returned drone cannot be loaned again without a manual reload. Found during the final walkthrough of the UI restyle; the behavior predates the restyle.

## What Changes

- After a loan has been returned on the Loans page, the loan form offers the returned drone again without reloading the page.
- The form keeps what the user has already entered or chosen (drone, group, quantities) while its drone list is refreshed.
- A rejected return changes nothing in the form.
- No change to the backend, the REST API or the loan rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `loan`: adds one requirement, "Offer a returned drone for a new loan", on top of REQ-005 and REQ-008. No existing requirement text changes.

## Impact

- **Frontend** (`frontend/drone-inventory-ui`): `LoansPage` and `LoanForm` and their specs.
- **Backend, API, database:** none.
- **Specs:** `openspec/specs/loan/spec.md` gains one requirement after archive.

## Out of Scope

- Live updates when another user loans or returns a drone (no polling, no push); a reload still shows the current state.
- Any backend or API change, and any change of the loan rules (REQ-001 to REQ-010).
- The Drones page (it loads its list each time it is opened) and the visual design.
- Login/roles, reservations, damage management, reports/exports, edit/delete, search/filter/sort.
