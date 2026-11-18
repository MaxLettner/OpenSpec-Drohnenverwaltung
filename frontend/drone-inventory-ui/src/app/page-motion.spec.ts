import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { readFileSync } from 'node:fs';
import { App } from './app';
import { appConfig } from './app.config';

/** The global stylesheet; `ng test` runs from the project directory. */
const styles = readFileSync('src/styles.css', 'utf8');

/**
 * jsdom has no view transitions. This stand-in runs the update at once and records the call,
 * so the test sees whether a navigation went through a view transition.
 */
function stubViewTransitions(): ReturnType<typeof vi.fn> {
  const start = vi.fn((update: () => Promise<void> | void) => {
    const done = Promise.resolve(update());
    return {
      updateCallbackDone: done,
      ready: done,
      finished: done,
      skipTransition: () => undefined,
    };
  });
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
  return start;
}

describe('ui-theme: Animate page changes', () => {
  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  it('Switch to another page: the change runs in a view transition and the highlight moves to the new entry', async () => {
    const startViewTransition = stubViewTransitions();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const highlighted = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'))
        .filter((link) => link.querySelector('.nav-highlight'))
        .map((link) => link.textContent?.trim());

    await router.navigateByUrl('/drones');
    await fixture.whenStable();
    expect(highlighted()).toEqual(['Drones']);
    startViewTransition.mockClear();

    await router.navigateByUrl('/loans');
    await fixture.whenStable();

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    // Exactly one highlight, so the browser can move it from the old entry to the new one.
    expect(highlighted()).toEqual(['Loans']);
  });

  it('names the parts the browser animates: header, highlight and page content', () => {
    for (const [selector, name] of [
      ['.site-header', 'site-header'],
      ['.nav-highlight', 'nav-highlight'],
      ['.page-content', 'page-content'],
    ]) {
      expect(styles).toMatch(
        new RegExp(`\\${selector}\\s*\\{\\s*view-transition-name:\\s*${name};`),
      );
    }
  });

  it('moves the highlight as a solid rounded box instead of stretching a picture of it', () => {
    const group = /::view-transition-group\(nav-highlight\)\s*\{([^}]*)\}/.exec(styles)?.[1] ?? '';
    expect(group).toMatch(/border-radius:\s*var\(--radius-md\)/);
    expect(group).toMatch(/background:\s*color-mix\(in oklab, var\(--primary\) 15%, transparent\)/);
    expect(styles).toMatch(
      /::view-transition-old\(nav-highlight\),\s*::view-transition-new\(nav-highlight\)\s*\{\s*display:\s*none;/,
    );
  });

  it('keeps the page width when the new page is shorter or longer, so nothing slides sideways', () => {
    expect(styles).toMatch(/\bhtml\s*\{\s*overflow-y:\s*scroll;/);
  });

  it('keeps every page change animation under 300 ms', () => {
    const rules = styles.match(/::view-transition-[\w-]+\([\w-]+\)\s*\{[^}]*\}/g) ?? [];
    const durations = rules.flatMap((rule) =>
      [...rule.matchAll(/(\d+)ms/g)].map((m) => Number(m[1])),
    );

    expect(durations.length).toBeGreaterThan(0);
    expect(Math.max(...durations)).toBeLessThan(300);
  });

  it('Reduced motion: every view transition animation is switched off', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(styles);

    expect(reduced, 'reduced-motion rule in styles.css').not.toBeNull();
    for (const part of [
      '::view-transition-group(*)',
      '::view-transition-old(*)',
      '::view-transition-new(*)',
    ]) {
      expect(reduced![1]).toContain(part);
    }
    expect(reduced![1]).toMatch(/animation:\s*none\s*!important/);
  });
});
