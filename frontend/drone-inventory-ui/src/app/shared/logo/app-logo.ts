import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The logo: a lock's shackle floating over an X quadcopter with four rotor dots (ui-theme
 * "Show the logo", design D6). It takes the text colour (`currentColor`), so the header colours
 * it with the theme's accent. `public/favicon.svg` is the same drawing with fixed colours.
 * Hidden from assistive technology: the name next to it already says what it is.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="size-full"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <path d="M7.25 7.1V5.75a4.75 4.75 0 0 1 9.5 0V7.1" />
      <path d="M7.25 11.85 16.75 21.35M16.75 11.85 7.25 21.35" />
      <g fill="currentColor" stroke="none">
        <circle cx="7.25" cy="11.85" r="2.25" />
        <circle cx="16.75" cy="11.85" r="2.25" />
        <circle cx="7.25" cy="21.35" r="2.25" />
        <circle cx="16.75" cy="21.35" r="2.25" />
      </g>
    </svg>
  `,
})
export class AppLogo {}
