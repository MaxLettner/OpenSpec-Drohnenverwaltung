import { readFileSync } from 'node:fs';

/** The global stylesheet; `ng test` runs from the project directory. */
const styles = readFileSync('src/styles.css', 'utf8');

/** The body of the reduced-motion block, where every effect is switched off. */
function reducedMotion(): string {
  const reduced = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(styles);
  expect(reduced, 'reduced-motion rule in styles.css').not.toBeNull();
  return reduced![1];
}

/** The declarations of the first rule with exactly this selector outside any media block. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`).exec(styles);
  expect(match, `rule ${selector}`).not.toBeNull();
  return match![1];
}

/** ui-theme "Subtle motion" (add-motion-and-loan-links design D3). */
describe('ui-theme: Subtle motion of dialogs and buttons', () => {
  it('fades and scales a dialog in within 300 ms and blurs the backdrop', () => {
    const dialog = rule('.cdk-dialog-container');
    expect(dialog).toMatch(/animation:\s*(\d+)ms ease-out both dialog-in/);
    expect(Number(/(\d+)ms/.exec(dialog)![1])).toBeLessThanOrEqual(300);
    expect(styles).toMatch(
      /@keyframes dialog-in\s*\{\s*from\s*\{[^}]*opacity:\s*0;[^}]*scale:\s*0\.96/,
    );
    expect(rule('.cdk-overlay-dark-backdrop')).toMatch(/backdrop-filter:\s*blur\(2px\)/);
  });

  it('shrinks a pressed button a little within 300 ms', () => {
    expect(rule('button:not(:disabled):active,\na[hlmBtn]:active')).toMatch(/scale:\s*0\.97/);
    const transition = rule('button,\n[hlmBtn]');
    expect(transition).toContain('scale');
    expect(Number(/transition-duration:\s*(\d+)ms/.exec(transition)![1])).toBeLessThanOrEqual(300);
  });

  it('Reduced motion: dialogs appear and buttons stay at their size at once', () => {
    const reduced = reducedMotion();
    expect(reduced).toMatch(/\.cdk-dialog-container\s*\{\s*animation:\s*none/);
    expect(reduced).toMatch(/a\[hlmBtn\]:active\s*\{\s*scale:\s*none/);
  });
});
