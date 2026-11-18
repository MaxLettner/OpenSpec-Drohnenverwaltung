# Design

## Context

The backend derives availability in `DroneQueries.GetDronesAsync` and lists loans in `LoanQueries`. `LoanService` returns a loan via `POST /api/loans/{id}/return` and uses the injected `TimeProvider` for today's date; tests fix today at 2026-03-15. The frontend has one page per route, Spartan helm cards and tables, and `ReturnLoan` logic only on `LoansPage`.

## Decisions

### D1. Figures are computed in the backend
`GET /api/dashboard` returns one JSON object, computed with `TimeProvider` for today (UTC):

```json
{
  "drones": { "total": 10, "available": 7, "loaned": 3 },
  "studentGroups": 5,
  "loans": { "active": 3, "returned": 4 },
  "accessoriesOut": { "batteries": 5, "propellers": 4 },
  "longestActiveLoans": [ { "id": 1, "group": "Group 1", "drone": "TELLO-02", "loanDate": "2026-11-10", "daysOut": 8 } ],
  "loansPerWeek": [ { "weekStart": "2026-09-28", "count": 0 } ]
}
```

`longestActiveLoans` holds at most 5 rows, oldest loan date first, then `Id`. `daysOut` is today minus the loan date in days. `loansPerWeek` holds exactly 8 weeks that start on Monday, oldest first, the last one being the current week, counting every loan (active or returned) by its loan date.
*Alternative:* compute in Angular from the existing lists. Rejected: business logic belongs in the backend (AGENTS.md) and it would need four requests.

### D2. `activeLoanId` on the drone list
`DroneListItem` gets `ActiveLoanId` (`int?`), derived in the same query as the availability. The Drones page returns with the existing `POST /api/loans/{id}/return`, so the return rules stay in `LoanService`.

### D3. `GET /api/drones/{id}` for the details dialog
Returns `id`, `name`, `description`, `availability`, `activeLoan` (`id`, `group`, `loanDate`, `daysOut`, `batteries`, `propellers`, or `null`) and `recentLoans` (at most 5 returned loans, latest return first, then `Id` descending, each with `id`, `group`, `loanDate`, `returnDate`, `batteries`, `propellers`). Unknown `Id`: 404 ProblemDetails.

### D4. Shared return in the frontend
Drones page, details dialog and Home page call `LoanService.return(id)` and reload their data afterwards; a rejected return leaves the data as it is (the error toast reports it). The button is disabled while its request runs.

### D5. Dialog with the CDK
The details dialog uses `@angular/cdk/dialog` (already a dependency): focus trap, Escape closes, focus returns to the drone name. The drone name in the table becomes a button.

### D6. Charts without a library
The ring chart and the weekly bars are inline SVG/CSS drawn from the figures, in the theme accent colors, each with a text equivalent (counts as text, `aria-label`).

### D7. Styling fixes (no spec delta)
Under ui-theme "Consistent restyled pages" and "Catppuccin accents with neutral surfaces": the list card is always shown and holds the loading, empty and failed text; `--page-tint` is raised and the glows are enlarged while `theme-tokens.spec.ts` keeps 4.5:1; `hlmCard` gets a border highlight drawn from the pointer position (CSS variables set on `pointermove`), hidden for coarse pointers and without animation.

## Risks

- Week boundaries: "today" is UTC, the same as `LoanDate`, so weeks never split across time zones.
