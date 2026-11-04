# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of `specs/loan` (delta) is covered by an automated test written in the same task.

## 1. Loans page

- [ ] 1.1 After a successful return, reload the drone list of the loan form (`LoanForm.reloadDrones()` called from `LoansPage.returnLoan`) without touching the form's other state; verify component tests for the scenarios "Returned drone is offered again", "Entered values are kept", "Rejected return changes nothing" and "Returned drone can be loaned again at once", and that the existing loans page and loan form specs and `npm run build` still pass — REQ-005, REQ-008 (#86)

## Workflow follow-up

- Archive the change (`/openspec-archive-with-github`) after the task is implemented, tested, reviewed and merged.
- Verify that the requirement "Offer a returned drone for a new loan" exists in `openspec/specs/loan/spec.md` after the archive.
