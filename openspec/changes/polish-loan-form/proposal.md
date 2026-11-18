# Proposal

## Why

Choosing a drone and a student group in the loan form takes more clicks than it should. Both are native dropdowns, so the user has to open a menu to see the choices, cannot see a drone's description there, and has to scroll through a long menu once the inventory grows. A drone that the user already looks at on the Drones page cannot be loaned from there; the user has to switch to the Loans page and find it again in the dropdown (REQ-004). The page background is also a flat neutral color, which makes the app look plainer than the rest of the Catppuccin styling.

## What Changes

- In the loan form, the drone and the student group are chosen from a list of clickable options while there are at most 6 of them. A drone option shows its name and description.
- With more than 6 options, the list becomes a type-to-search box. Typing narrows the options by name in the browser; no new backend request and no API change.
- When exactly one drone or one student group can be chosen, it is chosen already.
- Each `Available` drone on the Drones page gets a "Loan" button that opens the Loans page with that drone chosen in the loan form. Student groups get no such button.
- The page background shows a subtle gradient tinted with the Catppuccin accent of the shown theme. Cards keep their solid neutral surface, and text keeps a contrast ratio of at least 4.5:1.
- The out-of-scope rule "no search, filtering or sorting" in `requirements.md`, `AGENTS.md` and `openspec/config.yaml` is narrowed: search is allowed only for choosing a drone or a student group in the loan form. List pages stay without search, filtering or sorting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `loan`: adds the requirement "Choose a drone and a student group in the loan form" (REQ-004, REQ-005).
- `drone`: adds the requirement "Start a loan from the drone list" (REQ-002, REQ-004).
- `ui-theme`: modifies "Catppuccin accents with neutral surfaces" so the page background may carry a subtle accent gradient while cards and text stay as they are.

## Impact

- **Frontend** (`frontend/drone-inventory-ui`): `LoanForm`, `LoansPage`, `DronesPage`, `styles.css`, a new shared picker component, their specs; one or two generated Spartan helm components.
- **Backend, API, database:** none. The Loans page reads the chosen drone from its URL (`/loans?droneId=<id>`) and checks it against the drone list it already loads.
- **Documentation:** the out-of-scope wording in `requirements.md`, `AGENTS.md` and `openspec/config.yaml`.
- **Specs:** `openspec/specs/loan`, `drone` and `ui-theme` change after archive.

## Out of Scope

- Search, filtering or sorting on the Drones, Student groups, Loans or History lists.
- Searching by description; search matches the drone or group name only.
- A "Loan" button for student groups.
- Any backend or API change, and any change of the loan rules (REQ-001 to REQ-010).
- Login/roles, reservations, damage management, reports/exports, edit/delete.
