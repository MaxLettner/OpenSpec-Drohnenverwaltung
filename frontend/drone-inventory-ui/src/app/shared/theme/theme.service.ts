import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

/** The two themes: Catppuccin Latte (light) and Catppuccin Macchiato (dark). */
export type Theme = 'light' | 'dark';

/** The chosen theme, or `system` as long as the user has not chosen one. */
export type ThemePreference = Theme | 'system';

/** The `localStorage` key of the chosen theme; the inline script in `index.html` reads the same key. */
export const THEME_STORAGE_KEY = 'drone-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Set on `<html>` while the theme fades; `styles.css` makes the whole page one crossfade. */
export const THEME_FADE_CLASS = 'theme-transition';

/**
 * Decides which theme is shown and applies it as the `dark` class on `<html>` (ui-theme).
 * The theme follows the system setting until the user chooses one; the choice is kept in
 * `localStorage`. Every browser API is guarded: where it is missing, blocked or holds an
 * invalid value, the system setting (and, without it, the light theme) is used.
 * A change of theme fades in a view transition (ui-theme "Fade between themes", design D4),
 * except on the first application, for reduced motion and where the browser cannot.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly systemQuery = this.document.defaultView?.matchMedia?.(DARK_QUERY);

  private readonly systemDark = signal(this.systemQuery?.matches ?? false);
  private readonly chosen = signal<Theme | null>(this.readStoredTheme());

  /** The theme that is shown. */
  readonly theme = computed<Theme>(() => this.chosen() ?? (this.systemDark() ? 'dark' : 'light'));

  constructor() {
    this.systemQuery?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    // The first run only confirms what the inline script in index.html already showed.
    let first = true;
    effect(() => {
      const dark = this.theme() === 'dark';
      if (first) {
        first = false;
        this.apply(dark);
      } else {
        this.fadeTo(dark);
      }
    });
  }

  /** Shows the theme from now on, overriding the system setting, and remembers it. */
  choose(theme: Theme): void {
    this.chosen.set(theme);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage is blocked (private mode): the choice only lasts until the page is closed.
    }
  }

  private apply(dark: boolean): void {
    this.document.documentElement.classList.toggle('dark', dark);
  }

  private fadeTo(dark: boolean): void {
    const reducedMotion = this.document.defaultView?.matchMedia?.(REDUCED_MOTION_QUERY).matches;
    if (!this.document.startViewTransition || reducedMotion) {
      this.apply(dark);
      return;
    }

    const root = this.document.documentElement;
    root.classList.add(THEME_FADE_CLASS);
    this.document
      .startViewTransition(() => this.apply(dark))
      .finished.finally(() => root.classList.remove(THEME_FADE_CLASS));
  }

  private readStoredTheme(): Theme | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }
}
