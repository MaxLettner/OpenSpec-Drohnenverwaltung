# Design

## Context

`LoansPage` embeds `<app-loan-form>`. `LoansPage.returnLoan` removes the returned row locally; `LoanForm` loads the drones once in its constructor and again after its own successful loan or a 409. Nothing tells the form that a return happened, so its list keeps the drone as loaned. `LoanForm.loadDrones()` already deselects a chosen drone that is no longer available and leaves group and quantities alone. See `proposal.md` for motivation and scope.

## Goals / Non-Goals

**Goals:**
- After a successful return the form's drone list is reloaded from the backend (availability stays derived by the backend, never decided in the frontend).
- No reload of the page, no change to the form's other state.

**Non-Goals:**
- No polling or push for changes by other users; no shared cache or store for drones.

## Decisions

### D1. The page tells the form to reload its drones
`LoanForm` gets a public `reloadDrones()` that calls its existing `loadDrones()`. `LoansPage` reads the form through `viewChild(LoanForm)` and calls `reloadDrones()` in the success branch of `returnLoan`, after removing the row. A failed return does not call it.
*Alternative: a signal input on `LoanForm` that the page bumps after a return.* Rejected: an input used as an event trigger is harder to read and test.
*Alternative: a shared `DroneService` cache signal that both read.* Rejected: new state and a larger change for one call site.
*Alternative: optimistic local update (add the drone to the form's list in the frontend).* Rejected: it would duplicate the availability rule in the frontend; the backend stays the single source (project rule).

### D2. Keep the form's state
`loadDrones()` is reused unchanged, so a chosen group and the quantities stay, and a chosen drone stays selected while it is still available (spec scenario "Entered values are kept").

## Risks / Trade-offs

- [Two sequential requests after a return (return, then drone list)] → Acceptable; the list request is the same cheap `GET /api/drones` the form already uses.
- [The form is not rendered yet when the first return happens] → The form exists as soon as the page renders and returns need the list rendered; `viewChild` is checked for presence anyway.
