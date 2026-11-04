import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

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
    Object.defineProperty(target, 'matchMedia', { value: matchMedia, configurable: true, writable: true });
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

    it.each(['blue', '', 'DARK'])('uses the system setting when the stored choice is "%s"', (stored) => {
      localStorage.setItem(THEME_STORAGE_KEY, stored);
      installSystemSetting(new FakeSystemSetting(true));

      const service = startApp();

      expect(service.theme()).toBe('dark');
      expect(isDark()).toBe(true);
    });

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
