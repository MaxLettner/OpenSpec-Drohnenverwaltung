# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of the delta specs (`specs/sample-data`, `specs/ui-theme`) is covered by an automated test in the task that implements it; the look of the animations and the logo is also checked in the browser. Task 1.1 is backend only and independent of the others; 2.1 and 2.2 both touch `styles.css` and are done in this order.

## 1. Sample data

- [x] 1.1 Add `Infrastructure/SampleData.SeedIfEmptyAsync` with the fixed set of design D2, call it after `Migrate()` in Development when `SampleData:SeedWhenEmpty` is true, add `appsettings.Development.json` with the setting on, and switch it off in `ApiFactory` (design D1); verify backend tests for the scenarios "Empty development database", "Sample data follows the loan rules", "Two fresh databases", "Database with own data", "Production" and "Sample data disabled", and that `dotnet test backend` passes — REQ-001 to REQ-010 (#112)

## 2. Motion

- [x] 2.1 Turn on `withViewTransitions()`, give the active nav entry a `nav-highlight` element, add the 200 ms page fade and the reduced-motion rule to `styles.css` (design D3, D5); verify tests for the scenarios "Switch to another page" (router option and highlight element on the active entry only) and "Reduced motion" (the rule exists), and check page changes in the browser with and without emulated reduced motion (#113)
- [x] 2.2 Fade between themes in `ThemeService` with a view transition, skipped for reduced motion, missing support and the first application (design D4); verify `theme.service.spec.ts` tests for the scenarios "Choose the dark theme", "Reduced motion" and "Page load", and check both directions in the browser (#114)

## 3. Logo

- [ ] 3.1 Draw the quadcopter-and-lock logo, add `shared/logo/AppLogo` in the header in place of the dot, add `public/favicon.svg`, and set the title "Drone Lending System" in `index.html` (design D6); verify tests for the scenarios "Header logo" and "Browser tab", and check the drawing by eye at 16, 24 and 32 px in both themes (#115)

## Workflow follow-up

- Create the GitHub issues with `/openspec-to-github`, implement each with `/openspec-apply-with-github`.
- Archive the change with `/openspec-archive-with-github` after all tasks are implemented, tested and merged.
- After the archive, verify that `openspec/specs/sample-data/spec.md` exists and `openspec/specs/ui-theme/spec.md` contains the three new requirements.
