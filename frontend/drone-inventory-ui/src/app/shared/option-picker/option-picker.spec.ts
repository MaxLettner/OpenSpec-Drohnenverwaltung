import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OPTION_LIST_LIMIT, OptionPicker, PickerOption } from './option-picker';

@Component({
  imports: [OptionPicker],
  template: `
    <label id="drone-label" for="drone">Drone</label>
    <app-option-picker
      inputId="drone"
      labelId="drone-label"
      noMatchText="No drone matches."
      [options]="options()"
      [(chosenId)]="chosenId"
    />
  `,
})
class PickerHost {
  readonly options = signal<readonly PickerOption[]>([]);
  readonly chosenId = signal<number | null>(null);
}

/** Two drones, few enough for the list. */
const FEW: PickerOption[] = [
  { id: 7, name: 'TELLO-07', description: 'right propeller guard damaged' },
  { id: 8, name: 'TELLO-08' },
];

/** One more than the list holds, so the picker shows the search box. */
const MANY: PickerOption[] = [
  { id: 7, name: 'TELLO-07' },
  { id: 8, name: 'TELLO-08' },
  { id: 1, name: 'MAVIC-01' },
  { id: 2, name: 'MAVIC-02' },
  { id: 3, name: 'ANAFI-03' },
  { id: 4, name: 'ANAFI-04' },
  { id: 5, name: 'AVATA-05' },
];

describe('OptionPicker (REQ-004)', () => {
  let fixture: ComponentFixture<PickerHost>;
  let host: PickerHost;

  const element = () => fixture.nativeElement as HTMLElement;
  const radios = () =>
    Array.from(element().querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const searchInput = () => element().querySelector<HTMLInputElement>('input#drone');
  /** The search popup is rendered into an overlay outside the picker. */
  const offeredNames = () =>
    Array.from(document.querySelectorAll<HTMLElement>('hlm-combobox-item'))
      .filter((item) => !item.hasAttribute('data-hidden'))
      .map((item) => item.textContent?.trim());
  const emptyText = () =>
    document.querySelector<HTMLElement>('hlm-combobox-empty')?.textContent?.trim();

  function show(options: PickerOption[]): void {
    host.options.set(options);
    fixture.detectChanges();
  }

  async function typeSearch(text: string): Promise<void> {
    const input = searchInput()!;
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Browsers send `keyCode` too; the CDK key manager behind the combobox reads it. */
  function pressKey(key: 'ArrowDown' | 'Enter'): void {
    const keyCode = { ArrowDown: 40, Enter: 13 }[key];
    searchInput()!.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode, bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(PickerHost);
    host = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it(`shows at most ${OPTION_LIST_LIMIT} options as a list with name and description (REQ-004)`, () => {
    show(FEW);

    expect(radios().length).toBe(2);
    expect(element().querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby')).toBe(
      'drone-label',
    );
    expect(element().textContent).toContain('TELLO-07');
    expect(element().textContent).toContain('right propeller guard damaged');
    expect(searchInput()).toBeNull();
  });

  it('chooses an option by clicking it (REQ-004)', () => {
    show(FEW);

    radios()[1].click();
    fixture.detectChanges();

    expect(host.chosenId()).toBe(8);
    expect(radios()[1].checked).toBe(true);
  });

  it('Choose by keyboard: the options are one radio group, so the keyboard moves the choice (REQ-004)', () => {
    show(FEW);

    // Native radios with one name: the browser moves focus and choice with the arrow keys
    // and checks the focused radio with Space, which jsdom models as a click.
    expect(new Set(radios().map((radio) => radio.name))).toEqual(new Set(['drone']));
    radios()[1].focus();
    expect(document.activeElement).toBe(radios()[1]);
    radios()[1].click();
    fixture.detectChanges();

    expect(host.chosenId()).toBe(8);
  });

  it('Search box for more than 6 options (REQ-004)', () => {
    show(MANY);

    expect(searchInput()).not.toBeNull();
    expect(radios().length).toBe(0);
  });

  it('Typing narrows the options by name, ignoring case (REQ-004)', async () => {
    show(MANY);

    await typeSearch('tello');

    expect(offeredNames()).toEqual(['TELLO-07', 'TELLO-08']);
  });

  it('Choose a searched option by click (REQ-004)', async () => {
    show(MANY);
    await typeSearch('07');

    document.querySelector<HTMLElement>('hlm-combobox-item:not([data-hidden])')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.chosenId()).toBe(7);
    expect(searchInput()!.value).toBe('TELLO-07');
  });

  it('Choose a searched option by keyboard (REQ-004)', async () => {
    show(MANY);
    await typeSearch('08');

    pressKey('ArrowDown');
    pressKey('Enter');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.chosenId()).toBe(8);
    expect(searchInput()!.value).toBe('TELLO-08');
  });

  it('Changing the search text clears the choice (REQ-004)', async () => {
    show(MANY);
    await typeSearch('07');
    document.querySelector<HTMLElement>('hlm-combobox-item:not([data-hidden])')!.click();
    fixture.detectChanges();
    expect(host.chosenId()).toBe(7);

    await typeSearch('TELLO');

    expect(host.chosenId()).toBeNull();
  });

  it('No matching option: nothing is offered and the picker says so (REQ-004)', async () => {
    show(MANY);

    await typeSearch('xyz');

    expect(offeredNames()).toEqual([]);
    expect(emptyText()).toBe('No drone matches.');
  });
});
