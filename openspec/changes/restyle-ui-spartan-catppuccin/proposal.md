# Proposal

## Why

The Drone Lending System is functionally complete (REQ-001 to REQ-010), but the Angular UI is unstyled: plain HTML tables, native controls and ad-hoc CSS. It looks unfinished, and every page repeats its own table, form and button styles. In addition, starting backend and frontend together on macOS takes several manual terminal steps; the team works in JetBrains Rider and wants a one-click start.

## What Changes

- Introduce **Spartan UI** (spartan.ng, the Angular port of shadcn/ui) with Tailwind CSS v4 as the single UI foundation of the frontend: shared button, input, label, select, textarea, card, table, badge and toast ("sonner") components in place of native elements and per-page CSS.
- Add a **Catppuccin theme**: Latte accents for the light theme, Macchiato accents for the dark theme. Catppuccin supplies the accent colors (primary, ring, focus, badges, links, charts of status); surfaces and text follow the neutral shadcn design tokens.
- The theme follows the operating system setting (`prefers-color-scheme`) by default. A toggle in the app header lets the user override it; the choice is remembered in the browser (`localStorage`).
- Restyle the app shell (header with navigation, page container) and all four pages (Drones, Student groups, Loans, History) including empty, loading and error states and the error toast.
- Show the drone `Availability` (`Available` / `Loaned`) as a colored badge with an accessible text label, not by color alone.
- Add shared **Rider run configurations** (checked in under `.run/`) for macOS: *Backend*, *Frontend* and a compound *Drone Lending System* that starts both, so one click on Run starts the whole system. Update the README accordingly.
- No change to behavior: all REST calls, validation, business rules and component logic stay as they are. Existing tests keep passing.

## Capabilities

### New Capabilities

- `ui-theme`: How the frontend looks and which theme it uses: Catppuccin Latte (light) and Macchiato (dark) accents on Spartan UI/shadcn design tokens, system preference with a remembered manual override, readable contrast, status shown by text as well as color, and unchanged behavior of REQ-001 to REQ-010.

### Modified Capabilities

None. No requirement of `drone`, `student-group` or `loan` changes.

## Impact

- **Frontend** (`frontend/drone-inventory-ui`): new dependencies (`tailwindcss`, `@tailwindcss/postcss`, `@spartan-ng/brain`, `@spartan-ng/cli`, `@angular/cdk`, `clsx`, `tw-animate-css`, an icon library), a `.postcssrc.json`, global styles with theme tokens, generated Spartan "helm" components under `src/app/ui`, changed templates and removal of the per-page CSS of `app`, `drones`, `student-groups`, `loans` and `shared/toast`. Bundle size grows; the production budgets in `angular.json` may need raising and are checked in the task.
- **Repository root**: new `.run/*.run.xml` Rider run configurations and a README section. The backend `launchSettings.json` and API are untouched.
- **Specs**: new `openspec/specs/ui-theme/spec.md` after archive. Existing specs unchanged.
- **Tests**: component tests that use native selectors or text may need updates when markup changes; their asserted behavior must stay identical.

## Out of Scope

- Any change of backend, API, database or the loan rules.
- New features: login/roles, item-level batteries, reservations, damage management, reports/exports, edit/delete, search/filter/sort, and any new page.
- Pixel-perfect copies of shadcn's React demo pages, animations beyond the library defaults, i18n/translation, and custom icons or branding/logo design.
- More than the two Catppuccin flavors (no Frappé or Mocha) and no free accent-color picker.
- Run configurations for IDEs other than Rider, and Windows/Linux specifics (they may work but are not verified).
