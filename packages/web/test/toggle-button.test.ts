import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/button/toggle-button.js';
import '../src/icon/icon.js';
import type {RxToggleButton} from '../src/button/index.js';
import {parseCssColor, setMotionDurationScale, type Rgba} from '../src/motion/index.js';
import {manualFrames} from './helpers/manual-frames.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-toggle-button') as RxToggleButton;
  await el.updateComplete;
  return el;
}

const container = (el: RxToggleButton) => el.shadowRoot!.querySelector('.button') as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await nextFrame();
};
/** The corner radius as drawn (CSS scales 9999px down to half the side). */
const radius = (el: RxToggleButton) => {
  const box = container(el);
  const specified = parseFloat(getComputedStyle(box).borderTopLeftRadius);
  return Math.min(specified, Math.min(box.offsetWidth, box.offsetHeight) / 2);
};
const press = (el: RxToggleButton) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: RxToggleButton) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));
/** The drawn border (an inset shadow): its width in px and its color, or width 0. */
function border(el: RxToggleButton) {
  const shadow = getComputedStyle(container(el), '::before').boxShadow;
  if (shadow === 'none') return {width: 0, color: null as Rgba | null};
  const match = /^(.*\)) 0px 0px 0px ([\d.]+)px inset$/.exec(shadow);
  return {width: Number(match![2]), color: parseCssColor(match![1])};
}

/** Two colors equal to within rounding (the border color goes through Oklab). */
function expectColor(actual: Rgba | null, expected: string) {
  const want = parseCssColor(expected)!;
  for (const key of ['r', 'g', 'b', 'alpha'] as const) {
    expect(actual![key], key).toBeCloseTo(want[key], 3);
  }
}

