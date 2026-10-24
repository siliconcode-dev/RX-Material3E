import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/fab-menu/fab-menu.js';
import '../src/fab-menu/toggle-fab.js';
import '../src/icon/icon.js';
import type {RxFabMenu, RxFabMenuItem, RxToggleFab} from '../src/fab-menu/index.js';
import type {RxRipple} from '../src/ripple/ripple.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {FloatSpringSpec} from '../src/motion/spring.js';
import {manualFrames} from './helpers/manual-frames.js';
import colorGolden from './motion/golden/color-lerp.json';

/*
 * The test's own copy of Compose's values. ToggleFloatingActionButtonDefaults
 * and the private Fab* values of FloatingActionButtonMenu.kt: each size's
 * starting container (FabBaselineTokens, FabMediumTokens, FabLargeTokens),
 * corner radius (16, 20, 28dp) and icon (24, 28dp, and 36dp for large
 * where the token says 32dp); all end at FabMenuBaselineTokens' 56dp close
 * button, fully round (28dp), with a 20dp icon.
 */
const TOGGLE = {
  baseline: {size: 56, corner: 16, icon: 24},
  medium: {size: 80, corner: 20, icon: 28},
  large: {size: 96, corner: 28, icon: 36},
} as const;
const FINAL = {size: 56, corner: 28, icon: 20};

/*
 * FabMenuPaddingHorizontal 16dp, FabMenuButtonPaddingBottom 16dp,
 * FabMenuPaddingBottom (CloseButtonBetweenSpace) 8dp, and the items:
 * ListItemContainerHeight 56dp (also the minimum width), ListItemBetweenSpace
 * 4dp, ListItemLeadingSpace and ListItemTrailingSpace 24dp,
 * ListItemIconLabelSpace 8dp, 24dp icons.
 */
const MENU = {
  padding: 16,
  buttonBottom: 16,
  aboveButton: 8,
  itemHeight: 56,
  itemSpacing: 4,
  leading: 24,
  trailing: 24,
  iconLabel: 8,
  icon: 24,
};

// The expressive motion scheme: FastSpatial, FastEffects, and SlowEffects
// with the menu's visibilityThreshold of 1.
const fastSpatial = () => new FloatSpringSpec(0.6, 800, 0.01);
const fastEffects = () => new FloatSpringSpec(1, 3800, 0.01);
const stagger = () => new FloatSpringSpec(1, 800, 1);

function springAt(spec: FloatSpringSpec, t: number, from: number, to: number) {
  return t >= spec.getDurationNanos(from, to, 0) ? to : spec.getValueFromNanos(t, from, to, 0);
}

const f32 = Math.fround;
/** Compose's lerp in 32-bit floats. */
const lerp = (a: number, b: number, t: number) => f32(f32(f32(1 - t) * a) + f32(t * b));

/*
 * Compose's Color lerp: both colors to Oklab, the fraction clamped to 0..1,
 * mixed, back to sRGB (Björn Ottosson's matrices, as ColorSpaces.Oklab).
 */
