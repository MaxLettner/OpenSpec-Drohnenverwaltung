# Design

## D1 Retired is a stored flag, not a delete

`Drone.Retired` and `StudentGroup.Retired` are `bool` columns, default `false`. Loans keep pointing at the retired row, so the history keeps names and accessories (REQ-010, "Retain returned loans"). This is the one stored state the app adds; availability stays derived. Names stay unique across retired and active rows, so the history never shows two drones with the same name and a restore never collides.

Rules:
- Retire is rejected with 409 when the drone has an active loan, or when the group has at least one active loan, and with 409 when it is already retired.
- Restore is rejected with 409 when it is not retired. Restore exists in the backend only.
- Edit and loan creation are rejected with 409 for a retired drone or group.
- Unknown `Id` is 404 everywhere.
- `GET /api/drones`, `GET /api/student-groups` and the dashboard figures leave retired rows out. The details endpoints still return them, with `retired: true`.

`DELETE` stays unmapped (405), so "No way to delete a loan" and the loan retention tests keep their meaning.

## D2 Endpoints

| Method and path | Body | Success |
|---|---|---|
| `PUT /api/drones/{id}` | `{ "name": string, "description": string \| null }` | 200, the drone as in `GET /api/drones` |
| `POST /api/drones/{id}/retire` | none | 204 |
| `POST /api/drones/{id}/restore` | none | 204 |
| `PUT /api/student-groups/{id}` | `{ "name": string }` | 200, the group as in `GET /api/student-groups` |
| `POST /api/student-groups/{id}/retire` | none | 204 |
| `POST /api/student-groups/{id}/restore` | none | 204 |
| `GET /api/student-groups/{id}` | none | 200, see D3 |

Edit validates like create (trim, not blank, length, unique ignoring case except the row itself) and returns the same 400 and 409 ProblemDetails. Errors use `ApiResults`.

## D3 Group details

`GET /api/student-groups/{id}` returns
`{ id, name, retired, activeLoans: [{ id, droneId, drone, loanDate, daysOut, batteries, propellers }], recentLoans: [{ id, droneId, drone, loanDate, returnDate, batteries, propellers }] }`.
Active loans are ordered by loan date, oldest first. Recent loans are the last 5 returned, latest return first, then `Id` descending, like the drone details. `GET /api/drones/{id}` gains `retired`, and its `activeLoan` and `recentLoans` entries gain `studentGroupId`.

The dialog follows the drone dialog (CDK dialog, Escape closes, focus returns). Each active loan has a "Return" action; after a return the dialog and the page reload.

## D4 History opens the details

`GET /api/loans/history` rows gain `droneId` and `studentGroupId`. On the History page both names are buttons that open the drone or group dialog. Opening a dialog from the History does not change the History. The dialogs show a "Retired" badge and no "Loan" action for a retired drone.

## D5 Edit and retire in the lists

Each row on the Drones and Student groups pages gets an "Edit" and a "Retire" action. "Edit" opens a CDK dialog with the create fields filled in; saving calls `PUT`, closes the dialog and reloads the list. A backend error is shown in the dialog and keeps it open. "Retire" asks for confirmation in a dialog ("Retire TELLO-07? It disappears from the lists and the loan form, the history keeps it."), then calls `retire` and reloads; a rejection is shown as an error toast.

## D6 Accessory limits

`Battery` at most 10, `Propeller` at most 20 per loan, as constants next to `LoanItemType`. Above the limit the loan is rejected with 400 like a negative quantity. The form inputs get `max` and show "At most 10 batteries" or "At most 20 propellers" and do not submit.

## D7 Styling without spec change

- Highlight: on `pointermove` every `[data-slot="card"]` in the document, the dialogs included, gets `--pointer-x`/`--pointer-y` relative to itself, throttled to one update per animation frame. The ring shows on every card while the pointer is in the window (a class on `<html>`), so cards within the 20rem glow light up and far ones stay dark. Dialog hosts get `data-slot="card"`. Touch screens and reduced motion behave as before.
- Light gradient: `theme-tokens.spec.ts` currently assumes both glows overlap at full strength, which never happens because they sit in opposite corners and fade out at 70%. The test computes the strongest real overlap from the gradient geometry, and the light tint rises to the highest value that keeps 4.5:1 for all page text.
