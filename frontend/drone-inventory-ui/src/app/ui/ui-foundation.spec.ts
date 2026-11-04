import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';

@Component({
  imports: [HlmButton, HlmInput, HlmBadge],
  template: `
    <button hlmBtn type="button">Create drone</button>
    <button hlmBtn variant="outline" type="button" disabled>Cancel</button>
    <input hlmInput aria-label="Name" />
    <span hlmBadge>Available</span>
  `,
})
class UiHost {}

/** Foundation of the restyle (ui-theme): the generated Spartan helm components render in the app. */
describe('Spartan UI foundation', () => {
  it('renders a generated button with its classes and variants', async () => {
    const fixture = TestBed.createComponent(UiHost);
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].textContent?.trim()).toBe('Create drone');
    expect(buttons[0].getAttribute('data-slot')).toBe('button');
    expect(buttons[0].classList.contains('bg-primary')).toBe(true);
    expect(buttons[1].classList.contains('bg-background')).toBe(true);
    expect(buttons[1].disabled).toBe(true);
  });

  it('renders a generated input and badge', async () => {
    const fixture = TestBed.createComponent(UiHost);
    await fixture.whenStable();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('data-slot')).toBe('input');
    const badge = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(badge.getAttribute('data-slot')).toBe('badge');
    expect(badge.textContent?.trim()).toBe('Available');
  });
});
