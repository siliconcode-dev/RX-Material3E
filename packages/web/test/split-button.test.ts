import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/split-button/split-button.js';
import '../src/icon/icon.js';
import type {RxSplitButton} from '../src/split-button/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {manualFrames} from './helpers/manual-frames.js';

async function mount(attributes = '', label = 'Edit') {
  document.body.innerHTML = `<rx-split-button trailing-label="More" ${attributes}><rx-icon slot="icon">edit</rx-icon>${label}</rx-split-button>`;
  const el = document.querySelector('rx-split-button') as RxSplitButton;
  await el.updateComplete;
  return el;
}

const part = (el: RxSplitButton, name: 'leading' | 'trailing') =>
  el.shadowRoot!.querySelector(`.${name}`) as HTMLElement;
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
};
/** start-start, start-end, end-end, end-start radii in px. */
const corners = (el: HTMLElement) => {
  const s = getComputedStyle(el);
  return [
    s.borderStartStartRadius,
    s.borderStartEndRadius,
    s.borderEndEndRadius,
    s.borderEndStartRadius,
  ].map(parseFloat);
};
const press = (el: Element) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: Element) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));
const offset = (el: RxSplitButton) =>
  parseFloat(
    getComputedStyle(el.shadowRoot!.querySelector('.trailing-content') as HTMLElement).translate,
  ) || 0;

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
  document.documentElement.removeAttribute('dir');
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

/*
 * The test's own copy of SplitButtonDefaults for each size (the split
 * button tokens): height, leading padding (start, end), trailing padding,
 * trailing icon size, inner corner and pressed inner corner, and the
 * leading icon size (ButtonDefaults.iconSizeFor).
 */
const SIZES = {
  xs: {height: 32, leading: [12, 10], trailing: 13, chevron: 22, inner: 4, pressed: 8, icon: 20},
  s: {height: 40, leading: [16, 12], trailing: 13, chevron: 22, inner: 4, pressed: 12, icon: 20},
  m: {height: 56, leading: [24, 24], trailing: 15, chevron: 26, inner: 4, pressed: 12, icon: 24},
  l: {height: 96, leading: [48, 48], trailing: 29, chevron: 38, inner: 8, pressed: 20, icon: 32},
  xl: {height: 136, leading: [64, 64], trailing: 43, chevron: 50, inner: 12, pressed: 20, icon: 40},
} as const;

