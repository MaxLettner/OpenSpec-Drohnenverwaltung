# Design

## Context

`LoanForm` (`frontend/drone-inventory-ui/src/app/loans/loan-form.ts`) chooses the drone and the group with two `hlm-native-select` elements and keeps the choice in the signals `selectedDroneId` and `selectedGroupId`. It filters the drone list to `Available` drones, reloads it after a loan and after a return (`reloadDrones()`), and drops a chosen drone that is no longer available. `loan-form.spec.ts` and `loans-page.spec.ts` drive the form through the native `<select>` elements. The UI is built from Spartan helm components generated into `src/app/ui/`; `@spartan-ng/brain` 1.9 is installed and also ships `radio-group` and `combobox` primitives that are not generated yet. Routing is plain `provideRouter(routes)` without component input binding. `styles.css` defines the Latte and Macchiato tokens; `body` uses `bg-background`. See `proposal.md` for motivation and the specs for the required behavior.

## Goals / Non-Goals

**Goals:**
- One picker component that serves both choices in the loan form, so drones and groups behave the same.
- The loan rules stay in `LoanForm`; the picker only shows options and reports the chosen `Id`.
- The existing loan form behavior (reload after return, kept values, cleared form after a loan) keeps working and keeps its tests.

**Non-Goals:**
- No change to `CreateLoanRequest`, the services or the backend.
- No picker on any other page; the student group form and the drone form stay as they are.
- No animation of the background.

## Decisions

### D1. One shared `OptionPicker` component
A new standalone component in `src/app/shared/option-picker/` takes the options (`{ id, name, description? }`), the chosen `Id` as a two-way `model<number | null>()`, an `inputId` for the `<label for>` and the words for the empty search result. It renders a radio list for at most `OPTION_LIST_LIMIT = 6` options and a search box above that limit. `LoanForm` uses it twice.
*Alternative:* separate drone and group pickers. Rejected: the same concept twice, and the two would drift apart (CL-10).
*Alternative:* keep the native select and add a search input next to it. Rejected: still needs a menu to see the options and gives two controls for one choice.

### D2. Spartan radio-group and combobox, generated with the CLI
List mode uses the Spartan `radio-group` helm (native radios in one group, `role="radiogroup"`), search mode the Spartan `combobox` (WAI-ARIA combobox with a listbox popup). Both are generated with `npx ng g @spartan-ng/cli:ui` into `src/app/ui/`, like the existing helm components; the combobox brings `input-group` and `tw-animate-css` (popup animation) with it. The match rule is the combobox's own "contains" filter with the collator set to `sensitivity: 'accent'`, which ignores case and nothing else; its default (`'base'`, ignoring punctuation) would match more than the spec says. A test setup file stubs `scrollIntoView` and `ResizeObserver`, which jsdom lacks and the combobox calls.
*Alternative:* hand-written listbox on `@angular/cdk/listbox`. Kept as fallback if the Spartan combobox cannot be driven in the jsdom tests (see Risks); `@angular/cdk` is already a dependency.

### D3. Editing the search text clears the choice
In search mode the picker sets the chosen `Id` to `null` as soon as the text no longer equals the chosen option's name, and sets it again only when an option is chosen. So the box never shows one drone while another is submitted, and `canSubmit` already covers the "cannot be submitted meanwhile" scenario.

### D4. Automatic choice lives in `LoanForm`
A private `chooseSingleOption()` runs after the drones or the groups are loaded and after `resetForm()`: when a list has exactly one option and its signal is `null`, it sets the signal to that `Id`. It is a loan form rule from the spec, so the picker stays a plain control.
*Alternative:* an `autoSelectSingle` input on the picker. Rejected: an option only one caller sets, for a rule the picker does not own.

### D5. Chosen drone from the address: `/loans?droneId=<id>`
`provideRouter(routes, withComponentInputBinding())` binds the query parameter to an `input()` `droneId` on `LoansPage`, which passes it to `LoanForm` as `initialDroneId`. `LoanForm` applies it once, on the first drone load: if a drone with that `Id` is `Available`, it becomes the chosen drone; otherwise nothing is chosen and no error is shown. The parameter is not removed from the address; after the first load it has no effect, so the cleared form after a loan stays cleared.
*Alternative:* a shared service holding the "drone to loan". Rejected: lost on reload, and the address shows nothing.
*Alternative:* router navigation state. Rejected: same reload problem.

### D6. "Loan" on the Drones page is a link
The Drones page adds an "Action" column (like the active loans table). For an `Available` drone it shows `<a hlmBtn variant="outline" size="sm" routerLink="/loans" [queryParams]="{ droneId: drone.id }">Loan</a>`; a `Loaned` drone shows nothing in that cell. A link (not a button) because it navigates; it opens in a new tab with a middle click.

### D7. Background gradient from the theme tokens
`styles.css` adds `--ctp-blue` (Latte `#1e66f5`, Macchiato `#8aadf4`) and a `--page-gradient` token per theme: two large radial gradients, mauve from the top left and blue from the bottom right, each mixed into transparency with `color-mix(in oklch, <accent> <n>%, transparent)` over `var(--background)`. The `body` rule uses it with `background-attachment: fixed`, so it stays still while scrolling. Cards keep `bg-card` and stay opaque. The header's `bg-background/85` stays. The tints are 6 % in Latte and 12 % in Macchiato. Latte's shadcn muted text (`oklch(0.556 0 0)`, 4.73:1 on white) left room for only a 1.5 % tint, so, as decided with the user, Latte `--muted-foreground` becomes `oklch(0.52 0 0)` (5.51:1 on white); it stays a neutral gray. At 6 % the limit is the mauve link text on the mauve glow.
The existing contrast unit test is extended: it computes the strongest tinted color of the gradient for each theme and checks `--foreground` and `--muted-foreground` against it with at least 4.5:1.
*Alternative:* a linear gradient over the whole page. Rejected: on tall pages the bottom gets a visible band.
*Alternative:* tinting the cards too. Rejected: the cards carry all forms and tables, and would need a contrast check for every element.

### D8. Out-of-scope wording
`requirements.md` (§1 Out of scope), `AGENTS.md` (Rules) and `openspec/config.yaml` (`context`) change "search/filter/sort" to say: no search, filtering or sorting of lists; the loan form may search its drone and group options by name.

## Risks / Trade-offs

- [The Spartan combobox opens its popup in an overlay that jsdom tests may not render] → Test through the public DOM first; if it cannot be driven, use the CDK listbox fallback from D2 and say so in the PR.
- [Rewriting the loan form tests from `<select>` to the picker could lose coverage] → Keep every existing scenario test and only change how it chooses an option; count the tests before and after.
- [A gradient can lower the contrast of text that sits directly on the page] → Contrast test from D7 over the strongest tint; cards stay opaque.
- [`withComponentInputBinding()` binds route data to inputs of every routed component] → Only `LoansPage` declares a matching input; noted in `app.config.ts`.

## Migration Plan

Frontend only. Each task is one pull request; rollback is a revert of that pull request. No data or API migration.
