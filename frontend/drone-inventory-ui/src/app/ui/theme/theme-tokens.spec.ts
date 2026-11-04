import { readFileSync } from 'node:fs';

/** The global stylesheet; `ng test` runs from the project directory. */
const styles = readFileSync('src/styles.css', 'utf8');

/** An sRGB colour with gamma-encoded channels 0..1 and an alpha 0..1. */
type Rgba = { r: number; g: number; b: number; a: number };

/** Reads the custom properties declared in the rule with exactly this selector. */
function readTokens(selector: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const rule = new RegExp(`(^|\\n)${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(styles);
  expect(rule, `rule ${selector} exists in styles.css`).not.toBeNull();
  for (const match of rule![2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

/** The tokens of a theme: the light tokens, overridden by the dark ones for Macchiato. */
function themeTokens(dark: boolean): Map<string, string> {
  const tokens = readTokens(':root');
  if (dark) {
    readTokens(':root.dark').forEach((value, name) => tokens.set(name, value));
  }
  return tokens;
}

/** Resolves `var(--x)` references so that a token yields a colour literal. */
function resolve(tokens: Map<string, string>, name: string): string {
  let value = tokens.get(name);
  expect(value, `token ${name} is defined`).toBeDefined();
  for (let depth = 0; depth < 5; depth++) {
    const reference = /^var\((--[\w-]+)\)$/.exec(value!);
    if (!reference) {
      break;
    }
    value = tokens.get(reference[1]);
    expect(value, `token ${reference?.[1]} is defined`).toBeDefined();
  }
  return value!;
}

function encode(linear: number): number {
  const clamped = Math.min(1, Math.max(0, linear));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  }
  const oklch = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/.exec(value);
  if (!oklch) {
    throw new Error(`Unsupported colour: ${value}`);
  }
  const [lightness, chroma, hue] = [Number(oklch[1]), Number(oklch[2]), (Number(oklch[3]) * Math.PI) / 180];
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = Math.pow(lightness + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(lightness - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(lightness - 0.0894841775 * a - 1.291485548 * b, 3);
  const alpha = oklch[4] === undefined ? 1 : Number(oklch[4]) / (oklch[5] ? 100 : 1);
  return {
    r: encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    a: alpha,
  };
}

/** Paints `top` with the extra opacity `alpha` over the opaque colour `below` (as the browser does). */
function over(top: Rgba, alpha: number, below: Rgba): Rgba {
  const a = top.a * alpha;
  return {
    r: top.r * a + below.r * (1 - a),
    g: top.g * a + below.g * (1 - a),
    b: top.b * a + below.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgba): number {
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(foreground: Rgba, background: Rgba): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const LATTE = { mauve: '#8839ef', red: '#d20f39', green: '#40a02b', peach: '#fe640b' };
const MACCHIATO = { mauve: '#c6a0f6', red: '#ed8796', green: '#a6da95', peach: '#f5a97f' };

describe('ui-theme: Accents come from the active flavor', () => {
  it.each([
    ['Latte (light theme)', false, LATTE],
    ['Macchiato (dark theme)', true, MACCHIATO],
  ])('uses the %s accents for primary, focus ring, error, available and loaned', (_name, dark, flavor) => {
    const tokens = themeTokens(dark);
    expect(resolve(tokens, '--primary')).toBe(flavor.mauve);
    expect(resolve(tokens, '--ring')).toBe(flavor.mauve);
    expect(resolve(tokens, '--destructive')).toBe(flavor.red);
    expect(resolve(tokens, '--success')).toBe(flavor.green);
    expect(resolve(tokens, '--warning')).toBe(flavor.peach);
  });

  it('keeps the surfaces neutral instead of using Catppuccin base colours', () => {
    for (const dark of [false, true]) {
      const tokens = themeTokens(dark);
      for (const surface of ['--background', '--card', '--foreground', '--muted-foreground']) {
        expect(resolve(tokens, surface)).toMatch(/^oklch\(/);
      }
    }
  });
});

describe('ui-theme: Readable text in both themes', () => {
  it.each([
    ['Latte (light theme)', false],
    ['Macchiato (dark theme)', true],
  ])('gives every text of the %s a contrast of at least 4.5:1', (_name, dark) => {
    const tokens = themeTokens(dark);
    const color = (name: string) => parseColor(resolve(tokens, name));
    const background = color('--background');
    const card = color('--card');

    // [description, foreground, background]
    const pairs: [string, Rgba, Rgba][] = [
      ['table and body text', color('--foreground'), background],
      ['card text', color('--card-foreground'), card],
      ['muted text on the page', color('--muted-foreground'), background],
      ['muted text on a card', color('--muted-foreground'), card],
      ['primary button', color('--primary-foreground'), color('--primary')],
      ['link and active navigation on the page', color('--primary'), background],
      ['link on a card', color('--primary'), card],
      ['input text', color('--foreground'), dark ? over(color('--input'), 0.3, background) : background],
      ['error message on the page', color('--destructive'), background],
      ['error message on a card', color('--destructive'), card],
      ['destructive badge', color('--destructive'), over(color('--destructive'), dark ? 0.2 : 0.1, background)],
      ['Available badge', color('--foreground'), over(color('--success'), 0.2, card)],
      ['Loaned badge', color('--foreground'), over(color('--warning'), 0.2, card)],
    ];

    for (const [description, foreground, surface] of pairs) {
      expect(contrast(foreground, surface), description).toBeGreaterThanOrEqual(4.5);
    }
  });
});
