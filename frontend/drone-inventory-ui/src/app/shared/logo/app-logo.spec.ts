import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { App } from '../../app';
import { AppLogo } from './app-logo';

/** The shapes of a logo drawing: every path's `d` and every circle's centre and radius. */
function shapes(svg: Element): string[] {
  return [
    ...Array.from(svg.querySelectorAll('path')).map((path) => `path ${path.getAttribute('d')}`),
    ...Array.from(svg.querySelectorAll('circle')).map(
      (c) => `circle ${c.getAttribute('cx')} ${c.getAttribute('cy')} ${c.getAttribute('r')}`,
    ),
  ];
}

describe('ui-theme: Show the logo', () => {
  it('Header logo: shown before the name in the accent colour, hidden from screen readers', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const brand = (fixture.nativeElement as HTMLElement).querySelector('header a')!;
    const logo = brand.firstElementChild!;
    expect(logo.tagName.toLowerCase()).toBe('app-logo');
    expect(logo.classList).toContain('text-primary');
    expect(logo.getAttribute('aria-hidden')).toBe('true');
    expect(logo.querySelector('svg')).not.toBeNull();
    // The drawing has no text of its own, so the name is announced once.
    expect(logo.textContent?.trim()).toBe('');
    expect(brand.textContent?.trim()).toBe('Drone Lending System');
  });

  it('Browser tab: the title is "Drone Lending System" and the icon is the logo', () => {
    const index = readFileSync('src/index.html', 'utf8');
    expect(/<title>([^<]*)<\/title>/.exec(index)?.[1]).toBe('Drone Lending System');
    expect(index).toMatch(/<link rel="icon" type="image\/svg\+xml" href="favicon\.svg">/);

    const favicon = new DOMParser().parseFromString(
      readFileSync('public/favicon.svg', 'utf8'),
      'image/svg+xml',
    ).documentElement;
    const logo = TestBed.createComponent(AppLogo).nativeElement as HTMLElement;

    expect(shapes(favicon).length).toBeGreaterThan(0);
    expect(shapes(favicon)).toEqual(shapes(logo.querySelector('svg')!));
  });
});