type Rgb = [number, number, number];
const toLinear = (c: number) => (c >= 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92);
const fromLinear = (c: number) => (c >= 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);
function toOklab([r8, g8, b8]: Rgb): Rgb {
  const [r, g, b] = [r8, g8, b8].map((c) => toLinear(c / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab([L, A, B]: Rgb): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.round(Math.min(Math.max(fromLinear(c), 0), 1) * 255)) as Rgb;
}
function colorLerp(a: Rgb, b: Rgb, fraction: number): Rgb {
  const t = Math.min(Math.max(fraction, 0), 1);
  const [x, y] = [toOklab(a), toOklab(b)];
  return fromOklab([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb);
}

/** Any CSS color as 8-bit sRGB, through a canvas. */
function rgb(css: string): Rgb {
  const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true})!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** A color role as 8-bit sRGB. */
function role(name: string): Rgb {
  const probe = document.createElement('i');
  probe.style.color = `var(--md-sys-color-${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return rgb(value);
}

function expectRgb(actual: Rgb, expected: Rgb) {
  for (let i = 0; i < 3; i++) expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(1);
}

const box = (el: Element) => el.getBoundingClientRect();
const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const fabOf = (el: RxToggleFab) => el.shadowRoot!.querySelector('.fab') as HTMLElement;
const itemBox = (el: RxFabMenuItem) => el.shadowRoot!.querySelector('.item') as HTMLElement;
const column = (menu: RxFabMenu) => menu.shadowRoot!.querySelector('.column') as HTMLElement;
/** The icon on show: the default slot's, or the checked one's. */
const shownIcon = (el: RxToggleFab) =>
  [...el.querySelectorAll('rx-icon')].find((icon) => box(icon).width > 0)!;

async function mountToggle(attrs = '', wrapper = (html: string) => html) {
  document.body.innerHTML = wrapper(
    `<rx-toggle-fab ${attrs} aria-label="Toggle menu"><rx-icon>add</rx-icon><rx-icon slot="checked">close</rx-icon></rx-toggle-fab>`,
  );
  const el = document.querySelector('rx-toggle-fab') as RxToggleFab;
  await el.updateComplete;
  return el;
}

const itemsMarkup = (n: number) =>
  Array.from(
    {length: n},
    (_, i) =>
      `<rx-fab-menu-item><rx-icon slot="icon">star</rx-icon>Item ${'x'.repeat(i % 3)}${i}</rx-fab-menu-item>`,
  ).join('');

async function mountMenu(attrs = '', n = 3, after = '') {
  document.body.innerHTML = `<div style="position: fixed; right: 0; bottom: 0"><rx-fab-menu ${attrs}>
    <rx-toggle-fab slot="button" aria-label="Toggle menu"><rx-icon>add</rx-icon><rx-icon slot="checked">close</rx-icon></rx-toggle-fab>
    ${itemsMarkup(n)}
  </rx-fab-menu></div>${after}`;
  const menu = document.querySelector('rx-fab-menu') as RxFabMenu;
  const button = menu.querySelector('rx-toggle-fab') as RxToggleFab;
  const items = [...menu.querySelectorAll('rx-fab-menu-item')] as RxFabMenuItem[];
  await Promise.all([menu, button, ...items].map((el) => el.updateComplete));
  await menu.updateComplete;
  return {menu, button, items};
}

/** Lets every animation finish (at duration scale 0, in one frame). */
async function settle(...els: {updateComplete: Promise<unknown>}[]) {
  setMotionDurationScale(0);
  for (const el of els) await el.updateComplete;
  await frame();
  await frame();
  for (const el of els) await el.updateComplete;
}

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

describe('rx-toggle-fab sizes', () => {
  for (const [size, want] of Object.entries(TOGGLE)) {
    it(`${size}: ${want.size}dp, ${want.corner}dp corners, ${want.icon}dp icon; checked, the 56dp round close button`, async () => {
      const el = await mountToggle(size === 'baseline' ? '' : `size="${size}"`);
      const host = box(el);
      expect([host.width, host.height]).toEqual([want.size, want.size]);
      let fab = box(fabOf(el));
      expect([fab.width, fab.height]).toEqual([want.size, want.size]);
      expect(getComputedStyle(fabOf(el)).borderTopLeftRadius).toBe(`${want.corner}px`);
      let icon = box(shownIcon(el));
      expect([icon.width, icon.height]).toEqual([want.icon, want.icon]);
      expect(icon.left - fab.left).toBe((want.size - want.icon) / 2);
      expect(icon.top - fab.top).toBe((want.size - want.icon) / 2);
      expect(shownIcon(el).slot).toBe('');

      el.checked = true;
      await settle(el);
      // The outer Box keeps the starting size.
      expect([box(el).width, box(el).height]).toEqual([want.size, want.size]);
      fab = box(fabOf(el));
      expect([fab.width, fab.height]).toEqual([FINAL.size, FINAL.size]);
      // contentAlignment TopEnd.
      expect(fab.top).toBe(box(el).top);
      expect(fab.right).toBe(box(el).right);
      expect(getComputedStyle(fabOf(el)).borderTopLeftRadius).toBe(`${FINAL.corner}px`);
      icon = box(shownIcon(el));
      expect(shownIcon(el).slot).toBe('checked');
      expect([icon.width, icon.height]).toEqual([FINAL.icon, FINAL.icon]);
      expect(icon.left - fab.left).toBe((FINAL.size - FINAL.icon) / 2);
    });
  }

  it('is baseline and primary by default', async () => {
    const el = await mountToggle();
    expect(el.size).toBe('baseline');
    expect(el.color).toBe('primary');
  });

  it('keeps the smaller container in the top-start corner in RTL (TopEnd)', async () => {
    const el = await mountToggle('size="large" checked', (html) => `<div dir="rtl">${html}</div>`);
    const fab = box(fabOf(el));
    expect(fab.left).toBe(box(el).left);
    expect(fab.top).toBe(box(el).top);
  });

  it('only the container takes clicks, not the rest of the starting size', async () => {
    const el = await mountToggle('size="medium" checked');
    const host = box(el);
    // The bottom-start corner of the 80dp box is outside the 56dp container.
    expect(document.elementFromPoint(host.left + 6, host.bottom - 6)).not.toBe(el);
    const fab = box(fabOf(el));
    expect(el.contains(document.elementFromPoint(fab.left + 28, fab.top + 28))).toBe(true);
  });

  it('keeps the default icon when there is no checked icon', async () => {
    document.body.innerHTML = '<rx-toggle-fab checked><rx-icon>menu</rx-icon></rx-toggle-fab>';
    const el = document.querySelector('rx-toggle-fab') as RxToggleFab;
    await el.updateComplete;
    await el.updateComplete;
    expect(box(el.querySelector('rx-icon')!).width).toBe(FINAL.icon);
  });
});

describe('rx-toggle-fab colors and elevation', () => {
  const SETS = {
    primary: ['primary-container', 'primary', 'on-primary-container', 'on-primary'],
    secondary: ['secondary-container', 'secondary', 'on-secondary-container', 'on-secondary'],
    tertiary: ['tertiary-container', 'tertiary', 'on-tertiary-container', 'on-tertiary'],
  } as const;
  for (const [color, [from, to, iconFrom, iconTo]] of Object.entries(SETS)) {
    it(`${color}: ${from} to ${to}, the icon ${iconFrom} to ${iconTo}`, async () => {
      const el = await mountToggle(color === 'primary' ? '' : `color="${color}"`);
      const style = () => getComputedStyle(fabOf(el));
      expectRgb(rgb(style().backgroundColor), role(from));
      expectRgb(rgb(style().color), role(iconFrom));
      expectRgb(rgb(getComputedStyle(shownIcon(el)).color), role(iconFrom));
      el.checked = true;
      await settle(el);
      expectRgb(rgb(style().backgroundColor), role(to));
      expectRgb(rgb(style().color), role(iconTo));
    });
  }

  it('sits at elevation level 3 (FabShadowElevation), hovered or not', async () => {
    const el = await mountToggle();
    const level = () => parseFloat(getComputedStyle(fabOf(el)).getPropertyValue('--rx-elevation'));
    expect(level()).toBe(6);
    expect(getComputedStyle(fabOf(el)).boxShadow).not.toBe('none');
    await userEvent.hover(el);
    expect(level()).toBe(6);
  });

  it('takes the container colors from custom properties', async () => {
    const el = await mountToggle(
      'style="--rx-toggle-fab-container-color: rgb(10, 20, 30); --rx-toggle-fab-checked-container-color: rgb(200, 100, 50)"',
    );
    expect(rgb(getComputedStyle(fabOf(el)).backgroundColor)).toEqual([10, 20, 30]);
    el.checked = true;
    await settle(el);
    expect(rgb(getComputedStyle(fabOf(el)).backgroundColor)).toEqual([200, 100, 50]);
  });

  it('uses a ripple of half the starting size diagonal (fabRippleRadius)', async () => {
    for (const [size, want] of Object.entries(TOGGLE)) {
      const el = await mountToggle(`size="${size}"`);
      const ripple = el.shadowRoot!.querySelector('rx-ripple') as RxRipple;
      expect(ripple.radius).toBeCloseTo(Math.hypot(want.size / 2, want.size / 2), 5);
    }
  });
});

describe("rx-toggle-fab color against Google's Color lerp (golden)", () => {
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  const split = (n: number): Rgb => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

  it("the test's own Oklab lerp matches Google's", () => {
    for (const row of colorGolden) {
      expectRgb(colorLerp(split(row.from), split(row.to), row.fraction), row.rgb as Rgb);
    }
  });

  it('the container color, mixed as the component mixes it, matches Google within one step', async () => {
    const el = await mountToggle();
    const fab = fabOf(el);
    for (const row of colorGolden) {
      el.style.setProperty('--rx-toggle-fab-container-color', hex(row.from));
      el.style.setProperty('--rx-toggle-fab-checked-container-color', hex(row.to));
      // draw()'s mix: the fraction clamped to 0..1, as a percentage.
      fab.style.setProperty('--_mix', `${Math.min(Math.max(row.fraction, 0), 1) * 100}%`);
      expectRgb(rgb(getComputedStyle(fab).backgroundColor), row.rgb as Rgb);
    }
  });
});

describe('rx-toggle-fab toggling', () => {
  it('is a button that says whether its menu is expanded', async () => {
    const el = await mountToggle();
    expect(el.getAttribute('role')).toBe('button');
    expect(el.tabIndex).toBe(0);
    expect(el.getAttribute('aria-expanded')).toBe('false');
    el.checked = true;
    await el.updateComplete;
    expect(el.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles on click and fires input and change', async () => {
    const el = await mountToggle();
    const events: string[] = [];
    for (const type of ['input', 'change']) el.addEventListener(type, () => events.push(type));
    el.click();
    expect(el.checked).toBe(true);
    expect(events).toEqual(['input', 'change']);
    el.click();
    expect(el.checked).toBe(false);
  });

  it('toggles with Enter and Space', async () => {
    const el = await mountToggle();
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(true);
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(false);
  });

  it('does not toggle when the click is cancelled', async () => {
    const el = await mountToggle();
    el.addEventListener('click', (e) => e.preventDefault(), {capture: true});
    el.click();
    expect(el.checked).toBe(false);
  });

  it('starts in its state without animating', async () => {
    const el = await mountToggle('checked');
    expect(el.checkedProgress).toBe(1);
    expect(box(fabOf(el)).width).toBe(FINAL.size);
  });

  it('springs every part from one progress (fast spatial), frame by frame', async () => {
    const el = await mountToggle('size="medium"');
    const from = role('primary-container');
    const to = role('primary');
    const clock = manualFrames();
    try {
      el.checked = true;
      await el.updateComplete;
      const spec = fastSpatial();
      const duration = spec.getDurationNanos(0, 1, 0);
      let overshot = false;
      let swapped = false;
      for (let i = 0; i * 16e6 < duration; i++) {
        clock.step();
        const p = springAt(spec, i * 16e6, 0, 1);
        expect(el.checkedProgress).toBeCloseTo(p, 5);
        if (p > 1) overshot = true;
        const fab = box(fabOf(el));
        const size = Math.round(lerp(80, 56, el.checkedProgress));
        expect(fab.width).toBe(size);
        expect(fab.height).toBe(size);
        expect(fab.right).toBe(box(el).right);
        const radius = parseFloat(getComputedStyle(fabOf(el)).borderTopLeftRadius);
        expect(radius).toBeCloseTo(lerp(20, 28, el.checkedProgress), 3);
        const iconSize = Math.round(lerp(28, 20, el.checkedProgress));
        const icon = box(shownIcon(el));
        expect(icon.width).toBe(iconSize);
        // Placed at whole pixels: (size - icon) / 2, rounded down.
        expect(icon.left - fab.left).toBe(Math.trunc((size - iconSize) / 2));
        // The icon switches past half way.
        expect(shownIcon(el).slot).toBe(el.checkedProgress > 0.5 ? 'checked' : '');
        if (el.checkedProgress > 0.5) swapped = true;
        expectRgb(rgb(getComputedStyle(fabOf(el)).backgroundColor), colorLerp(from, to, p));
        expect(
          parseFloat(getComputedStyle(fabOf(el)).getPropertyValue('--rx-toggle-fab-progress')),
        ).toBeCloseTo(el.checkedProgress, 5);
      }
      // Fast spatial bounces past the end; the corners follow, the color is clamped.
      expect(overshot).toBe(true);
      expect(swapped).toBe(true);
      clock.step(2);
      await Promise.resolve();
      expect(el.checkedProgress).toBe(1);
      // At rest, the CSS takes over again.
      expect(fabOf(el).style.width).toBe('');
    } finally {
      clock.restore();
    }
  });

  it('turns back mid-way without a jump', async () => {
    const el = await mountToggle();
    const clock = manualFrames();
    try {
      el.checked = true;
      await el.updateComplete;
      clock.step(5);
      const p = el.checkedProgress;
      el.checked = false;
      await el.updateComplete;
      expect(Math.abs(el.checkedProgress - p)).toBeLessThan(0.15);
      clock.step(80);
      expect(el.checkedProgress).toBe(0);
    } finally {
      clock.restore();
    }
  });
});

describe('rx-fab-menu-item', () => {
  async function mountItem(attrs = '', content = '<rx-icon slot="icon">star</rx-icon>Reply') {
    document.body.innerHTML = `<rx-fab-menu-item ${attrs}>${content}</rx-fab-menu-item>`;
    const el = document.querySelector('rx-fab-menu-item') as RxFabMenuItem;
    await el.updateComplete;
    return el;
  }

  it('lays out an icon and a label on a 56dp pill, 24dp at the sides, 8dp between', async () => {
    const el = await mountItem();
    const item = box(itemBox(el));
    expect(item.height).toBe(MENU.itemHeight);
    const icon = box(el.querySelector('rx-icon')!);
    expect([icon.width, icon.height]).toEqual([MENU.icon, MENU.icon]);
    expect(icon.left - item.left).toBe(MENU.leading);
    expect(icon.top - item.top).toBe((MENU.itemHeight - MENU.icon) / 2);
    const range = document.createRange();
    range.selectNodeContents(el.lastChild!);
    const text = range.getBoundingClientRect();
    expect(text.left - icon.right).toBeCloseTo(MENU.iconLabel, 0);
    expect(Math.abs(item.right - MENU.trailing - text.right)).toBeLessThan(1);
    // Fully round.
    expect(parseFloat(getComputedStyle(itemBox(el)).borderTopLeftRadius)).toBeGreaterThanOrEqual(
      MENU.itemHeight / 2,
    );
  });

  it('is at least 56dp wide', async () => {
    const el = await mountItem('', '');
    expect(box(itemBox(el)).width).toBe(MENU.itemHeight);
  });

  it('sets the label in title medium', async () => {
    const el = await mountItem();
    const probe = document.createElement('i');
    probe.style.font =
      'var(--md-sys-typescale-title-medium-weight) var(--md-sys-typescale-title-medium-size) / var(--md-sys-typescale-title-medium-line-height) var(--md-sys-typescale-title-medium-font)';
    document.body.append(probe);
    const want = getComputedStyle(probe);
    const got = getComputedStyle(itemBox(el));
    expect(got.fontSize).toBe(want.fontSize);
    expect(got.fontWeight).toBe(want.fontWeight);
    expect(got.lineHeight).toBe(want.lineHeight);
    expect(got.fontFamily).toBe(want.fontFamily);
  });

  const SETS = {
    primary: ['primary-container', 'on-primary-container'],
    secondary: ['secondary-container', 'on-secondary-container'],
    tertiary: ['tertiary-container', 'on-tertiary-container'],
  } as const;
  for (const [color, [container, content]] of Object.entries(SETS)) {
    it(`${color}: ${container} with ${content}, no shadow (a plain Surface)`, async () => {
      const el = await mountItem(color === 'primary' ? '' : `color="${color}"`);
      const style = getComputedStyle(itemBox(el));
      expectRgb(rgb(style.backgroundColor), role(container));
      expectRgb(rgb(style.color), role(content));
      expect(style.boxShadow).toBe('none');
    });
  }

  it('is a button: role, tab stop, Enter and Space click it', async () => {
    const el = await mountItem();
    expect(el.getAttribute('role')).toBe('button');
    expect(el.tabIndex).toBe(0);
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    el.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
  });

  it('shows on its own, outside a menu', async () => {
    const el = await mountItem();
    expect(el.visible).toBe(true);
    expect(el.inert).toBe(false);
  });
});

describe('rx-fab-menu layout', () => {
  it('stacks the items 4dp apart, 8dp above the button, which sits 16dp from the bottom and side', async () => {
    const {menu, button, items} = await mountMenu('expanded', 3);
    const m = box(menu);
    const fab = box(fabOf(button));
    expect(m.right - fab.right).toBe(MENU.padding);
    expect(m.bottom - fab.bottom).toBe(MENU.buttonBottom);
    const rects = items.map(box);
    expect(rects[0].top).toBe(m.top);
    for (let i = 0; i < rects.length - 1; i++) {
      expect(rects[i + 1].top - rects[i].bottom).toBe(MENU.itemSpacing);
    }
    expect(fab.top - rects[2].bottom).toBe(MENU.aboveButton);
    for (const r of rects) {
      expect(r.height).toBe(MENU.itemHeight);
      expect(r.right).toBe(m.right - MENU.padding);
    }
    // The column: the items, the spacing, then the button with its paddings.
    expect(m.height).toBe(3 * 56 + 2 * 4 + 56 + 16 + 8);
    // As wide as the widest item, with 16dp each side.
    expect(m.width).toBe(Math.max(...rects.map((r) => r.width)) + 2 * MENU.padding);
  });

  it('collapsed, is just the button with its paddings', async () => {
    const {menu, items} = await mountMenu('', 3);
    const m = box(menu);
    expect([m.width, m.height]).toEqual([56 + 32, 56 + 16]);
    expect(column(menu).hidden).toBe(true);
    for (const item of items) {
      expect(item.visible).toBe(false);
      expect(item.inert).toBe(true);
    }
  });

  it('the medium button: the column clears its full 80dp', async () => {
    document.body.innerHTML = `<rx-fab-menu expanded>
      <rx-toggle-fab slot="button" size="medium"><rx-icon>add</rx-icon></rx-toggle-fab>${itemsMarkup(1)}</rx-fab-menu>`;
    const menu = document.querySelector('rx-fab-menu') as RxFabMenu;
    await menu.updateComplete;
    await settle(menu);
    const item = box(menu.querySelector('rx-fab-menu-item')!);
    const button = box(menu.querySelector('rx-toggle-fab')!);
    expect(button.top - item.bottom).toBe(MENU.aboveButton);
    expect(box(menu).height).toBe(56 + 80 + 16 + 8);
  });

  for (const [align, side] of [
    ['start', 'left'],
    ['center', 'center'],
    ['end', 'right'],
  ] as const) {
    it(`lines the items and the button up at the ${align}`, async () => {
      const {menu, button, items} = await mountMenu(`expanded align="${align}"`, 3);
      const m = box(menu);
      const edge = (r: DOMRect) =>
        side === 'left' ? r.left : side === 'right' ? r.right : (r.left + r.right) / 2;
      const want =
        side === 'left' ? m.left + 16 : side === 'right' ? m.right - 16 : (m.left + m.right) / 2;
      expect(edge(box(fabOf(button)))).toBeCloseTo(want, 0);
      for (const item of items) expect(edge(box(item))).toBeCloseTo(want, 0);
    });
  }

  it('lines up at the end on the left in RTL', async () => {
    document.documentElement.dir = 'rtl';
    try {
      const {menu, button, items} = await mountMenu('expanded', 2);
      const m = box(menu);
      expect(box(fabOf(button)).left).toBe(m.left + 16);
      for (const item of items) expect(box(item).left).toBe(m.left + 16);
    } finally {
      document.documentElement.dir = '';
    }
  });

  it('scrolls the items while expanded when they do not fit', async () => {
    const {menu} = await mountMenu('expanded style="max-height: 200px"', 6);
    await settle(menu);
    expect(box(menu).height).toBe(200);
    const col = column(menu);
    expect(col.scrollHeight).toBeGreaterThan(col.clientHeight);
    expect(getComputedStyle(col).overflowY).toBe('auto');
    setMotionDurationScale(null);
    menu.expanded = false;
    await menu.updateComplete;
    // verticalScroll(enabled = expanded).
    expect(getComputedStyle(col).overflowY).toBe('hidden');
  });

  it('does not scroll when the items fit', async () => {
    const {menu} = await mountMenu('expanded', 3);
    await settle(menu);
    expect(getComputedStyle(column(menu)).overflowY).toBe('visible');
  });
});

describe('rx-fab-menu showing and hiding', () => {
  it('starts expanded without animating', async () => {
    const {menu, items} = await mountMenu('expanded', 3);
    expect(menu.visibleItemCount).toBe(3);
    for (const item of items) {
      expect(item.showState).toEqual({shown: true, width: 1, alpha: 1});
      expect(item.inert).toBe(false);
    }
  });

  it('springs the item count up (slow effects, threshold 1), showing the items from the bottom', async () => {
    const {menu, items} = await mountMenu('', 6);
    const clock = manualFrames();
    try {
      menu.expanded = true;
      await menu.updateComplete;
      const spec = stagger();
      const shownAt: number[] = items.map(() => -1);
      for (let k = 0; k < 60; k++) {
        clock.step();
        // The count is cut to a whole number (Int.VectorConverter).
        const count = Math.trunc(springAt(spec, k * 16e6, 0, 6));
        expect(menu.visibleItemCount).toBe(count);
        items.forEach((item, i) => {
          expect(item.showState.shown).toBe(i >= 6 - count);
          if (item.showState.shown && shownAt[i] < 0) shownAt[i] = k;
        });
      }
      expect(menu.visibleItemCount).toBe(6);
      // Bottom first, and not all at once.
      for (let i = 0; i < 5; i++) expect(shownAt[i]).toBeGreaterThanOrEqual(shownAt[i + 1]);
      expect(shownAt[0]).toBeGreaterThan(shownAt[5]);
    } finally {
      clock.restore();
    }
  });

  it('hides the items from the top', async () => {
    const {menu, items} = await mountMenu('expanded', 6);
    const clock = manualFrames();
    try {
      menu.expanded = false;
      await menu.updateComplete;
      const spec = stagger();
      const hiddenAt: number[] = items.map(() => -1);
      for (let k = 0; k < 60; k++) {
        clock.step();
        const count = Math.trunc(springAt(spec, k * 16e6, 6, 0));
        expect(menu.visibleItemCount).toBe(count);
        items.forEach((item, i) => {
          expect(item.showState.shown).toBe(i >= 6 - count);
          if (!item.showState.shown && hiddenAt[i] < 0) hiddenAt[i] = k;
        });
      }
      for (let i = 0; i < 5; i++) expect(hiddenAt[i]).toBeLessThanOrEqual(hiddenAt[i + 1]);
      expect(hiddenAt[0]).toBeLessThan(hiddenAt[5]);
    } finally {
      clock.restore();
    }
  });

  it("opens each item's width from the end (fast spatial) as it fades in (fast effects)", async () => {
    const {menu, items} = await mountMenu('', 1);
    const item = items[0];
    // The full width, from a settled open item.
    menu.expanded = true;
    await settle(menu, item);
    const row = item.shadowRoot!.querySelector('.row')!;
    const full = Math.ceil(box(row).width);
    menu.expanded = false;
    await settle(menu, item);
    setMotionDurationScale(null);
    expect(box(item).width).toBe(0);

    const clock = manualFrames();
    try {
      menu.expanded = true;
      await menu.updateComplete;
      // The count reaches 1 on the stagger's first frame past 0.
      let k = 0;
      while (!item.showState.shown) {
        clock.step();
        k++;
        expect(k).toBeLessThan(60);
      }
      const width = fastSpatial();
      const alpha = fastEffects();
      let overshot = false;
      for (let j = 0; j < 40; j++) {
        clock.step();
        const t = j * 16e6;
        const p = springAt(width, t, 0, 1);
        const a = springAt(alpha, t, 0, 1);
        expect(item.showState.width).toBeCloseTo(p, 5);
        expect(item.showState.alpha).toBeCloseTo(a, 5);
        if (p > 1) overshot = true;
        expect(box(itemBox(item)).width).toBe(Math.round(full * Math.max(item.showState.width, 0)));
        expect(Number(getComputedStyle(itemBox(item)).opacity)).toBeCloseTo(
          item.showState.alpha,
          5,
        );
        if (!item.visible) continue;
        // The content keeps to the end: the label's end stays 24dp in.
        const range = document.createRange();
        range.selectNodeContents(item.lastChild!);
        expect(
          Math.abs(box(itemBox(item)).right - 24 - range.getBoundingClientRect().right),
        ).toBeLessThan(1);
      }
      expect(overshot).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('opens the width from the start when aligned at the start', async () => {
    const {menu, items} = await mountMenu('align="start"', 1);
    const item = items[0];
    const clock = manualFrames();
    try {
      menu.expanded = true;
      await menu.updateComplete;
      while (!item.showState.shown) clock.step();
      clock.step(4);
      const width = box(itemBox(item)).width;
      expect(width).toBeGreaterThan(0);
      expect(item.showState.width).toBeLessThan(1);
      const icon = box(item.querySelector('rx-icon')!);
      expect(icon.left - box(itemBox(item)).left).toBe(24);
    } finally {
      clock.restore();
    }
  });

  it('hidden items are not drawn, have no width and are inert; the column collapses', async () => {
    const {menu, items} = await mountMenu('expanded', 3);
    menu.expanded = false;
    await settle(menu, ...items);
    for (const item of items) {
      expect(item.visible).toBe(false);
      expect(item.inert).toBe(true);
      expect(getComputedStyle(itemBox(item)).visibility).toBe('hidden');
      expect(box(item).width).toBe(0);
    }
    expect(column(menu).hidden).toBe(true);
    expect(box(menu).height).toBe(56 + 16);
  });

  it('keeps the column until the last item has faded', async () => {
    const {menu, items} = await mountMenu('expanded', 3);
    const clock = manualFrames();
    try {
      menu.expanded = false;
      await menu.updateComplete;
      let sawPartial = false;
      for (let k = 0; k < 120; k++) {
        clock.step();
        await menu.updateComplete;
        const anyVisible = items.some((item) => item.visible);
        expect(column(menu).hidden).toBe(!anyVisible);
        if (anyVisible && items.some((item) => !item.visible)) sawPartial = true;
      }
      expect(sawPartial).toBe(true);
      expect(column(menu).hidden).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('items not yet shown have no width while the column is drawn', async () => {
    const {menu, items} = await mountMenu('', 6);
    const clock = manualFrames();
    try {
      menu.expanded = true;
      await menu.updateComplete;
      let checked = false;
      for (let k = 0; k < 60 && !items[0].visible; k++) {
        clock.step();
        if (column(menu).hidden) continue;
        for (const item of items.filter((i) => !i.visible)) {
          expect(box(itemBox(item)).width).toBe(0);
          checked = true;
        }
      }
      expect(checked).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('closing, items already faded have no width while the others still show', async () => {
    const {menu, items} = await mountMenu('expanded', 6);
    const clock = manualFrames();
    try {
      menu.expanded = false;
      await menu.updateComplete;
      let checked = 0;
      for (let k = 0; k < 120 && !column(menu).hidden; k++) {
        clock.step();
        if (column(menu).hidden) break;
        for (const item of items.filter((i) => !i.visible)) {
          expect(box(itemBox(item)).width).toBe(0);
          if (item.showState.width < 0) checked++;
        }
      }
      // Some were checked past the spring's undershoot below 0.
      expect(checked).toBeGreaterThan(0);
    } finally {
      clock.restore();
    }
  });

  it('closing, the width follows the spring down and never below 0', async () => {
    const {menu, items} = await mountMenu('expanded', 1);
    const item = items[0];
    const full = Math.ceil(box(item.shadowRoot!.querySelector('.row')!).width);
    const clock = manualFrames();
    try {
      menu.expanded = false;
      await menu.updateComplete;
      while (item.showState.shown) clock.step();
      const spec = fastSpatial();
      let undershot = false;
      for (let j = 0; j < 40 && item.visible; j++) {
        clock.step();
        const p = springAt(spec, j * 16e6, 1, 0);
        expect(item.showState.width).toBeCloseTo(p, 5);
        if (p < 0) undershot = true;
        if (!item.visible) break;
        expect(box(itemBox(item)).width).toBe(Math.round(full * Math.max(p, 0)));
      }
      expect(undershot).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('shows an item added while expanded straight away', async () => {
    const {menu} = await mountMenu('expanded', 2);
    const added = document.createElement('rx-fab-menu-item');
    added.textContent = 'New';
    menu.append(added);
    await added.updateComplete;
    await menu.updateComplete;
    await new Promise((r) => setTimeout(r));
    expect(added.showState.shown).toBe(true);
    expect(added.showState.alpha).toBe(1);
  });
});

describe('rx-fab-menu interaction', () => {
  it('the toggle FAB opens and closes it, firing toggle', async () => {
    const {menu, button} = await mountMenu('', 2);
    let toggles = 0;
    menu.addEventListener('toggle', () => toggles++);
    button.click();
    await menu.updateComplete;
    expect(menu.expanded).toBe(true);
    expect(button.checked).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    await menu.updateComplete;
    expect(menu.expanded).toBe(false);
    expect(toggles).toBe(2);
  });

  it('keeps the toggle FAB in step when expanded is set, without firing toggle', async () => {
    const {menu, button} = await mountMenu('', 2);
    let toggles = 0;
    menu.addEventListener('toggle', () => toggles++);
    menu.expanded = true;
    await menu.updateComplete;
    expect(button.checked).toBe(true);
    menu.expanded = false;
    await menu.updateComplete;
    expect(button.checked).toBe(false);
    expect(toggles).toBe(0);
  });

  it('takes any button: its click toggles and it gets aria-expanded', async () => {
    document.body.innerHTML = `<rx-fab-menu><button slot="button">+</button>${itemsMarkup(2)}</rx-fab-menu>`;
    const menu = document.querySelector('rx-fab-menu') as RxFabMenu;
    await menu.updateComplete;
    const button = menu.querySelector('button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    await menu.updateComplete;
    expect(menu.expanded).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when an item is clicked, unless the click is cancelled', async () => {
    const {menu, items} = await mountMenu('expanded', 3);
    let toggles = 0;
    menu.addEventListener('toggle', () => toggles++);
    items[1].addEventListener('click', (e) => e.preventDefault(), {once: true});
    items[1].click();
    expect(menu.expanded).toBe(true);
    items[1].click();
    expect(menu.expanded).toBe(false);
    expect(toggles).toBe(1);
  });

  it('the button is on top of the column and takes the pointer', async () => {
    const {menu, button} = await mountMenu('expanded', 3);
    const fab = box(fabOf(button));
    const hit = document.elementFromPoint(fab.left + fab.width / 2, fab.top + fab.height / 2);
    expect(button.contains(hit)).toBe(true);
    await userEvent.click(button);
    expect(menu.expanded).toBe(false);
  });

  it('any button in the slot is on top of the column', async () => {
    document.body.innerHTML = `<rx-fab-menu expanded><button slot="button" style="width: 56px; height: 56px">+</button>${itemsMarkup(3)}</rx-fab-menu>`;
    const menu = document.querySelector('rx-fab-menu') as RxFabMenu;
    await menu.updateComplete;
    await menu.updateComplete;
    const button = menu.querySelector('button')!;
    const b = box(button);
    expect(document.elementFromPoint(b.left + 28, b.top + 28)).toBe(button);
  });

  it('while items are still appearing, Tab goes to the top one already shown', async () => {
    const {menu, button, items} = await mountMenu('', 6);
    const clock = manualFrames();
    try {
      menu.expanded = true;
      await menu.updateComplete;
      while (!items[5].visible || items[3].visible) clock.step();
      const first = items.find((item) => item.visible)!;
      expect(first).not.toBe(items[0]);
      button.focus();
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(first);
      // And up from there goes back to the button, skipping the hidden ones.
      await userEvent.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(button);
    } finally {
      clock.restore();
    }
  });

  it('closes with Escape and gives the focus to the button', async () => {
    const {menu, button, items} = await mountMenu('expanded', 3);
    items[1].focus();
    await userEvent.keyboard('{Escape}');
    expect(menu.expanded).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('moves the focus to the button when it closes with an item focused', async () => {
    const {menu, button, items} = await mountMenu('expanded', 3);
    items[2].focus();
    menu.expanded = false;
    await menu.updateComplete;
    expect(document.activeElement).toBe(button);
  });

  it('goes from the button to the top item with Tab or down, and back with up or Shift+Tab', async () => {
    const {button, items} = await mountMenu('expanded', 3);
    button.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(items[0]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(button);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[0]);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(document.activeElement).toBe(button);
  });

  it('moves between the items with the arrows, down from the last to the button', async () => {
    const {button, items} = await mountMenu('expanded', 3);
    items[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[2]);
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(items[1]);
    items[2].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(button);
  });

  it('collapsed, Tab leaves the button for what follows the menu', async () => {
    const {button} = await mountMenu('', 3, '<button id="after">after</button>');
    button.focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(document.getElementById('after'));
  });
});
