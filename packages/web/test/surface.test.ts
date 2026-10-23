import {afterEach, describe, expect, it, vi} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/surface/surface.js';
import {SURFACE_COLORS, SURFACE_SHAPES, tonalTintPercent, type RxSurface} from '../src/index.js';

// Copied from ColorScheme.contentColorFor in Compose, independently of SURFACE_COLORS.
const COMPOSE_CONTENT_COLOR: Record<string, string> = {
  primary: 'on-primary',
  secondary: 'on-secondary',
  tertiary: 'on-tertiary',
  background: 'on-background',
  error: 'on-error',
  'primary-container': 'on-primary-container',
  'secondary-container': 'on-secondary-container',
  'tertiary-container': 'on-tertiary-container',
  'error-container': 'on-error-container',
  'inverse-surface': 'inverse-on-surface',
  surface: 'on-surface',
  'surface-variant': 'on-surface-variant',
  'surface-bright': 'on-surface',
  'surface-container': 'on-surface',
  'surface-container-high': 'on-surface',
  'surface-container-highest': 'on-surface',
  'surface-container-low': 'on-surface',
  'surface-container-lowest': 'on-surface',
  'surface-dim': 'on-surface',
  'primary-fixed': 'on-primary-fixed',
  'primary-fixed-dim': 'on-primary-fixed',
  'secondary-fixed': 'on-secondary-fixed',
  'secondary-fixed-dim': 'on-secondary-fixed',
  'tertiary-fixed': 'on-tertiary-fixed',
  'tertiary-fixed-dim': 'on-tertiary-fixed',
};

const root = document.documentElement;

/** Resolves any CSS color to [r, g, b] through the browser. */
function rgb(color: string): number[] {
  const probe = document.createElement('i');
  probe.style.color = color;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  if (srgb) return srgb.slice(1, 4).map((n) => Math.round(Number(n) * 255));
  return value
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number);
}

const background = (s: RxSurface) =>
  rgb(getComputedStyle(s.shadowRoot!.querySelector('.surface')!).backgroundColor);

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const surfaces = [...document.querySelectorAll('rx-surface')] as RxSurface[];
  for (const s of surfaces) await s.updateComplete;
  // Nested surfaces settle in a second pass.
  for (const s of surfaces) await s.updateComplete;
  return surfaces;
}

/** Expected sRGB blend of surface-tint over a color, as Compose's compositeOver. */
function tinted(base: string, percent: number) {
  const a = percent / 100;
  const tint = rgb('var(--md-sys-color-surface-tint)');
  return rgb(base).map((c, i) => Math.round(tint[i] * a + c * (1 - a)));
}

const close = (actual: number[], expected: number[]) =>
  actual.forEach((c, i) =>
    expect(Math.abs(c - expected[i]), `channel ${i}`).toBeLessThanOrEqual(1),
  );

afterEach(() => {
  document.body.replaceChildren();
  delete root.dataset.theme;
});

describe('colors', () => {
  it('defaults to surface with on-surface content', async () => {
    root.dataset.theme = 'light';
    const [s] = await mount('<rx-surface>Hi</rx-surface>');
    expect(background(s)).toEqual(rgb('var(--md-sys-color-surface)'));
    expect(rgb(getComputedStyle(s).color)).toEqual(rgb('var(--md-sys-color-on-surface)'));
  });

  for (const theme of ['light', 'dark']) {
    it(`pairs every color role with its Compose content color (${theme})`, async () => {
      root.dataset.theme = theme;
      expect(Object.keys(SURFACE_COLORS).sort()).toEqual(Object.keys(COMPOSE_CONTENT_COLOR).sort());
      for (const [bg, fg] of Object.entries(COMPOSE_CONTENT_COLOR)) {
        const [s] = await mount(`<rx-surface color="${bg}">x</rx-surface>`);
        expect(background(s), bg).toEqual(rgb(`var(--md-sys-color-${bg})`));
        expect(rgb(getComputedStyle(s).color), bg).toEqual(rgb(`var(--md-sys-color-${fg})`));
      }
    });
  }

  it('takes custom colors', async () => {
    const [s] = await mount(
      '<rx-surface style="--rx-surface-color: rgb(1, 2, 3); --rx-surface-content-color: rgb(4, 5, 6)">x</rx-surface>',
    );
    expect(background(s)).toEqual([1, 2, 3]);
    expect(rgb(getComputedStyle(s).color)).toEqual([4, 5, 6]);
  });
});

