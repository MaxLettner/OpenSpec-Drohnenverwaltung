# Design

## Context

`Program.cs` runs `Database.Migrate()` only in Development. The test `ApiFactory` also starts the API in Development, on an in-memory SQLite database per factory, with `FixedTimeProvider` (2026-03-15). `appsettings.Development.json` was removed in #93 because it repeated `appsettings.json`. The frontend uses `provideRouter(routes, withComponentInputBinding())`; the nav entries in `app.html` mark the active one with `aria-[current=page]:bg-primary/15`. `ThemeService` toggles the `dark` class on `<html>` in an `effect`; an inline script in `index.html` applies the stored theme before Angular starts. `index.html` still has the Angular defaults (`<title>DroneInventoryUi</title>`, `favicon.ico`). See `proposal.md` for motivation and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**
- Motion from browser features, no animation library and no per-component animation code.
- One place that decides when motion is off (reduced motion, no browser support).
- Sample data that every developer gets the same way, without touching tests or existing databases.

**Non-Goals:**
- `@angular/animations` (deprecated since Angular 20.2) or a third-party motion library.
- Measuring animation timing in unit tests; the tests check the wiring, the browser check covers the look.

## Decisions

### D1. Sample data: `Infrastructure/SampleData`, switched on by configuration
A static `SampleData.SeedIfEmptyAsync(AppDbContext)` writes the set in one `SaveChanges` when `Drones`, `StudentGroups` and `Loans` are all empty, and does nothing otherwise. `Program.cs` calls it right after `Migrate()` inside the Development block when `SampleData:SeedWhenEmpty` is `true`. `appsettings.Development.json` comes back with that one setting set to `true`; `ApiFactory` sets it to `false` with `UseSetting`, so the existing tests keep their empty databases. Tests for the seeder create their own factory with the setting on.
*Alternative:* seed whenever the environment is Development. Rejected: the test factory runs in Development, and all list tests would see sample rows.
*Alternative:* EF `HasData` in a migration. Rejected by the user: it would reach every environment.

### D2. A fixed, rule-abiding set with fixed dates
10 drones (`TELLO-01` … `TELLO-05`, `MAVIC-01`, `MINI-01`, `MINI-02`, `ANAFI-01`, `AVATA-01`, each with a short description or none), 5 groups (`Group 1` … `Group 5`), 3 active loans and 4 returned loans with batteries and propellers, on fixed dates in October and November 2026. 10 drones with 3 active loans leave 7 available, so the drone picker shows its search box, and the 5 groups show as a list: a demo shows both picker modes. Loans are written as entities with explicit `LoanDate`/`ReturnDate`, not through `LoanService`, because returned loans need dates in the past. A test checks the rules of the "Sample data follows the loan rules" scenario on the written rows; the partial unique index and the quantity check constraint guard them as well.

### D3. Page motion: router view transitions
`provideRouter(routes, withComponentInputBinding(), withViewTransitions())` wraps every navigation in `document.startViewTransition`. The default root crossfade is replaced in `styles.css` with a 200 ms fade and 4 px rise of the new page (`::view-transition-new(root)`) and a fade-out of the old one. The nav highlight becomes its own element: the active link contains a `span` with `view-transition-name: nav-highlight` behind its label, so the browser moves and resizes that span from the old entry to the new one while the labels stay in place. The moving box is drawn as the transition group's own background (same color and radius) with the old/new pictures hidden; a stretched picture bent the rounded corners between entries of different width. The header and the content get their own transition names, and `html { overflow-y: scroll }` keeps the page width the same on short and long pages, so a page change never slides them sideways (Chromium ignores `scrollbar-gutter: stable` on the root while the page does not overflow). Browsers without view transitions navigate instantly; Angular checks for support itself.
*Alternative:* one absolutely positioned pill that measures the active link and moves with a CSS transition. Rejected: needs layout code, resize handling and a second mechanism for the content fade.

### D4. Theme fade: view transition around the class change
`ThemeService` applies the class through `document.startViewTransition(() => toggle)` when the browser supports it and `prefers-reduced-motion: reduce` does not match; otherwise it toggles directly, as today. The first application (constructor, matching what the inline script already set) never animates. During the theme fade `<html>` carries a `theme-transition` class, which `styles.css` uses to give `::view-transition-old/new(root)` a plain 250 ms crossfade instead of the page-change rise.
*Alternative:* CSS `transition` on `background-color` and `color` of every element. Rejected: each element fades on its own timing, and borders, rings and SVGs lag behind.

### D5. One reduced-motion rule
`@media (prefers-reduced-motion: reduce)` in `styles.css` sets `animation: none` on `::view-transition-group(*)`, `::view-transition-old(*)` and `::view-transition-new(*)`. That covers page changes; `ThemeService` additionally skips the view transition for the theme (D4), so nothing is captured at all.

### D6. Logo: one SVG drawing, two uses
A 24 × 24 line drawing in the style of the Lucide icons already used for the theme toggle: four rotor circles at the corners, two diagonal arms, and a padlock (rounded body plus shackle) in the center where the arms cross. Stroke width 2, `stroke="currentColor"`, at most about ten shapes so it survives 16 px. `shared/logo/AppLogo` renders it inline with `aria-hidden="true"` in the header, colored `text-primary`, replacing the dot. `public/favicon.svg` is the same drawing with the Latte mauve stroke and a `prefers-color-scheme: dark` style that switches to the Macchiato mauve; `index.html` links it and drops `favicon.ico`, and the title becomes "Drone Lending System". The drawing is checked by eye at 16, 24 and 32 px in both themes before the task closes.

## Risks / Trade-offs

- [Firefox versions without view transitions get no motion] → Accepted: the spec allows an instant change where the browser cannot animate.
- [A view transition captures the page as images, so a page change during a running theme fade skips the fade] → Accepted; both last under 300 ms.
- [Sample data could be mistaken for real data] → Only in Development and only on an empty database; the names follow the spec examples so they read as sample data.
- [Animation timing is not unit-tested] → Tests check the router option, the CSS rules and `ThemeService` choosing the right path; the look is checked in the browser in both themes and with reduced motion emulated.

## Migration Plan

No data migration. Existing development databases keep their data; to get the sample set, delete `droneinventory.db` and start the backend. Each task is one pull request; rollback is a revert.
