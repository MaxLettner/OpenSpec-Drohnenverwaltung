# Design

## Context

The frontend (`frontend/drone-inventory-ui`, Angular 22, standalone components, signals, OnPush) has no design system. Every page carries its own `styles` block (tables, forms, buttons), `styles.css` is empty, and the app shell and the toast container have separate CSS files/blocks. Components use native `<input>`, `<select>`, `<textarea>`, `<button>` and `<table>`; their specs query these elements and texts. Behavior comes from `openspec/specs/{drone,student-group,loan}`; this change adds only `specs/ui-theme`. See `proposal.md` for motivation and scope.

shadcn/ui itself is React-only. **Spartan UI** (`@spartan-ng/brain` 1.9.0, `@spartan-ng/cli` 1.9.0) is its Angular port; it supports Angular `>=21 <23` and Tailwind `>=4`, which matches this project (Angular 22). The macOS developer opens the repository root folder in Rider.

## Goals / Non-Goals

**Goals:**
- One shared set of UI building blocks and design tokens; pages contain layout and content only.
- Latte/Macchiato accents via CSS variables, switched by one class on `<html>`; no flash of the wrong theme at load.
- Existing behavior, public component APIs (`created`, `loaned` outputs, services) and test intent stay unchanged.
- One click in Rider starts backend and frontend.

**Non-Goals:**
- No refactoring of component logic, services, models or routes.
- No replacement of the `ToastService` API or of native `<select>` behavior (see D4, D5).
- No SSR, no new runtime state management, no Storybook.

## Decisions

### D1. Spartan UI "helm" components, copied into the repo
Add Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`, `.postcssrc.json`, `@import 'tailwindcss'` in `styles.css`), `@spartan-ng/brain`, `@angular/cdk`, `clsx`, `tw-animate-css` and generate the needed helm components with the Spartan CLI into `src/app/ui/`: button, input, label, textarea, card, table, badge, plus a native-select style, and `lucide` icons (`@ng-icons/lucide`) for the theme toggle. Only components that are used are generated. Helm code lives in our repo (same model as shadcn), so it can be adjusted and needs no runtime theme package.
*Alternative:* Tailwind + hand-written components. Rejected by the user in favor of Spartan, which gives the real shadcn look and accessible primitives.
*Alternative:* Angular Material/PrimeNG. Rejected: not shadcn.

### D2. Catppuccin as CSS variables on shadcn tokens
`styles.css` defines the shadcn token set (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--input`, `--ring`, `--primary`, `--primary-foreground`, `--destructive`, plus `--success` and `--warning` for badges) twice: in `:root` with Latte values and in `.dark` with Macchiato values, and maps them to Tailwind via `@theme inline`. The Catppuccin values are copied as hex literals (no `@catppuccin/*` package; 2 x about 14 colors).

Mapping (accents from Catppuccin, surfaces neutral as chosen in the proposal):
- `--primary` / `--ring` / active navigation / links: **Mauve** (Latte `#8839ef`, Macchiato `#c6a0f6`).
- `--destructive` / error toast / invalid hints: **Red**.
- Available badge: **Green**; Loaned badge: **Peach**.
- Surfaces and text (`--background`, `--card`, `--foreground`, `--muted-foreground`, `--border`): neutral shadcn palette (light and dark neutrals), not Catppuccin base colors.

Badges use a tinted background with normal foreground text and an accent border, not accent-colored text, because Latte green/peach text on a light surface fails 4.5:1. The foreground of the primary button is chosen per flavor so that it passes 4.5:1. A unit test reads the token pairs and checks the contrast ratios, which covers the "Readable text in both themes" scenario without a browser.
*Alternative:* full Catppuccin base/mantle surfaces. Rejected: the user wants Catppuccin "mostly for the accents".

### D3. `ThemeService` and the header toggle
A root `ThemeService` holds `preference: 'system' | 'light' | 'dark'` as a signal. The effective theme is `dark` when the preference is `dark`, or when it is `system` and `matchMedia('(prefers-color-scheme: dark)')` matches. An effect toggles the `dark` class on `document.documentElement` and sets `color-scheme`. A `change` listener on the media query follows system changes. The preference is stored in `localStorage` under one key; every storage and `matchMedia` access is wrapped in try/catch and treats a missing API (jsdom, private mode) or an invalid stored value as `system`. The header toggle (`light` / `dark` buttons with `aria-pressed`) writes the preference; choosing a theme equal to the system theme still stores the explicit choice.

