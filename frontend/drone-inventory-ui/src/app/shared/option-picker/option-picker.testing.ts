import { ComponentFixture } from '@angular/core/testing';

/**
 * Test helpers that drive an OptionPicker the way the user does, in both modes: a single option
 * is a radio list, two or more are a search box (loan spec "Search the options"). `root` is the
 * element that holds the picker, `id` its `inputId`. The search box needs change detection and
 * stabilisation, so the helpers are async and take the fixture of the test.
 */

/** What the helpers need from a fixture; RouterTestingHarness exposes one as well. */
type Fixture = Pick<ComponentFixture<unknown>, 'detectChanges' | 'whenStable'>;

/** The options of a picker, or null while the page shows a text in its place. */
export function optionList(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${id}`);
}

/** Names of the options a picker offers; a search box is opened without text to list them all. */
export async function offeredOptions(
  fixture: Fixture,
  root: HTMLElement,
  id: string,
): Promise<(string | null)[]> {
  const input = searchInput(root, id);
  if (!input) {
    return optionLabels(root, id).map(optionName);
  }
  await typeSearch(fixture, input, '');
  const names = visibleItems().map((item) => item.textContent?.trim() ?? null);
  await closeSearch(fixture, input);
  return names;
}

/** Name of the chosen option, or null while nothing is chosen. */
export async function chosenOption(
  fixture: Fixture,
  root: HTMLElement,
  id: string,
): Promise<string | null> {
  const input = searchInput(root, id);
  if (!input) {
    return optionName(
      optionList(root, id)?.querySelector('input[type="radio"]:checked')?.closest('label'),
    );
  }
  await settle(fixture);
  return input.value === '' ? null : input.value;
}

/** Clicks the radio of the option with this name, or types the name into the search box and clicks the item. */
export async function chooseOption(
  fixture: Fixture,
  root: HTMLElement,
  id: string,
  name: string,
): Promise<void> {
  const input = searchInput(root, id);
  if (!input) {
    const label = optionLabels(root, id).find((candidate) => optionName(candidate) === name);
    if (!label) {
      throw new Error(`"${name}" is not offered by #${id}`);
    }
    label.querySelector<HTMLInputElement>('input[type="radio"]')!.click();
    fixture.detectChanges();
    return;
  }
  await typeSearch(fixture, input, name);
  const item = visibleItems().find((candidate) => candidate.textContent?.trim() === name);
  if (!item) {
    throw new Error(
      `"${name}" is not offered by #${id}; offered: ${visibleItems().map((i) => i.textContent?.trim())}`,
    );
  }
  item.click();
  await settle(fixture);
}

/** The search input of a picker in search mode, or null in list mode. */
function searchInput(root: HTMLElement, id: string): HTMLInputElement | null {
  const element = optionList(root, id);
  return element instanceof HTMLInputElement ? element : null;
}

async function settle(fixture: Fixture): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Focuses the input and types the text; the empty text opens the box without narrowing it. */
async function typeSearch(fixture: Fixture, input: HTMLInputElement, text: string): Promise<void> {
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await settle(fixture);
}

async function closeSearch(fixture: Fixture, input: HTMLInputElement): Promise<void> {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
  await settle(fixture);
}

/** The search popup is rendered into an overlay outside the picker. */
function visibleItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('hlm-combobox-item')).filter(
    (item) => !item.hasAttribute('data-hidden'),
  );
}

function optionLabels(root: HTMLElement, id: string): HTMLLabelElement[] {
  return Array.from(optionList(root, id)?.querySelectorAll('label') ?? []);
}

function optionName(label: Element | null | undefined): string | null {
  return label?.querySelector('.option-name')?.textContent?.trim() ?? null;
}
