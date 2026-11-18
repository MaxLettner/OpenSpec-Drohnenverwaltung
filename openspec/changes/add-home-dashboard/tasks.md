# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta specs is covered by an automated test in the task that implements it. 2.x are backend, 3.x frontend; 3.1 needs 2.1, 3.2 needs 2.2, 3.3 needs 2.3.

## 1. Documentation

- [x] 1.1 Narrow the out-of-scope rule "reports, statistics or exports" in `requirements.md`, `AGENTS.md` and `openspec/config.yaml`: the Home page may show live figures computed from the current data; exports, printable reports and stored statistics stay out of scope — REQ-002, REQ-007, REQ-010 (#123)

## 2. Backend

- [x] 2.1 Add the derived `activeLoanId` to `GET /api/drones` (design D2); verify tests for "List drones with and without a loan", "Drone is available again after return", "Empty inventory" — REQ-002, REQ-008 (#124)
- [x] 2.2 Add `GET /api/drones/{id}` with active loan and last 5 returned loans (design D3); verify tests for the backend parts of "Details of a loaned drone", "Details of an available drone" and "Unknown drone" — REQ-002, REQ-007, REQ-010 (#125)
- [x] 2.3 Add `GET /api/dashboard` (design D1); verify tests for "Figures match the data", "Empty database", "Only active loans count", "Oldest loans first", "Loans counted by week" — REQ-002, REQ-006, REQ-007, REQ-010 (#126)

## 3. Frontend

- [x] 3.1 Add the "Return" action for `Loaned` drones on the Drones page (design D4); verify component tests for "Return action for a loaned drone", "Return from the drone list", "Rejected return" — REQ-008 (#127)
- [x] 3.2 Add the drone details dialog (design D5); verify component tests for "Details of a loaned drone", "Details of an available drone", "Return from the dialog", "Close with Escape" — REQ-002, REQ-007, REQ-008, REQ-010 (#128)
- [x] 3.3 Add the Home page with route `/`, "Home" navigation entry, ring chart, accessories, longest active loans with return, weekly bars (design D1, D6); verify component tests for "Open the app", "Figures match the data", "Empty database", "Only active loans count", "Oldest loans first", "Return from the Home page", "Loans counted by week" — REQ-002, REQ-006, REQ-007, REQ-008, REQ-010 (#129)

## 4. Styling (no spec change)

- [ ] 4.1 Show loading, empty and failed texts inside the list card on every page, make the page gradient clearly visible with 4.5:1 text contrast, and add the pointer-following card border highlight (design D7); verify that `theme-tokens.spec.ts` and the page specs pass and check every page in both themes in the browser (#130)

## Workflow follow-up

- Archive the change after all tasks are implemented, tested and merged; then verify `openspec/specs/dashboard` and `openspec/specs/drone`.
