import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shimmering placeholder rows while a list loads (ui-theme "Loading placeholders",
 * add-motion-and-loan-links design D3). Assistive technology gets the loading text instead.
 */
@Component({
  selector: 'app-loading-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', class: 'block' },
  template: `
    <span class="sr-only">{{ label() }}</span>
    <div class="space-y-3" aria-hidden="true" data-placeholders>
      @for (width of widths; track $index) {
        <div class="skeleton h-5 rounded-md" [style.width.%]="width"></div>
      }
    </div>
  `,
})
export class LoadingRows {
  /** The text a screen reader announces, e.g. "Loading drones...". */
  readonly label = input.required<string>();
  protected readonly widths = [100, 92, 84];
}
