/**
 * Test helpers that drive an OptionPicker in list mode the way the user does. `root` is the
 * element that holds the picker, `id` its `inputId`. Call `fixture.detectChanges()` after
 * `chooseOption`.
 */

/** The options of a picker, or null while the page shows a text in its place. */
export function optionList(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${id}`);
}

/** Names of the options a picker offers. */
export function offeredOptions(root: HTMLElement, id: string): (string | null)[] {
  return optionLabels(root, id).map(optionName);
}

/** Name of the chosen option, or null while nothing is chosen. */
export function chosenOption(root: HTMLElement, id: string): string | null {
  return optionName(
    optionList(root, id)?.querySelector('input[type="radio"]:checked')?.closest('label'),
  );
}

/** Clicks the radio of the option with this name. */
export function chooseOption(root: HTMLElement, id: string, name: string): void {
  const label = optionLabels(root, id).find((candidate) => optionName(candidate) === name);
  if (!label) {
    throw new Error(`"${name}" is not offered by #${id}; offered: ${offeredOptions(root, id)}`);
  }
  label.querySelector<HTMLInputElement>('input[type="radio"]')!.click();
}

function optionLabels(root: HTMLElement, id: string): HTMLLabelElement[] {
  return Array.from(optionList(root, id)?.querySelectorAll('label') ?? []);
}

function optionName(label: Element | null | undefined): string | null {
  return label?.querySelector('.option-name')?.textContent?.trim() ?? null;
}
