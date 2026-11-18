import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from '../../app';
import { THEME_FADE_CLASS, THEME_STORAGE_KEY, ThemeService } from './theme.service';

/** A stand-in for `matchMedia('(prefers-color-scheme: dark)')` whose setting the test can change. */
class FakeSystemSetting {
  matches: boolean;
  private readonly listeners: ((event: { matches: boolean }) => void)[] = [];

  constructor(dark: boolean) {
    this.matches = dark;
  }

  addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    this.listeners.push(listener);
  }

  /** The user switches the operating system between light and dark. */
  switchTo(dark: boolean): void {
    this.matches = dark;
    this.listeners.forEach((listener) => listener({ matches: dark }));
  }
}

/** Makes `matchMedia` answer with the given system setting, or removes it (`undefined`). */
function installSystemSetting(setting: FakeSystemSetting | undefined): void {
  const matchMedia = setting ? () => setting : undefined;
  for (const target of [globalThis, window, document.defaultView]) {
    Object.defineProperty(target, 'matchMedia', {
      value: matchMedia,
      configurable: true,
      writable: true,
    });
  }
}

const isDark = () => document.documentElement.classList.contains('dark');

/** Starts the service like a fresh page load and lets its effect apply the theme. */
function startApp(): ThemeService {
  TestBed.resetTestingModule();
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

describe('ThemeService (ui-theme)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => installSystemSetting(undefined));

  describe('Theme follows the system setting', () => {
    it('shows the Latte theme when the system prefers light and nothing was chosen', () => {
      installSystemSetting(new FakeSystemSetting(false));

      const service = startApp();

      expect(service.theme()).toBe('light');
      expect(isDark()).toBe(false);
    });

    it('shows the Macchiato theme when the system prefers dark and nothing was chosen', () => {
      installSystemSetting(new FakeSystemSetting(true));

      const service = startApp();

      expect(service.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });

    it('follows a change of the system setting while the app is open', () => {
      const system = new FakeSystemSetting(false);
      installSystemSetting(system);
      const service = startApp();
      expect(isDark()).toBe(false);

      system.switchTo(true);
      TestBed.tick();

      expect(service.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });

    it('shows the light theme where matchMedia is not available', () => {
      installSystemSetting(undefined);

      expect(startApp().theme()).toBe('light');
      expect(isDark()).toBe(false);
    });
  });

  describe('Choose the theme manually', () => {
    it('shows the chosen dark theme on a system that prefers light', () => {
      installSystemSetting(new FakeSystemSetting(false));
      const service = startApp();

      service.choose('dark');
      TestBed.tick();

      expect(service.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });

    it('keeps the choice when the page is reloaded', () => {
      installSystemSetting(new FakeSystemSetting(false));
      startApp().choose('dark');

      const reloaded = startApp();

      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(reloaded.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });

    it('keeps the chosen light theme when the system changes to dark', () => {
      const system = new FakeSystemSetting(false);
      installSystemSetting(system);
      const service = startApp();
      service.choose('light');

      system.switchTo(true);
      TestBed.tick();

      expect(service.theme()).toBe('light');
      expect(isDark()).toBe(false);
    });

    it.each(['blue', '', 'DARK'])(
      'uses the system setting when the stored choice is "%s"',
      (stored) => {
        localStorage.setItem(THEME_STORAGE_KEY, stored);
        installSystemSetting(new FakeSystemSetting(true));

        const service = startApp();

        expect(service.theme()).toBe('dark');
        expect(isDark()).toBe(true);
      },
    );

    it('still switches the theme when the storage is blocked', () => {
      installSystemSetting(new FakeSystemSetting(false));
      const service = startApp();
      const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });

      service.choose('dark');
      TestBed.tick();
      blocked.mockRestore();

      expect(service.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });
  });
});

/** The inline script in index.html applies the same rule before Angular starts (no flash). */
describe('Theme script in index.html', () => {
  const script = /<script>([\s\S]*?)<\/script>/.exec(readFileSync('src/index.html', 'utf8'))?.[1];

  const runScript = () => new Function(script ?? '')();

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => installSystemSetting(undefined));

  it('exists', () => {
    expect(script).toBeDefined();
  });

  it.each([
    [null, false, false],
    [null, true, true],
    ['dark', false, true],
    ['light', true, false],
    ['blue', true, true],
    ['blue', false, false],
  ])('stored %s with system dark=%s gives dark=%s', (stored, systemDark, expectedDark) => {
    if (stored !== null) {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
    }
    installSystemSetting(new FakeSystemSetting(systemDark));

    runScript();

    expect(isDark()).toBe(expectedDark);
  });

  it('does not fail where matchMedia is missing', () => {
    installSystemSetting(undefined);

    expect(runScript).not.toThrow();
    expect(isDark()).toBe(false);
  });
});

/** ui-theme: Fade between themes. */
describe('ThemeService: Fade between themes (ui-theme)', () => {
  /** Answers each media query on its own: light system theme, reduced motion as given. */
  function installMedia(reducedMotion: boolean): void {
    const matchMedia = (query: string) => ({
      matches: query.includes('reduced-motion') ? reducedMotion : false,
      addEventListener: () => undefined,
    });
    for (const target of [globalThis, window, document.defaultView]) {
      Object.defineProperty(target, 'matchMedia', {
        value: matchMedia,
        configurable: true,
        writable: true,
      });
    }
  }

  /**
   * jsdom has no view transitions. The stand-in records whether the fade class was set when the
   * old picture was taken, runs the update, and finishes when `finish()` is called.
   */
  function stubViewTransitions() {
    let finish = () => undefined as void;
    const fadeClassAtStart: boolean[] = [];
    const start = vi.fn((update: () => void) => {
      fadeClassAtStart.push(document.documentElement.classList.contains(THEME_FADE_CLASS));
      update();
      const finished = new Promise<void>((resolve) => (finish = resolve));
      return { finished, ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
    return { start, fadeClassAtStart, finish: () => finish() };
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', THEME_FADE_CLASS);
  });

  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    installSystemSetting(undefined);
  });

  it('Choose the dark theme: the page fades in one view transition, the fade class is set only while it runs', async () => {
    installMedia(false);
    const transitions = stubViewTransitions();
    const service = startApp();

    service.choose('dark');
    TestBed.tick();

    expect(transitions.start).toHaveBeenCalledTimes(1);
    expect(transitions.fadeClassAtStart).toEqual([true]);
    expect(isDark()).toBe(true);

    transitions.finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(document.documentElement.classList.contains(THEME_FADE_CLASS)).toBe(false);
  });

  it('Reduced motion: the theme changes at once without a view transition', () => {
    installMedia(true);
    const transitions = stubViewTransitions();
    const service = startApp();

    service.choose('dark');
    TestBed.tick();

    expect(transitions.start).not.toHaveBeenCalled();
    expect(isDark()).toBe(true);
  });

  it('changes at once where the browser has no view transitions', () => {
    installMedia(false);
    const service = startApp();

    service.choose('dark');
    TestBed.tick();

    expect(isDark()).toBe(true);
  });

  it('Page load: the stored dark theme is shown without a fade', () => {
    installMedia(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const transitions = stubViewTransitions();

    startApp();

    expect(transitions.start).not.toHaveBeenCalled();
    expect(isDark()).toBe(true);
  });

  it('marks the chosen theme button with one highlight that the fade moves along', async () => {
    installMedia(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const highlighted = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="group"] button'))
        .filter((button) => button.querySelector('.theme-highlight'))
        .map((button) => button.getAttribute('aria-label'));
    expect(highlighted()).toEqual(['Light theme']);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Dark theme"]')!
      .click();
    await fixture.whenStable();

    expect(highlighted()).toEqual(['Dark theme']);
    const styles = readFileSync('src/styles.css', 'utf8');
    expect(styles).toMatch(/\.theme-highlight\s*\{\s*view-transition-name:\s*theme-highlight;/);
    // One crossfade for the whole page, under 300 ms.
    expect(styles).toMatch(
      /\.theme-transition \.site-header,\s*\.theme-transition \.page-content\s*\{\s*view-transition-name:\s*none;/,
    );
    expect(styles).toMatch(
      /\.theme-transition::view-transition-new\(\*\)\s*\{\s*animation-duration:\s*250ms;/,
    );
  });
});