/** A color role (optionally at an opacity) as the browser computes it. */
function color(role: string, opacity?: number) {
  const probe = document.createElement('i');
  probe.style.color =
    opacity === undefined
      ? `var(--md-sys-color-${role})`
      : `color-mix(in srgb, var(--md-sys-color-${role}) ${opacity * 100}%, transparent)`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

// The test's own copy of the toggle buttons' colors (ToggleButton.kt and the button tokens).
const COLORS = {
  filled: {
    off: ['surface-container', 'on-surface-variant'],
    on: ['primary', 'on-primary'],
    disabled: [
      ['on-surface', 0.1],
      ['on-surface-variant', 0.38],
    ],
  },
  elevated: {
    off: ['surface-container-low', 'primary'],
    on: ['primary', 'on-primary'],
    disabled: [
      ['on-surface', 0.1],
      ['on-surface-variant', 0.38],
    ],
  },
  tonal: {
    off: ['secondary-container', 'on-secondary-container'],
    on: ['secondary', 'on-secondary'],
    disabled: [
      ['on-surface', 0.1],
      ['on-surface-variant', 0.38],
    ],
  },
  outlined: {
    off: [null, 'on-surface-variant'],
    on: ['inverse-surface', 'inverse-on-surface'],
    // The disabled outline color as a container, at 10%.
    disabled: [
      ['outline-variant', 0.1],
      ['on-surface-variant', 0.38],
    ],
  },
} as const;

describe('rx-toggle-button colors', () => {
  for (const [variant, want] of Object.entries(COLORS)) {
    it(`${variant}: off, on, and disabled either way`, async () => {
      const el = await mount(`<rx-toggle-button variant="${variant}">Label</rx-toggle-button>`);
      let s = getComputedStyle(container(el));
      expect(s.backgroundColor).toBe(want.off[0] ? color(want.off[0]) : 'rgba(0, 0, 0, 0)');
      expect(s.color).toBe(color(want.off[1]));
      el.checked = true;
      await el.updateComplete;
      s = getComputedStyle(container(el));
      expect(s.backgroundColor).toBe(color(want.on[0]));
      expect(s.color).toBe(color(want.on[1]));
      for (const checked of [true, false]) {
        el.checked = checked;
        el.disabled = true;
        await el.updateComplete;
        s = getComputedStyle(container(el));
        const [[cRole, cOpacity], [tRole, tOpacity]] = want.disabled;
        expect(s.backgroundColor, `checked ${checked}`).toBe(color(cRole, cOpacity));
        expect(s.color).toBe(color(tRole, tOpacity));
      }
    });
  }

  it("reads each variant's elevations from the tokens (outlined has none)", async () => {
    const want = {
      filled: {default: 0, pressed: 0, focused: 0, hovered: 1, disabled: 0},
      elevated: {default: 1, pressed: 1, focused: 1, hovered: 3, disabled: 0},
      tonal: {default: 0, pressed: 0, focused: 0, hovered: 1, disabled: 0},
      outlined: null,
    };
    for (const [variant, elevations] of Object.entries(want)) {
      const el = await mount(`<rx-toggle-button variant="${variant}">x</rx-toggle-button>`);
      expect(el.elevations, variant).toEqual(elevations);
    }
  });
});

describe('rx-toggle-button outline', () => {
  it('outlined and off: 1dp outline-variant, at 10% disabled; on: none', async () => {
    const el = await mount('<rx-toggle-button variant="outlined">Label</rx-toggle-button>');
    expect(border(el).width).toBe(1);
    expectColor(border(el).color, color('outline-variant'));
    setMotionDurationScale(0);
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(border(el).width).toBe(0);
    el.checked = false;
    el.disabled = true;
    await el.updateComplete;
    await frames(2);
    expect(border(el).width).toBe(1);
    expectColor(border(el).color, color('outline-variant', 0.1));
  });

  it('turned off, the outline springs back in past 1dp (fast spatial bounces)', async () => {
    const el = await mount('<rx-toggle-button variant="outlined" checked>Label</rx-toggle-button>');
    expect(border(el).width).toBe(0);
    const clock = manualFrames();
    try {
      el.checked = false;
      await el.updateComplete;
      let widest = 0;
      for (let i = 0; i < 60; i++) {
        clock.step();
        widest = Math.max(widest, border(el).width);
      }
      expect(widest).toBeGreaterThan(1.05);
      expect(widest).toBeLessThan(1.15);
      expect(border(el).width).toBe(1);
    } finally {
      clock.restore();
    }
  });

  it('the other variants have no border', async () => {
    for (const variant of ['filled', 'elevated', 'tonal']) {
      const el = await mount(`<rx-toggle-button variant="${variant}">x</rx-toggle-button>`);
      expect(border(el).width, variant).toBe(0);
    }
  });

  it('springs the width away on the fast spatial spring while the color fades', async () => {
    setMotionDurationScale(10);
    const el = await mount('<rx-toggle-button variant="outlined">Label</rx-toggle-button>');
    el.checked = true;
    await el.updateComplete;
    await frames(4);
    const {width, color: mid} = border(el);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(1);
    // The color is part way to Transparent: some alpha gone, and darker, as
    // Oklab with straight alpha goes towards black.
    expect(mid!.alpha).toBeLessThan(1);
    expect(mid!.alpha).toBeGreaterThan(0);
    expect(mid!.r).toBeLessThan(parseCssColor(color('outline-variant'))!.r);
    setMotionDurationScale(0);
    await frames(3);
    expect(border(el).width).toBe(0);
  });
});

/*
 * The test's own copy of each size: height, contentPaddingFor (sides,
 * vertical), iconSizeFor, iconSpacingFor, and shapesFor's pressed and
 * checked corners (Small's pressed shape is the hand-typed 6dp).
 */
const SIZES = {
  xs: {height: 32, sides: 12, vertical: 6, icon: 20, spacing: 4, pressed: 8, checked: 12},
  s: {height: 40, sides: 16, vertical: 10, icon: 20, spacing: 8, pressed: 6, checked: 12},
  m: {height: 56, sides: 24, vertical: 16, icon: 24, spacing: 8, pressed: 12, checked: 16},
  l: {height: 96, sides: 48, vertical: 32, icon: 32, spacing: 12, pressed: 16, checked: 28},
  xl: {height: 136, sides: 64, vertical: 48, icon: 40, spacing: 16, pressed: 16, checked: 28},
} as const;

describe('rx-toggle-button sizes and shapes', () => {
  it('is small by default, with no minimum width', async () => {
    const el = await mount('<rx-toggle-button>A</rx-toggle-button>');
    expect(el.size).toBe('s');
    const box = container(el).getBoundingClientRect();
    expect(box.height).toBe(40);
    expect(box.width).toBeLessThan(58);
    expect(el.getBoundingClientRect().height).toBe(48);
  });

  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: ${want.height}dp, its padding and icon, ${want.pressed}dp pressed, ${want.checked}dp checked`, async () => {
      setMotionDurationScale(0);
      const el = await mount(
        `<rx-toggle-button size="${size}"><rx-icon slot="icon">star</rx-icon><span id="label">Label</span></rx-toggle-button>`,
      );
      expect(container(el).getBoundingClientRect().height).toBe(want.height);
      const s = getComputedStyle(container(el));
      expect([s.paddingLeft, s.paddingRight, s.paddingTop, s.paddingBottom]).toEqual(
        [want.sides, want.sides, want.vertical, want.vertical].map((v) => `${v}px`),
      );
      const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
      const label = document.getElementById('label')!.getBoundingClientRect();
      expect([icon.width, icon.height]).toEqual([want.icon, want.icon]);
      expect(label.left - icon.right).toBe(want.spacing);
      expect(radius(el)).toBe(want.height / 2);
      press(el);
      await frames(2);
      expect(radius(el), 'pressed').toBe(want.pressed);
      el.checked = true;
      await el.updateComplete;
      await frames(2);
      // Pressed wins over checked.
      expect(radius(el), 'pressed and checked').toBe(want.pressed);
      release(el);
      await frames(2);
      expect(radius(el), 'checked').toBe(want.checked);
    });
  }

  it('puts no space after a missing icon', async () => {
    const el = await mount('<rx-toggle-button><span id="label">Label</span></rx-toggle-button>');
    const label = document.getElementById('label')!.getBoundingClientRect();
    expect(label.left - container(el).getBoundingClientRect().left).toBe(16);
  });

  it('morphs on the fast spatial spring (damping 0.6, stiffness 800), so it bounces', async () => {
    const el = await mount('<rx-toggle-button size="m">Label</rx-toggle-button>');
    const spec = (el.shapeState as unknown as {spec: () => object}).spec();
    expect(spec).toMatchObject({dampingRatio: 0.6, stiffness: 800});
    // From round (28) to the 16dp checked shape: it overshoots below 16.
    setMotionDurationScale(4);
    el.checked = true;
    await el.updateComplete;
    let lowest = 28;
    for (let i = 0; i < 60 && el.shapeState!.progress.isRunning; i++) {
      await nextFrame();
      lowest = Math.min(lowest, radius(el));
    }
    expect(lowest).toBeLessThan(16);
    expect(lowest).toBeGreaterThan(14);
    setMotionDurationScale(0);
    await frames(3);
    expect(radius(el)).toBe(16);
  });

  it('released and checked mid-press, morphs on from the shape it shows to the checked one', async () => {
    setMotionDurationScale(10);
    const el = await mount('<rx-toggle-button size="m">Label</rx-toggle-button>');
    press(el);
    await frames(3);
    const before = radius(el);
    expect(before).toBeLessThan(28);
    expect(before).toBeGreaterThan(12);
    release(el);
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(true);
    // A third shape: the visible one is frozen as the start, no jump.
    const state = el.shapeState!;
    expect(state.startShape.topStart.kind).toBe('lerp');
    expect(radius(el)).toBeCloseTo(before, 3);
    setMotionDurationScale(0);
    await frames(3);
    expect(radius(el)).toBe(16);
  });

  it('takes its shapes from the custom properties', async () => {
    setMotionDurationScale(0);
    const el = await mount(
      `<rx-toggle-button style="--rx-toggle-button-shape: 10px; --rx-toggle-button-pressed-shape: 2px; --rx-toggle-button-checked-shape: 4px">Label</rx-toggle-button>`,
    );
    expect(radius(el)).toBe(10);
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(radius(el)).toBe(4);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(2);
  });
});

describe('rx-toggle-button behaviour', () => {
  it('is a checkbox for assistive technology, checked or not', async () => {
    const el = await mount('<rx-toggle-button>Bold</rx-toggle-button>');
    expect(el.getAttribute('role')).toBe('checkbox');
    expect(el.getAttribute('aria-checked')).toBe('false');
    el.click();
    await el.updateComplete;
    expect(el.checked).toBe(true);
    expect(el.getAttribute('aria-checked')).toBe('true');
    expect(el.tabIndex).toBe(0);
  });

  it('toggles on click and Space (not Enter), firing input and change', async () => {
    const el = await mount('<rx-toggle-button>Bold</rx-toggle-button>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push(`input ${el.checked}`));
    el.addEventListener('change', () => events.push(`change ${el.checked}`));
    await userEvent.click(el);
    expect(events).toEqual(['input true', 'change true']);
    el.focus();
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(false);
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    expect(events).toHaveLength(4);
  });

  it('shows the pressed shape for Space only', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-toggle-button>Bold</rx-toggle-button>');
    el.focus();
    await userEvent.keyboard('{Enter>}');
    await frames(2);
    expect(radius(el)).toBe(20);
    await userEvent.keyboard('{/Enter}{Space>}');
    await frames(2);
    expect(radius(el)).toBe(6);
    await userEvent.keyboard('{/Space}');
  });

  it('does not toggle when disabled or when the click is cancelled', async () => {
    const el = await mount('<rx-toggle-button disabled>Bold</rx-toggle-button>');
    el.click();
    expect(el.checked).toBe(false);
    el.disabled = false;
    await el.updateComplete;
    // Cancelled before it gets the click (a capturing listener higher up).
    document.addEventListener('click', (e) => e.preventDefault(), {capture: true, once: true});
    el.click();
    expect(el.checked).toBe(false);
  });

  it('is a form checkbox: submits its value when checked, and resets to its attribute', async () => {
    document.body.innerHTML = `<form>
      <rx-toggle-button name="bold" checked>Bold</rx-toggle-button>
      <rx-toggle-button name="italic" value="yes">Italic</rx-toggle-button>
    </form>`;
    const form = document.querySelector('form')!;
    const [bold, italic] = [...form.querySelectorAll('rx-toggle-button')] as RxToggleButton[];
    await bold.updateComplete;
    await italic.updateComplete;
    expect([...new FormData(form)]).toEqual([['bold', 'on']]);
    bold.click();
    italic.click();
    await bold.updateComplete;
    await italic.updateComplete;
    expect([...new FormData(form)]).toEqual([['italic', 'yes']]);
    form.reset();
    await bold.updateComplete;
    await italic.updateComplete;
    expect([bold.checked, italic.checked]).toEqual([true, false]);
  });

  it('is disabled by a disabled fieldset', async () => {
    document.body.innerHTML = `<fieldset disabled><rx-toggle-button>x</rx-toggle-button></fieldset>`;
    const el = document.querySelector('rx-toggle-button') as RxToggleButton;
    await el.updateComplete;
    el.click();
    expect(el.checked).toBe(false);
    expect(el.getAttribute('aria-disabled')).toBe('true');
  });
});