describe('rx-split-button layout (SplitButtonLayout)', () => {
  it('is small by default: two 40dp buttons 2dp apart in a 48dp touch target', async () => {
    const el = await mount();
    expect(el.size).toBe('s');
    const [leading, trailing] = [part(el, 'leading'), part(el, 'trailing')].map((p) =>
      p.getBoundingClientRect(),
    );
    expect(leading.height).toBe(40);
    expect(trailing.height).toBe(40);
    expect(trailing.left - leading.right).toBe(2);
    expect(el.getBoundingClientRect().height).toBe(48);
    // 13 + 22 + 13 = 48: TrailingButtonMinWidth.
    expect(trailing.width).toBe(48);
  });

  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: ${want.height}dp, its paddings and icon sizes`, async () => {
      const el = await mount(`size="${size}"`);
      const leading = getComputedStyle(part(el, 'leading'));
      const trailing = getComputedStyle(part(el, 'trailing'));
      expect(part(el, 'leading').getBoundingClientRect().height).toBe(want.height);
      expect(part(el, 'trailing').getBoundingClientRect().height).toBe(want.height);
      expect([leading.paddingLeft, leading.paddingRight]).toEqual(
        want.leading.map((v) => `${v}px`),
      );
      expect([trailing.paddingLeft, trailing.paddingRight]).toEqual([
        `${want.trailing}px`,
        `${want.trailing}px`,
      ]);
      const chevron = el.shadowRoot!.querySelector('.chevron')!.getBoundingClientRect();
      expect(chevron.width).toBe(want.chevron);
      const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
      expect(icon.width).toBe(want.icon);
      expect(part(el, 'trailing').getBoundingClientRect().width).toBe(
        Math.max(48, 2 * want.trailing + want.chevron),
      );
    });
  }

  it('makes both buttons as tall as the taller one', async () => {
    const el = await mount('', 'One<br />two<br />three');
    const leading = part(el, 'leading').getBoundingClientRect();
    const trailing = part(el, 'trailing').getBoundingClientRect();
    expect(leading.height).toBeGreaterThan(40);
    expect(trailing.height).toBe(leading.height);
  });

  it('gives the trailing button its width first when space is short', async () => {
    const el = await mount('style="width: 120px"', 'A much longer label');
    expect(part(el, 'trailing').getBoundingClientRect().width).toBe(48);
    expect(part(el, 'leading').getBoundingClientRect().width).toBe(120 - 48 - 2);
    // The label wraps in what is left, and both buttons grow taller.
    expect(part(el, 'leading').getBoundingClientRect().height).toBeGreaterThan(40);
    expect(part(el, 'trailing').getBoundingClientRect().height).toBe(
      part(el, 'leading').getBoundingClientRect().height,
    );
  });

  it('keeps the trailing button whole at any size (it is measured first)', async () => {
    const el = await mount('size="xl" style="width: 300px"', 'A much longer label');
    // 43 + 50 + 43.
    expect(part(el, 'trailing').getBoundingClientRect().width).toBe(136);
    expect(part(el, 'leading').getBoundingClientRect().width).toBe(300 - 136 - 2);
  });

  it('given more width, places the buttons from the start at their own widths', async () => {
    const el = await mount('style="width: 400px"');
    const host = el.getBoundingClientRect();
    const leading = part(el, 'leading').getBoundingClientRect();
    const trailing = part(el, 'trailing').getBoundingClientRect();
    expect(leading.left).toBe(host.left);
    expect(trailing.width).toBe(48);
    expect(trailing.right).toBeLessThan(host.right);
  });
});

describe('rx-split-button shapes', () => {
  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: outer corners full, inner ${want.inner}dp, ${want.pressed}dp pressed; checked round`, async () => {
      setMotionDurationScale(0);
      const el = await mount(`size="${size}"`);
      await frames(2);
      const half = want.height / 2;
      expect(corners(part(el, 'leading'))).toEqual([half, want.inner, want.inner, half]);
      expect(corners(part(el, 'trailing'))).toEqual([want.inner, half, half, want.inner]);
      press(part(el, 'leading'));
      await frames(2);
      expect(corners(part(el, 'leading'))).toEqual([half, want.pressed, want.pressed, half]);
      release(part(el, 'leading'));
      press(part(el, 'trailing'));
      await frames(2);
      expect(corners(part(el, 'trailing'))).toEqual([want.pressed, half, half, want.pressed]);
      release(part(el, 'trailing'));
      el.checked = true;
      await el.updateComplete;
      await frames(2);
      const box = part(el, 'trailing').getBoundingClientRect();
      const round = Math.min(box.width, box.height) / 2;
      expect(corners(part(el, 'trailing'))).toEqual([round, round, round, round]);
      // Pressed wins over checked.
      press(part(el, 'trailing'));
      await frames(2);
      expect(corners(part(el, 'trailing'))).toEqual([want.pressed, half, half, want.pressed]);
      release(part(el, 'trailing'));
    });
  }

  it('morphs on the default effects spring, and on to a new size without a jump (no key)', async () => {
    const el = await mount();
    const spec = (el.trailingShapeState as unknown as {spec: () => object}).spec();
    expect(spec).toMatchObject({dampingRatio: 1, stiffness: 1600});
    const clock = manualFrames();
    try {
      clock.step(2);
      el.size = 'l';
      await el.updateComplete;
      clock.step(2);
      // Still the same morph state, part way to the large shape.
      expect(el.trailingShapeState!.progress.isRunning).toBe(true);
      const inner = corners(part(el, 'trailing'))[0];
      expect(inner).toBeGreaterThan(4);
      expect(inner).toBeLessThan(8);
    } finally {
      clock.restore();
    }
  });

  it('centers the trailing content optically', async () => {
    setMotionDurationScale(0);
    const el = await mount();
    await frames(2);
    // round(0.11 * ((4 + 4) / 2 - (20 + 20) / 2)) = round(-1.76) = -2: toward the start.
    expect(offset(el)).toBe(-2);
    press(part(el, 'trailing'));
    await frames(2);
    // Pressed inner corners 12: round(0.11 * (12 - 20)) = -1.
    expect(offset(el)).toBe(-1);
    release(part(el, 'trailing'));
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(offset(el)).toBe(0);
  });

  it('moves the content at most the padding on that side', async () => {
    setMotionDurationScale(0);
    // A narrower start padding than the tokens give (the tokens never reach the cap).
    const el = await mount('style="--_trailing-start: 1px"');
    await frames(2);
    expect(offset(el)).toBe(-1);
  });

  it('mirrors the shapes and the optical offset in right-to-left text', async () => {
    setMotionDurationScale(0);
    document.documentElement.dir = 'rtl';
    const el = await mount();
    await frames(2);
    const leading = getComputedStyle(part(el, 'leading'));
    expect(parseFloat(leading.borderTopRightRadius)).toBe(20);
    expect(parseFloat(leading.borderTopLeftRadius)).toBe(4);
    expect(offset(el)).toBe(2);
  });

  it('follows a change of direction after it is drawn', async () => {
    setMotionDurationScale(0);
    const el = await mount();
    await frames(2);
    expect(offset(el)).toBe(-2);
    document.documentElement.dir = 'rtl';
    expect(offset(el)).toBe(2);
  });
});

