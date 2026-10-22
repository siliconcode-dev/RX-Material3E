import {afterEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import tokens from '../../tokens/src/tokens.json';
import {
  SCHEME_VARIANTS,
  applyTheme,
  createScheme,
  removeTheme,
  themeCss,
  type RxTheme,
} from '../src/index.js';

const root = document.documentElement;
const TOKEN_ROLES = Object.keys(tokens.color.light);
const SEED = '#0b57d0';

/** WCAG contrast ratio between two hex colors. */
function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const varOf = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** Normalizes a CSS color through the browser so hex and rgb() compare equal. */
function rgb(color: string) {
  const probe = document.createElement('i');
  probe.style.color = color;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

afterEach(() => {
  removeTheme();
  delete root.dataset.theme;
  document.body.replaceChildren();
});

describe('createScheme', () => {
  for (const variant of SCHEME_VARIANTS) {
    it(`${variant}: covers every token color role with valid hex colors`, () => {
      for (const dark of [false, true]) {
        const scheme = createScheme({source: SEED, variant}, dark);
        for (const role of TOKEN_ROLES) {
          expect(scheme[role as keyof typeof scheme], `${role} dark=${dark}`).toMatch(
            /^#[0-9a-f]{6}$/,
          );
        }
      }
    });
  }

  it('matches material-color-utilities output for a known seed', () => {
    // Regression anchor: tonal spot, 2021 spec, seed #6750a4.
    const scheme = createScheme({source: '#6750a4', spec: '2021'}, false);
    expect(scheme['--md-sys-color-primary']).toBe('#65558f');
    expect(scheme['--md-sys-color-surface']).toBe('#fdf7ff');
  });

  it('adds the dim roles only in the 2025 spec', () => {
    expect(createScheme({source: SEED, spec: '2025'}, false)).toHaveProperty(
      '--md-sys-color-primary-dim',
    );
    expect(createScheme({source: SEED, spec: '2021'}, false)).not.toHaveProperty(
      '--md-sys-color-primary-dim',
    );
  });

  it('light and dark schemes differ', () => {
    const light = createScheme({source: SEED}, false);
    const dark = createScheme({source: SEED}, true);
    expect(light['--md-sys-color-surface']).not.toBe(dark['--md-sys-color-surface']);
  });

  it('meets the minimum text contrast at every level, and 7:1 at high contrast', () => {
    const pairs = [
      ['on-primary', 'primary'],
      ['on-primary-container', 'primary-container'],
      ['on-secondary-container', 'secondary-container'],
      ['on-surface', 'surface'],
      ['on-surface-variant', 'surface-container-highest'],
      ['on-error-container', 'error-container'],
    ];
    for (const spec of ['2021', '2025'] as const) {
      for (const dark of [false, true]) {
        for (const contrast of [0, 0.5, 1]) {
          const s = createScheme({source: SEED, contrast, spec}, dark);
          for (const [fg, bg] of pairs) {
            const ratio = contrastRatio(
              s[`--md-sys-color-${fg}` as const],
              s[`--md-sys-color-${bg}` as const],
            );
            const label = `${fg} on ${bg}, spec ${spec}, dark ${dark}, contrast ${contrast}`;
            expect(ratio, label).toBeGreaterThanOrEqual(contrast === 1 ? 7 : 4.5);
          }
        }
      }
    }
  });

  it('clamps contrast to -1..1 and rejects unknown variants', () => {
    expect(createScheme({source: SEED, contrast: 5}, false)).toEqual(
      createScheme({source: SEED, contrast: 1}, false),
    );
    expect(() => createScheme({source: SEED, variant: 'nope' as never}, false)).toThrow(/nope/);
  });
});

describe('themeCss', () => {
  it('writes light, OS dark and forced dark rules for a selector', () => {
    const css = themeCss({source: SEED}, '.app');
    expect(css).toContain('.app {');
    expect(css).toContain('.app:not([data-theme="light"])');
    expect(css).toContain('.app[data-theme="dark"]');
  });

  it('uses the functional :host form inside shadow roots', () => {
    const css = themeCss({source: SEED}, ':host');
    expect(css).toContain(':host(:not([data-theme="light"]))');
    expect(css).toContain(':host([data-theme="dark"])');
  });
});

describe('applyTheme', () => {
  it('overrides the page colors and follows data-theme', () => {
    const light = createScheme({source: SEED}, false);
    const dark = createScheme({source: SEED}, true);
    const before = varOf(root, '--md-sys-color-primary');

    applyTheme({source: SEED});
    root.dataset.theme = 'light';
    expect(varOf(root, '--md-sys-color-primary')).toBe(light['--md-sys-color-primary']);
    root.dataset.theme = 'dark';
    expect(varOf(root, '--md-sys-color-primary')).toBe(dark['--md-sys-color-primary']);
    expect(getComputedStyle(root).colorScheme).toBe('dark');

    removeTheme();
    expect(varOf(root, '--md-sys-color-primary')).not.toBe(dark['--md-sys-color-primary']);
    root.dataset.theme = 'light';
    expect(rgb(varOf(root, '--md-sys-color-primary'))).toBe(rgb(before));
  });

  it('replaces the previous theme instead of stacking', () => {
    applyTheme({source: SEED});
    applyTheme({source: '#b3261e'});
    root.dataset.theme = 'light';
    expect(document.adoptedStyleSheets).toHaveLength(1);
    expect(varOf(root, '--md-sys-color-primary')).toBe(
      createScheme({source: '#b3261e'}, false)['--md-sys-color-primary'],
    );
  });
});

describe('rx-theme', () => {
  async function mount(attrs: string) {
    document.body.innerHTML = `<rx-theme ${attrs}><p id="child">Hi</p></rx-theme>`;
    const el = document.querySelector('rx-theme') as RxTheme;
    await el.updateComplete;
    return {el, child: document.getElementById('child')!};
  }

  it('themes its children and leaves the rest of the page alone', async () => {
    root.dataset.theme = 'light';
    const {child} = await mount(`source="${SEED}" variant="vibrant"`);
    const expected = createScheme({source: SEED, variant: 'vibrant'}, false);
    expect(varOf(child, '--md-sys-color-primary')).toBe(expected['--md-sys-color-primary']);
    expect(varOf(document.body, '--md-sys-color-primary')).not.toBe(
      expected['--md-sys-color-primary'],
    );
  });

  it('does not affect layout', async () => {
    const {el} = await mount(`source="${SEED}"`);
    expect(getComputedStyle(el).display).toBe('contents');
  });

  it('uses its own theme attribute first', async () => {
    root.dataset.theme = 'light';
    const {child} = await mount(`source="${SEED}" theme="dark"`);
    expect(varOf(child, '--md-sys-color-primary')).toBe(
      createScheme({source: SEED}, true)['--md-sys-color-primary'],
    );
    expect(getComputedStyle(child).colorScheme).toBe('dark');
  });

  it('follows data-theme on <html> when set to system', async () => {
    root.dataset.theme = 'light';
    const {el, child} = await mount(`source="${SEED}"`);
    root.dataset.theme = 'dark';
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;
    expect(varOf(child, '--md-sys-color-primary')).toBe(
      createScheme({source: SEED}, true)['--md-sys-color-primary'],
    );
  });

  it('updates when properties change', async () => {
    root.dataset.theme = 'light';
    const {el, child} = await mount(`source="${SEED}"`);
    el.contrast = 1;
    await el.updateComplete;
    expect(varOf(child, '--md-sys-color-primary')).toBe(
      createScheme({source: SEED, contrast: 1}, false)['--md-sys-color-primary'],
    );
  });

  it('changes nothing without a source', async () => {
    root.dataset.theme = 'light';
    const before = varOf(document.body, '--md-sys-color-primary');
    const {child} = await mount('');
    expect(varOf(child, '--md-sys-color-primary')).toBe(before);
  });
});
