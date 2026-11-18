# Design

## D1 Loans page links

`GET /api/loans` rows gain `studentGroupId` and `droneId`, like the history rows. The names become buttons with `aria-label="Details of <name>"` that open the existing dialogs. A return made in a dialog reloads the Loans page list.

## D2 No Home entry

The `/` entry leaves the navigation list. The header app name is the only link to Home, and it gets `aria-current="page"` on Home so that the current page is still announced.

## D3 Motion rules

All motion is CSS (keyframes and transitions) plus one small signal-based counter on Home; no animation library. Every effect is switched off by the existing `prefers-reduced-motion: reduce` block, where the end state is shown at once. Durations stay at or under 300 ms per element; staggering adds at most 200 ms in total (20 ms per row, capped at 10 rows).

- Dialog: `.cdk-overlay-pane` children get a 150 ms `dialog-in` keyframe (opacity 0 → 1, scale 0.96 → 1); the backdrop gets `backdrop-filter: blur(2px)`. Closing is not animated, because the CDK removes the dialog at once.
- Press feedback: `[hlmBtn]:active` and buttons get `scale(0.97)` with a 100 ms transition.
- Home figures: the numbers count from 0 to their value in 600 ms with an ease-out curve via `requestAnimationFrame`; the ring stroke animates `stroke-dashoffset` from empty and the bars animate `scale-y` from 0, both 500 ms. These are the one exception to the 300 ms rule because they run once per page load and change no layout. The final values are in the DOM from the start (`aria-label` and text for screen readers come from the real value).
- Rows: `tbody tr` gets a `row-in` keyframe (opacity and 4 px rise, 200 ms) with `animation-delay: calc(min(var(--row), 10) * 20ms)`; the row index comes from the `@for` `$index`.
- Skeleton: the loading state renders 3 placeholder bars with a shimmer gradient (`aria-hidden="true"`) plus the loading text as `sr-only`. Tests keep finding the loading text.

## D4 Softer highlight in dark mode (no spec change)

The ring uses `--card-glow`, which is `var(--primary)` in light and `color-mix(in oklab, var(--primary) 45%, transparent)` in dark, with a 1px ring in dark.
