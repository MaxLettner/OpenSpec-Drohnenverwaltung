import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';

/** One choice offered by the picker, e.g. a Drone or a StudentGroup. */
export interface PickerOption {
  readonly id: number;
  readonly name: string;
  readonly description?: string | null;
}

/** Up to this many options are shown as a list; more become a search box (polish-loan-form, design D1). */
export const OPTION_LIST_LIMIT = 6;

/** Name match that ignores case but nothing else: "contains the typed text, ignoring case" (REQ-004). */
const NAME_MATCH: Intl.CollatorOptions = { usage: 'search', sensitivity: 'accent' };

/**
 * Lets the user choose one option. Up to `OPTION_LIST_LIMIT` options are shown as radio buttons,
 * each with its name and description; more options are offered through a search box that narrows
 * them by name. In the search box, changing the text away from the chosen name clears the choice,
 * so the box never shows one option while another is chosen (design D3).
 */
@Component({
  selector: 'app-option-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [HlmComboboxImports, HlmRadioGroupImports],
  template: `
    @if (showsList()) {
      <hlm-radio-group
        class="gap-2"
        [name]="inputId()"
        [value]="chosenId() ?? undefined"
        [attr.id]="inputId()"
        [attr.aria-labelledby]="labelId()"
        (valueChange)="chosenId.set($event)"
      >
        @for (option of options(); track option.id) {
          <label
            class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-primary/10"
          >
            <hlm-radio class="pt-0.5" [value]="option.id">
              <hlm-radio-indicator indicator />
            </hlm-radio>
            <span class="grid gap-0.5">
              <span class="option-name text-sm font-medium">{{ option.name }}</span>
              @if (option.description) {
                <span class="option-description text-sm text-muted-foreground">{{
                  option.description
                }}</span>
              }
            </span>
          </label>
        }
      </hlm-radio-group>
    } @else {
      <hlm-combobox
        [value]="chosenOption()"
        [itemToString]="optionName"
        [filterOptions]="nameMatch"
        (valueChange)="chosenId.set($event?.id ?? null)"
        (searchChange)="onSearchChange($event)"
      >
        <hlm-combobox-input
          [inputId]="inputId()"
          placeholder="Type to search"
          triggerAriaLabel="Show all options"
        />
        <hlm-combobox-content *hlmComboboxPortal>
          <hlm-combobox-empty>{{ noMatchText() }}</hlm-combobox-empty>
          <div hlmComboboxList>
            @for (option of options(); track option.id) {
              <hlm-combobox-item [value]="option">{{ option.name }}</hlm-combobox-item>
            }
          </div>
        </hlm-combobox-content>
      </hlm-combobox>
    }
  `,
})
export class OptionPicker {
  readonly options = input.required<readonly PickerOption[]>();
  /** Id of the search input, so that a `<label for>` points at it. */
  readonly inputId = input.required<string>();
  /** Id of the visible label, which names the radio group. */
  readonly labelId = input.required<string>();
  /** Shown in the search box when no option matches, e.g. "No drone matches." */
  readonly noMatchText = input.required<string>();

  /** The `Id` of the chosen option, or null while nothing is chosen. */
  readonly chosenId = model<number | null>(null);

  protected readonly nameMatch = NAME_MATCH;
  protected readonly showsList = computed(() => this.options().length <= OPTION_LIST_LIMIT);
  protected readonly chosenOption = computed(
    () => this.options().find((option) => option.id === this.chosenId()) ?? null,
  );

  protected readonly optionName = (option: PickerOption): string => option.name;

  protected onSearchChange(text: string): void {
    // An empty text is how the combobox shows the chosen name; it clears the choice itself
    // when the user deletes the text.
    if (text !== '' && text !== this.chosenOption()?.name) {
      this.chosenId.set(null);
    }
  }
}
