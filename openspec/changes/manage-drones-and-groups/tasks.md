# Tasks

Each task becomes one GitHub issue, one branch and one pull request, with its backend and frontend parts together. Every Given/When/Then scenario of the delta specs is covered by an automated test in the task that implements it. 2.3 needs 2.2; 2.5 needs 2.3 and 2.4.

## 1. Documentation

- [ ] 1.1 Narrow the out-of-scope rule "edit/delete" in `requirements.md`, `AGENTS.md` and `openspec/config.yaml`, and add the `Retired` attribute to `domain-model.md`: drones and student groups may be edited and retired, loans still cannot be edited or deleted — REQ-001, REQ-003, REQ-010 (#147)

## 2. Features

- [ ] 2.1 Limit a loan to 10 batteries and 20 propellers in the backend and the loan form (design D6); tests for "Quantity above the limit is rejected", "Quantities at the limit are allowed", "The loan form shows the limit" — REQ-006 (#140)
- [ ] 2.2 Edit drones and student groups: `PUT /api/drones/{id}`, `PUT /api/student-groups/{id}` and the "Edit" dialogs (design D2, D5); tests for "Rename a drone", "Name taken by another drone", "Invalid name", "Rename a group", "Name taken by another group", and the unknown parts of "Edit an unknown or retired drone/group" — REQ-001, REQ-003 (#141)
- [ ] 2.3 Retire and restore drones and student groups: `Retired` column and migration, retire and restore endpoints, lists, loan creation, dashboard and drone details leave out or flag retired rows, "Retire" with confirmation on both pages (design D1, D2, D5); tests for "Retire an available drone", "Loaned drone cannot be retired", "Cancel the retirement", "Restore a drone", "Restore a drone that is not retired", "Retire a group without active loans", "Group with an active loan cannot be retired", "Restore a group", "Restore a group that is not retired", "Retired drones are not listed", "Retired groups are not listed", "Loan a retired drone", "Loan to a retired group", "Retired drones and groups do not count", and the retired parts of "Edit an unknown or retired drone/group" — REQ-001, REQ-002, REQ-003, REQ-004, REQ-010 (#142)
- [ ] 2.4 Show student group details: `GET /api/student-groups/{id}` and the group dialog on the Student groups page (design D3); tests for "Details of a group with loans", "Return from the group dialog", "Unknown group", "Close the group dialog with Escape" — REQ-003, REQ-007, REQ-008, REQ-010 (#143)
- [ ] 2.5 Open the details from the History and show "Retired" in both dialogs: `droneId`/`studentGroupId` in history rows and details, `retired` in group details (design D3, D4); tests for "Open details from the history", "Details of a retired drone", "Details of a retired group", "Returned loan stays in history" — REQ-002, REQ-003, REQ-010 (#144)
- [ ] 2.6 Make the header app name a link to the Home page; test for "Go home from the header" — REQ-002 (#145)

## 3. Styling (no spec change)

- [ ] 3.1 Light every card near the pointer, the dialogs included, and make the light page gradient visible with 4.5:1 text contrast by modelling the real glow overlap in `theme-tokens.spec.ts` (design D7); verify the theme and app specs and check both themes in the browser (#146)
