# Tasks

Each task becomes one GitHub issue, one branch and one pull request. Every Given/When/Then scenario of `specs/ui-theme` is covered by an automated test written in the same task (visual checks in the browser are added where a test cannot see them). No task changes behavior of REQ-001 to REQ-010: the existing tests stay green and keep asserting the same behavior.

## 1. Foundation

- [x] 1.1 Add Tailwind CSS v4 (`.postcssrc.json`, `@import 'tailwindcss'`), `@spartan-ng/brain`, `@spartan-ng/cli`, `@angular/cdk`, `clsx`, `tw-animate-css` and an icon library; set up the Spartan CLI config and generate the helm components that are needed (button, input, label, textarea, card, badge, table classes, native-select style) into `frontend/drone-inventory-ui/src/app/ui/`; verify `npm run build` and `npm test -- --watch=false` pass and a generated button renders in a component test (#57)
- [x] 1.2 Define the shadcn token set for Catppuccin Latte (`:root`) and Macchiato (`.dark`) in `styles.css` with Mauve primary/ring, Red destructive, Green available, Peach loaned and neutral surfaces, mapped via `@theme inline`; verify unit tests for the scenarios "Accents come from the active flavor" and "Readable text in both themes" (token pairs of button, input, table, badge and error message reach a contrast ratio of at least 4.5:1 in both themes) (#58)

## 2. Theme switching and app shell

- [x] 2.1 Implement `ThemeService` (preference `system | light | dark`, `prefers-color-scheme`, `localStorage` with guarded access, `dark` class on `<html>`) and the inline pre-boot script in `index.html`; verify service tests for the scenarios "Light system setting", "Dark system setting", "System setting changes while the app is open", "Choice survives a reload", "Chosen theme beats the system setting" and "Invalid stored choice" (#59)
- [x] 2.2 Restyle the app shell (header, pill navigation with active state, centered container) and add the light/dark toggle with `aria-pressed`; remove `app.css`; verify `App` tests for the scenarios "Switch to dark on a light system" and "Navigation marks the current page", and that the existing navigation labels and the single toast container test still pass (#60)

## 3. Pages

- [x] 3.1 Restyle `ToastContainer` with the error color tokens, keeping `ToastService`, `role="alert"` and the close button; verify component tests for the scenarios "Backend error is shown" and "Dismiss a notification" plus the existing toast and interceptor specs — REQ-001, REQ-003, REQ-004, REQ-008 (#61)
- [x] 3.2 Restyle the Drones page and drone form (card, label, input, textarea, button, table in a horizontal-scroll wrapper, availability badges with text); verify component tests for the scenarios "Available and loaned badges", "Form validation is unchanged" and the existing drone page and form specs still pass — REQ-001, REQ-002 (#62)
- [x] 3.3 Restyle the Student groups page (form card, list card, empty state); verify the existing student group specs still pass and a test checks the shared button and input styles are used — REQ-003 (#63)
- [x] 3.4 Restyle the loan form (styled native selects and number inputs, hints, error hint); verify the existing loan form specs still pass and a component test for the scenario "Loan flow still works" (one request with drone, group, 2 batteries, 4 propellers) — REQ-004, REQ-005, REQ-006 (#64)
- [x] 3.5 Restyle the Loans page (active loans card and table, return button, empty and loading states); verify the existing loans page specs still pass and a component test for the scenario "Return flow still works" — REQ-007, REQ-008 (#65)
- [x] 3.6 Restyle the History page (table card, empty and loading states); verify the existing history specs still pass and a test that all page tables share one style and sit in a horizontal-scroll wrapper for the scenarios "Same look on every page" and "Narrow viewport" — REQ-010 (#66)

## 4. Rider on macOS

- [x] 4.1 Add shared Rider run configurations in `.run/` at the repository root (`Backend`, `Frontend`, compound `Drone Lending System`) and document them with the one-time `npm install` in `README.md`; verify the XML files are well-formed, that the referenced project, launch profile `http`, `package.json` and `start` script exist, that `dotnet run --project backend/DroneInventory.Api` and `npm start` start as documented, and that the configurations appear and start both apps from the repository root folder in Rider on macOS (#67)

## 5. Integration

- [x] 5.1 Walk through the reference example (Group 3, TELLO-07, 4 batteries, 8 propellers: loan, list, return, history) in the running app in the Latte and the Macchiato theme and at 360 px width; verify with screenshots/observations in the PR description, check `ng build` against the budgets in `angular.json`, and fix or file anything that deviates — REQ-001 to REQ-010 (#68)

## Workflow follow-up

- Archive the change (`/openspec-archive-with-github`) after all tasks are implemented, tested, reviewed and merged.
- Verify that `openspec/specs/ui-theme` exists after the archive.
