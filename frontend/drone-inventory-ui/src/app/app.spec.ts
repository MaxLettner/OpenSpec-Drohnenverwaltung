import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { THEME_STORAGE_KEY } from './shared/theme/theme.service';

@Component({ template: '' })
class BlankPage {}

/** Pretends the operating system prefers light or dark. */
function setSystemTheme(dark: boolean): void {
  const matchMedia = () => ({ matches: dark, addEventListener: () => undefined });
  for (const target of [globalThis, window, document.defaultView]) {
    Object.defineProperty(target, 'matchMedia', { value: matchMedia, configurable: true, writable: true });
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show navigation to drones, student groups, loans and history', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const labels = Array.from(compiled.querySelectorAll('nav a')).map((link) => link.textContent?.trim());
    expect(labels).toEqual(['Drones', 'Student groups', 'Loans', 'History']);
  });

  it('renders the toast container once in the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('app-toast-container').length).toBe(1);
  });
});

/** ui-theme: the header marks the current page and holds the theme switch. */
describe('App shell (ui-theme)', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'drones', component: BlankPage },
          { path: 'student-groups', component: BlankPage },
          { path: 'loans', component: BlankPage },
          { path: 'loans/history', component: BlankPage },
        ]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    for (const target of [globalThis, window, document.defaultView]) {
      Object.defineProperty(target, 'matchMedia', { value: undefined, configurable: true, writable: true });
    }
  });

  async function openApp(url: string) {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  const links = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a'));
  const themeButton = (root: HTMLElement, label: string) =>
    root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  it('Navigation marks the current page: only Loans is active on the Loans page', async () => {
    const fixture = await openApp('/loans');

    const current = links(fixture.nativeElement)
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent?.trim());
    expect(current).toEqual(['Loans']);
  });

  it('marks History, not Loans, on the History page', async () => {
    const fixture = await openApp('/loans/history');

    const current = links(fixture.nativeElement)
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent?.trim());
    expect(current).toEqual(['History']);
  });

  it('Switch to dark on a light system: the dark theme applies on this and every other page', async () => {
    setSystemTheme(false);
    const fixture = await openApp('/drones');
    const root = fixture.nativeElement as HTMLElement;
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(themeButton(root, 'Light theme').getAttribute('aria-pressed')).toBe('true');

    themeButton(root, 'Dark theme').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(themeButton(root, 'Dark theme').getAttribute('aria-pressed')).toBe('true');
    expect(themeButton(root, 'Light theme').getAttribute('aria-pressed')).toBe('false');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    await TestBed.inject(Router).navigateByUrl('/student-groups');
    fixture.detectChanges();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
