# Proposal

## Why

A typo in a drone or group name cannot be fixed, and a drone that broke or a group that left the course stays in every list and in the loan form forever. A student group has no details view like a drone has, so finding out what a group has out, or what it had before, means scanning the Loans and History pages. In the History the names cannot be opened at all. A loan accepts any number of batteries and propellers, also 500. Some visual details are off: the card border highlight only shows on the hovered card and not in the drone dialog, the page gradient cannot be seen in the light theme, and the app name in the header does not lead to the Home page.

## What Changes

- Drones and student groups can be edited: name and description of a drone, name of a group, with the same rules as when they are created.
- Drones and student groups can be retired. A retired drone or group is stored with a `Retired` flag, disappears from the lists, the loan form and the Home figures, cannot be loaned or edited, and stays in the loan history with its name. A drone with an active loan, or a group with an active loan, cannot be retired. The backend can restore a retired drone or group; the frontend does not offer that.
- Clicking a group name on the Student groups page opens a dialog with the group's details: its active loans, each with a "Return" action, and its last 5 returned loans. New endpoint `GET /api/student-groups/{id}`.
- In the History, group and drone names open their details dialogs. The dialogs show "Retired" for a retired drone or group.
- A loan accepts at most 10 batteries and at most 20 propellers.
- The header name leads to the Home page.
- The out-of-scope rule "edit/delete" in `requirements.md`, `AGENTS.md` and `openspec/config.yaml` is narrowed: drones and student groups may be edited and retired. Loans still cannot be edited or deleted.
- Styling fixes without spec change: the border highlight lights every card near the pointer, also the dialogs, and the light page gradient becomes visible while text keeps 4.5:1.

## Capabilities

### Modified Capabilities

- `drone`: edit, retire and restore a drone; retired drones are not listed; the details show "Retired" (REQ-001, REQ-002).
- `student-group`: edit, retire and restore a group; retired groups are not listed; new details dialog (REQ-003, REQ-007, REQ-010).
- `loan`: accessory limits; retired drones and groups cannot be loaned; History names open the details (REQ-004, REQ-006, REQ-010).
- `dashboard`: the header name leads Home; retired drones and groups do not count (REQ-002).

## Impact

- Backend: `Drone` and `StudentGroup` get a `Retired` column (migration). New endpoints `PUT /api/drones/{id}`, `POST /api/drones/{id}/retire`, `POST /api/drones/{id}/restore`, the same for `/api/student-groups/{id}`, and `GET /api/student-groups/{id}`. `GET /api/drones/{id}` gets `retired`; the history rows get `droneId` and `studentGroupId`. Loan creation checks the limits and the `Retired` flag.
- Frontend: edit dialog and retire action on the Drones and Student groups pages, group details dialog, clickable History names, form limits, header link, styles.
- Docs: `requirements.md`, `AGENTS.md`, `openspec/config.yaml`, `domain-model.md`.
