import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';

/** How long a figure counts (ui-theme "Subtle motion": the Home figures finish within 600 ms). */
export const COUNT_UP_MS = 600;

/** Motion only when the browser can animate and the system does not ask for reduced motion. */
function motionAllowed(): boolean {
  return (
    typeof matchMedia === 'function' &&
    typeof requestAnimationFrame === 'function' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Shows a whole number that counts from the previous value (0 at first) to the new one with an
 * ease-out curve (add-motion-and-loan-links design D3). Screen readers get the final value at once;
 * under reduced motion the final value is shown at once.
 */
@Component({
  selector: 'app-count-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true">{{ shown() }}</span
    ><span class="sr-only">{{ value() }}</span>`,
})
export class CountUp {
  readonly value = input.required<number>();
  protected readonly shown = signal(0);

  constructor() {
    effect((onCleanup) => {
      const target = this.value();
      const from = untracked(this.shown);
      if (!motionAllowed() || from === target) {
        this.shown.set(target);
        return;
      }

      let start: number | undefined;
      let frame = 0;
      const step = (now: number) => {
        start ??= now;
        const progress = Math.min(1, (now - start) / COUNT_UP_MS);
        const eased = 1 - (1 - progress) ** 3;
        this.shown.set(Math.round(from + (target - from) * eased));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        }
      };
      frame = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