To avoid a flash, a small inline script in `index.html` applies the same rule before Angular boots. The service and the script share the rule by test (both are covered), not by import.
*Alternative:* three-state cycle button including "system". Rejected: the spec offers light/dark; "system" is the default until the user chooses.

### D4. Toast: keep `ToastService`, restyle `ToastContainer`
`ToastService`, the HTTP error interceptor and their tests stay as they are. `ToastContainer` is restyled with Tailwind classes and helm button/icon styles (error color tokens, `role="alert"`, close button with `aria-label`). Spartan's sonner toaster is not adopted.
*Alternative:* sonner. Rejected: it would change the service API and the existing toast tests without a gain for the spec.

### D5. Native elements stay, with helm styling
Form controls keep native `<input>`, `<textarea>`, `<select>` and `<table>` elements with Spartan directives/classes (`hlmInput`, `hlmBtn`, `hlmLabel`, `hlmTable`-style classes, a native-select class). The loan form relies on native `change` events, `viewChild` references to number inputs and `validity.badInput`; Spartan's brain select (CDK overlay) would replace that logic. Keeping native elements preserves behavior, mobile pickers and accessibility, and keeps tests stable (they query `select`, `input`, `button`).

### D6. Page structure
`app.html`: sticky header (title, nav as pill links with the active state, theme toggle), centered container `max-w-5xl`. Each page: `h1`, forms in a `card`, lists in a `card` with the table; empty and loading states as muted text/`card` content. Tables sit in an `overflow-x-auto` wrapper so the page itself never scrolls horizontally at 360 px. Per-component `styles` blocks and `app.css` are removed where the shared classes replace them.

### D7. Rider run configurations (`.run/` at the repo root)
Shared run configuration XML files, committed:
- `Backend.run.xml`: .NET Project configuration for `backend/DroneInventory.Api`, launch profile `http`, environment `Development` (port 5035, SQLite migrations at startup, as today).
- `Frontend.run.xml`: npm configuration, `package.json` of `frontend/drone-inventory-ui`, command `run`, script `start` (port 4200, proxy to 5035).
- `Drone Lending System.run.xml`: compound configuration that starts both.
README documents opening the repository root folder in Rider, the one-time `npm install`, and the URLs. They are Rider-only conveniences; the documented `dotnet run` / `npm start` commands remain.
*Alternative:* shell script or Makefile. Rejected for this change: the request is "execution with Rider"; a script can be added later without conflict.

## Risks / Trade-offs

- [Spartan CLI generators can overwrite or restructure files / produce code that fails our strict TS settings (`noPropertyAccessFromIndexSignature`, etc.)] → Generate into `src/app/ui` only, review the diff, run `ng build` and `ng test` after each task.
- [Existing component tests may break on markup changes] → Keep native elements and visible texts (D5); update selectors only where a class/structure changed, never the asserted behavior (spec "Restyling keeps behavior unchanged").
- [Tailwind + Spartan raise the initial bundle] → Check `ng build` against the budgets in `angular.json`; raise them consciously in the task if needed and note it in the pull request.
- [`prefers-color-scheme`/`localStorage` unavailable in jsdom or blocked in the browser] → Guarded access with a `system`/light fallback (D3).
- [Latte accents on light surfaces have low contrast] → Tinted badges with neutral text, per-flavor foreground pairs and the contrast unit test (D2).
- [Rider run configuration XML is IDE-specific and cannot be run in automated tests] → Verify well-formedness and that the referenced commands/paths exist, and confirm once in Rider on macOS; record the result in the task.
- [Spartan 1.x API or CLI flags differ from what is described here] → The first frontend task confirms the exact generator commands and records them in the README.

## Migration Plan

Purely additive on the frontend and repo root. Steps in order: tooling and tokens (task 1) → theme service and shell (task 2) → shared components → pages → Rider configs and README. Rollback is a revert of the pull requests; no data, API or database migration is involved.

## Open Questions

- Which exact set of Spartan components ends up generated (for example whether a table helm component exists in the used version or table classes are written by hand) is decided in task 1.2 and does not change specs or task breakdown.
