import {afterEach, describe, expect, it} from 'vitest';
import '../css/theme.css';
import tokens from '../src/tokens.json';

const root = document.documentElement;

/** Resolves a CSS value through a probe element and returns the computed property. */
function computed(prop: string, value: string, attrs: Record<string, string> = {}) {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.style.setProperty(prop, value);
  document.body.append(el);
  const result = getComputedStyle(el).getPropertyValue(prop);
  el.remove();
  return result;
}

/** Normalizes any CSS color to the browser's computed rgb() form. */
const rgb = (color: string) => computed('color', color);

type Scheme = Record<string, string>;

/** Follows palette and color-role references in tokens.json down to a hex color. */
function expectedHex(value: string, scheme: Scheme): string {
  const ref = /^var\((--md-ref-palette-[\w-]+)\)$/.exec(value)?.[1];
  if (ref) return tokens.ref[ref as keyof typeof tokens.ref];
  const role = /^var\((--md-sys-color-[\w-]+)\)$/.exec(value)?.[1];
  if (role) return expectedHex(scheme[role], scheme);
  return value;
}

afterEach(() => {
  delete root.dataset.theme;
});

describe('color tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`every ${theme} color role is a valid color matching the Compose palette`, () => {
      root.dataset.theme = theme;
      const scheme: Scheme = tokens.color[theme];
      const style = getComputedStyle(root);
      expect(Object.keys(scheme).length).toBeGreaterThan(40);
      for (const [name, value] of Object.entries(scheme)) {
        const actual = style.getPropertyValue(name).trim();
        const expected = expectedHex(value, scheme);
        expect(CSS.supports('color', actual), `${name}: ${actual}`).toBe(true);
        expect(expected, name).toMatch(/^#[0-9a-f]{6}$/);
        expect(rgb(actual), name).toBe(rgb(expected));
      }
    });
  }

  it('dark and light primaries differ', () => {
    root.dataset.theme = 'light';
    const light = rgb('var(--md-sys-color-primary)');
    root.dataset.theme = 'dark';
    expect(rgb('var(--md-sys-color-primary)')).not.toBe(light);
  });
});

describe('system tokens', () => {
  it('every system token is defined on :root', () => {
    const style = getComputedStyle(root);
    for (const name of Object.keys(tokens.sys)) {
      expect(style.getPropertyValue(name).trim(), name).not.toBe('');
    }
  });

  it('expressive spring easings are valid CSS', () => {
    for (const speed of ['fast', 'default', 'slow']) {
      for (const kind of ['spatial', 'effects']) {
        const base = `--md-sys-motion-spring-${speed}-${kind}`;
        expect(computed('transition-timing-function', `var(${base}-easing)`), base).toMatch(
          /^linear\(/,
        );
        expect(computed('transition-duration', `var(${base}-duration)`), base).toMatch(/s$/);
      }
    }
  });
});

describe('typefaces', () => {
  // Display styles use the brand typeface, body styles the plain one. Checking
  // one of each covers both stacks.
  const scales = ['display-large', 'body-large'];

  /** First family of a typescale font for `lang`, or a mismatch marker if the two typefaces differ. */
  const firstFamily = (lang?: string) => {
    const families = scales.map((scale) =>
      computed('font-family', `var(--md-sys-typescale-${scale}-font)`, lang ? {lang} : {})
        .split(',')[0]
        .trim()
        .replace(/["']/g, ''),
    );
    return families.every((f) => f === families[0]) ? families[0] : families.join(' != ');
  };

  it('English and unmarked text use Google Sans Flex', () => {
    expect(firstFamily()).toBe('Google Sans Flex');
    expect(firstFamily('en')).toBe('Google Sans Flex');
    expect(firstFamily('en-GB')).toBe('Google Sans Flex');
  });

  it('other languages use the Noto Sans family', () => {
    for (const lang of ['bn', 'fr', 'ar', 'hi', 'zh-CN']) {
      expect(firstFamily(lang), lang).toBe('Noto Sans');
    }
  });

  it('Chinese, Japanese and Korean put their regional Noto family first', () => {
    expect(firstFamily('ja')).toBe('Noto Sans JP');
    expect(firstFamily('ko')).toBe('Noto Sans KR');
    expect(firstFamily('zh-TW')).toBe('Noto Sans TC');
    expect(firstFamily('zh-Hant')).toBe('Noto Sans TC');
    expect(firstFamily('zh-HK')).toBe('Noto Sans HK');
  });

  it('English inside another language switches back to Google Sans Flex', () => {
    const outer = document.createElement('div');
    outer.lang = 'bn';
    const inner = document.createElement('span');
    inner.lang = 'en';
    inner.style.fontFamily = 'var(--md-sys-typescale-body-large-font)';
    outer.append(inner);
    document.body.append(outer);
    expect(getComputedStyle(inner).fontFamily.split(',')[0].replace(/["']/g, '')).toBe(
      'Google Sans Flex',
    );
    outer.remove();
  });
});