describe('shape', () => {
  it('uses the shape tokens', async () => {
    for (const shape of SURFACE_SHAPES.filter(
      (x) => !x.endsWith('-start') && !x.endsWith('-end'),
    )) {
      const [s] = await mount(`<rx-surface shape="${shape}">x</rx-surface>`);
      const probe = document.createElement('div');
      probe.style.borderRadius = `var(--md-sys-shape-corner-${shape})`;
      document.body.append(probe);
      expect(getComputedStyle(s).borderRadius, shape).toBe(getComputedStyle(probe).borderRadius);
    }
  });

  it('rounds the start or end corners following the text direction', async () => {
    const [s] = await mount('<rx-surface shape="large-start">x</rx-surface>');
    const surface = s.shadowRoot!.querySelector('.surface')!;
    expect(getComputedStyle(surface).borderTopLeftRadius).toBe('16px');
    expect(getComputedStyle(surface).borderTopRightRadius).toBe('0px');
    root.dir = 'rtl';
    expect(getComputedStyle(surface).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(surface).borderTopRightRadius).toBe('16px');
    root.removeAttribute('dir');
  });

  it('clips its content to the shape', async () => {
    const [s] = await mount('<rx-surface shape="large">x</rx-surface>');
    const content = s.shadowRoot!.querySelector('.content')!;
    expect(getComputedStyle(content).overflow).toBe('hidden');
    expect(getComputedStyle(content).borderRadius).toBe('16px');
  });
});

describe('elevation', () => {
  it('draws a shadow for the elevation level', async () => {
    const [s] = await mount('<rx-surface elevation="3">x</rx-surface>');
    const shadow = s.shadowRoot!.querySelector('rx-elevation');
    expect(shadow?.level).toBe(3);
    const [flat] = await mount('<rx-surface>x</rx-surface>');
    expect(flat.shadowRoot!.querySelector('rx-elevation')).toBeNull();
  });

  it('tints a surface by tonal elevation with the Compose formula', async () => {
    root.dataset.theme = 'light';
    expect(tonalTintPercent(0)).toBe(0);
    expect(tonalTintPercent(3)).toBeCloseTo(4.5 * Math.log(4) + 2);
    const [s] = await mount('<rx-surface tonal-elevation="2">x</rx-surface>');
    close(background(s), tinted('var(--md-sys-color-surface)', tonalTintPercent(3)));
  });

  it('adds up tonal elevation through nested surfaces', async () => {
    root.dataset.theme = 'light';
    const [, inner] = await mount(
      '<rx-surface tonal-elevation="2"><rx-surface tonal-elevation="1">x</rx-surface></rx-surface>',
    );
    // 3dp + 1dp.
    close(background(inner), tinted('var(--md-sys-color-surface)', tonalTintPercent(4)));
  });

  it('only tints the plain surface color', async () => {
    root.dataset.theme = 'light';
    const [s] = await mount(
      '<rx-surface color="primary-container" tonal-elevation="5">x</rx-surface>',
    );
    expect(background(s)).toEqual(rgb('var(--md-sys-color-primary-container)'));
  });
});

describe('border', () => {
  it('draws a border inside the shape without moving the content', async () => {
    const [s] = await mount(
      '<rx-surface style="--rx-surface-border: 1px solid rgb(9, 9, 9)"><div id="c" style="height: 20px"></div></rx-surface>',
    );
    const surface = s.shadowRoot!.querySelector('.surface')!;
    expect(getComputedStyle(surface).borderTopWidth).toBe('1px');
    expect(rgb(getComputedStyle(surface).borderTopColor)).toEqual([9, 9, 9]);
    const content = document.getElementById('c')!.getBoundingClientRect();
    expect(content.top).toBe(s.getBoundingClientRect().top);
  });
});

describe('interactive', () => {
  it('is plain content by default', async () => {
    const [s] = await mount('<rx-surface>x</rx-surface>');
    expect(s.hasAttribute('role')).toBe(false);
    expect(s.hasAttribute('tabindex')).toBe(false);
    expect(s.shadowRoot!.querySelector('rx-ripple')).toBeNull();
  });

  it('becomes a focusable button with a ripple and focus ring', async () => {
    const [s] = await mount('<rx-surface interactive>Open</rx-surface>');
    expect(s.getAttribute('role')).toBe('button');
    expect(s.tabIndex).toBe(0);
    expect(s.shadowRoot!.querySelector('rx-ripple')).not.toBeNull();
    const ring = s.shadowRoot!.querySelector('rx-focus-ring')!;
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(s);
    await ring.updateComplete;
    expect(ring.visible).toBe(true);
  });

  it('clicks with the mouse, Enter and Space', async () => {
    const [s] = await mount('<rx-surface interactive>Open</rx-surface>');
    const onClick = vi.fn();
    s.addEventListener('click', onClick);
    await userEvent.click(s);
    s.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('marks selected surfaces as pressed', async () => {
    const [s] = await mount('<rx-surface interactive selected>Open</rx-surface>');
    expect(s.getAttribute('aria-pressed')).toBe('true');
    s.selected = false;
    await s.updateComplete;
    expect(s.hasAttribute('aria-pressed')).toBe(false);
  });

  it('ignores clicks and focus while disabled', async () => {
    const [s] = await mount('<rx-surface interactive disabled>Open</rx-surface>');
    const onClick = vi.fn();
    s.addEventListener('click', onClick);
    expect(s.getAttribute('aria-disabled')).toBe('true');
    expect(s.hasAttribute('tabindex')).toBe(false);
    await userEvent.click(s, {force: true});
    expect(onClick).not.toHaveBeenCalled();
    expect(s.shadowRoot!.querySelector('rx-ripple')!.disabled).toBe(true);
  });
});
