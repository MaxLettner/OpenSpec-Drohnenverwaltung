# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta specs (`specs/loan`, `specs/drone`, `specs/ui-theme`) is covered by an automated test written in the task that implements it. Tasks 2.1 to 2.4 touch the loan form one after another and are done in this order; 1.1 and 4.1 are independent of them.

## 1. Documentation

- [x] 1.1 Narrow the out-of-scope rule "search/filter/sort" in `requirements.md` (§1 Out of scope), `AGENTS.md` (Rules) and `openspec/config.yaml` (`context`) to the wording of design D8; verify that all three files say the same and that `openspec validate polish-loan-form` still passes — REQ-004 (#96)

## 2. Loan form pickers

- [x] 2.1 Generate the Spartan `radio-group` and `combobox` helm components and build `shared/option-picker/OptionPicker` (design D1 to D3): radio list for at most 6 options, search box above that, name match ignoring case, choice cleared when the text changes, "no match" text; verify component tests for the scenarios "Choose by keyboard", "Search box for more than 6 options", "Typing narrows the options", "Choose a searched option", "Changing the search text clears the choice" and "No matching option", and `npm run build` — REQ-004 (#97)
- [x] 2.2 Replace the two native selects in `LoanForm` with `OptionPicker` for drones (name and description) and groups; port the existing `loan-form.spec.ts` and `loans-page.spec.ts` tests to choose through the picker without dropping any of them; verify component tests for the scenarios "Drones are shown as options" and "Choose a drone and a group by clicking", plus all existing loan form scenarios including "Offer a returned drone for a new loan" — REQ-004, REQ-005 (#98)
- [x] 2.3 Choose a single drone or group automatically in `LoanForm` after loading and after the form is cleared (design D4); verify component tests for the scenarios "Only one drone and one group", "Several options are not chosen automatically" and "Single option is chosen again after a loan" — REQ-004 (#99)
- [x] 2.4 Bind `/loans?droneId=<id>` to `LoansPage` with `withComponentInputBinding()` and pass it to `LoanForm` as `initialDroneId`, applied once on the first drone load (design D5); verify component tests for the scenarios "Opened with an available drone", "Opened with a drone that is loaned" and "Opened with an unknown drone" — REQ-004, REQ-005 (#100)

## 3. Drones page

- [ ] 3.1 Add an "Action" column with a "Loan" link for every `Available` drone on the Drones page (design D6); verify component tests for the scenarios "Loan action for an available drone" and "Loan action opens the loan form" (router test that lands on the Loans page with the drone chosen) — REQ-002, REQ-004 (#101)

## 4. Background

- [ ] 4.1 Add `--ctp-blue` and the `--page-gradient` token for Latte and Macchiato and use it on `body` with a fixed attachment (design D7); extend `theme-tokens.spec.ts` with the scenarios "Background gradient in both themes" and "Text on the page background stays readable", keep "Accents come from the active flavor" and "Readable text in both themes" passing, and check every page in the browser in both themes (#102)

## Workflow follow-up

- Create the GitHub issues with `/openspec-to-github`, implement each with `/openspec-apply-with-github`.
- Archive the change with `/openspec-archive-with-github` after all tasks are implemented, tested and merged.
- After the archive, verify that `openspec/specs/loan`, `drone` and `ui-theme` contain the new and modified requirements.