describe('rx-split-button checked', () => {
  it('lays the content color at 10% over the trailing button when checked', async () => {
    const el = await mount();
    const overlay = () => getComputedStyle(part(el, 'trailing'), '::after');
    expect(overlay().opacity).toBe('0');
    el.checked = true;
    await el.updateComplete;
    expect(overlay().opacity).toBe('0.1');
    expect(overlay().backgroundColor).toBe(color('on-primary'));
  });

  it('turns the chevron over on the default spring', async () => {
    const el = await mount();
    expect(el.chevronRotation).toBe(0);
    const clock = manualFrames();
    try {
      el.checked = true;
      await el.updateComplete;
      clock.step(3);
      expect(el.chevronRotation).toBeGreaterThan(0);
      expect(el.chevronRotation).toBeLessThan(180);
      clock.step(60);
      expect(el.chevronRotation).toBe(180);
      const chevron = el.shadowRoot!.querySelector('.chevron') as HTMLElement;
      expect(chevron.style.rotate).toBe('180deg');
    } finally {
      clock.restore();
    }
  });

  it('starts turned over when it starts checked', async () => {
    const el = await mount('checked');
    expect(el.chevronRotation).toBe(180);
  });
});

// The test's own copy of the colors (ButtonDefaults, as Button).
const COLORS = {
  filled: ['primary', 'on-primary'],
  tonal: ['secondary-container', 'on-secondary-container'],
  elevated: ['surface-container-low', 'primary'],
  outlined: [null, 'on-surface-variant'],
} as const;

describe('rx-split-button colors and elevation', () => {
  for (const [variant, [container, content]] of Object.entries(COLORS)) {
    it(`${variant}`, async () => {
      const el = await mount(`variant="${variant}"`);
      for (const name of ['leading', 'trailing'] as const) {
        const s = getComputedStyle(part(el, name));
        expect(s.backgroundColor).toBe(container ? color(container) : 'rgba(0, 0, 0, 0)');
        expect(s.color).toBe(color(content));
      }
      el.disabled = true;
      await el.updateComplete;
      const s = getComputedStyle(part(el, 'trailing'));
      expect(s.color).toBe(color(variant === 'tonal' ? 'on-surface' : 'on-surface-variant', 0.38));
    });
  }

  it('outlined: a 1dp outline-variant border on both buttons', async () => {
    const el = await mount('variant="outlined"');
    for (const name of ['leading', 'trailing'] as const) {
      const border = getComputedStyle(part(el, name), '::before');
      expect(border.borderTopWidth).toBe('1px');
      expect(border.borderTopColor).toBe(color('outline-variant'));
    }
  });

  it('each button rises on its own hover (elevated)', async () => {
    const el = await mount('variant="elevated"');
    expect(el.elevations).toEqual({default: 1, pressed: 1, focused: 1, hovered: 3, disabled: 0});
    // The test's own copy of the other variants' ButtonElevation.
    el.variant = 'tonal';
    await el.updateComplete;
    expect(el.elevations).toEqual({default: 0, pressed: 0, focused: 0, hovered: 1, disabled: 0});
    el.variant = 'outlined';
    await el.updateComplete;
    expect(el.elevations).toBeNull();
    el.variant = 'elevated';
    await el.updateComplete;
    await userEvent.hover(part(el, 'leading'));
    await new Promise((r) => setTimeout(r, 250));
    const elevation = (name: 'leading' | 'trailing') =>
      parseFloat(getComputedStyle(part(el, name)).getPropertyValue('--rx-elevation'));
    expect(elevation('leading')).toBe(3);
    expect(elevation('trailing')).toBe(1);
  });
});

describe('rx-split-button behaviour', () => {
  it('has two buttons for assistive technology; the trailing one is expanded or collapsed', async () => {
    const el = await mount();
    expect(part(el, 'leading').getAttribute('role')).toBe('button');
    const trailing = part(el, 'trailing');
    expect(trailing.getAttribute('role')).toBe('button');
    expect(trailing.getAttribute('aria-label')).toBe('More');
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
    el.checked = true;
    await el.updateComplete;
    expect(trailing.getAttribute('aria-expanded')).toBe('true');
  });

  it('the leading button fires leading-click; the trailing one toggles checked', async () => {
    const el = await mount();
    const events: string[] = [];
    for (const type of ['leading-click', 'input', 'change']) {
      el.addEventListener(type, () => events.push(type));
    }
    await userEvent.click(part(el, 'leading'));
    expect(events).toEqual(['leading-click']);
    expect(el.checked).toBe(false);
    await userEvent.click(part(el, 'trailing'));
    expect(el.checked).toBe(true);
    expect(events).toEqual(['leading-click', 'input', 'change']);
  });

  it('works with Enter and Space on each button', async () => {
    const el = await mount();
    let clicks = 0;
    el.addEventListener('leading-click', () => clicks++);
    part(el, 'leading').focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
    part(el, 'trailing').focus();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(true);
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(false);
  });

  it('disabled: no events, out of the tab order', async () => {
    const el = await mount('disabled');
    let events = 0;
    el.addEventListener('leading-click', () => events++);
    el.addEventListener('change', () => events++);
    part(el, 'leading').click();
    part(el, 'trailing').click();
    expect(events).toBe(0);
    expect(part(el, 'leading').tabIndex).toBe(-1);
    expect(part(el, 'trailing').getAttribute('aria-disabled')).toBe('true');
  });
});
