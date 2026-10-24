import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/button/button.js';
import '../src/icon/icon.js';
import type {RxButton} from '../src/button/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-button') as RxButton;
  await el.updateComplete;
  return el;
}

const container = (el: RxButton) => el.shadowRoot!.querySelector('.button') as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await nextFrame();
};
/** The corner radius as drawn: CSS scales radii that don't fit (9999px) down to half the side. */
const radius = (el: RxButton) => {
  const box = container(el);
  const specified = parseFloat(getComputedStyle(box).borderTopLeftRadius);
  return Math.min(specified, Math.min(box.offsetWidth, box.offsetHeight) / 2);
};
const press = (el: RxButton) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: RxButton) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));

/** The font a typescale role gives, as the browser computes it. */
function typescale(role: string) {
  const probe = document.createElement('i');
  const token = (name: string) => `var(--md-sys-typescale-${role}-${name})`;
  probe.style.font = `${token('weight')} ${token('size')} / ${token('line-height')} ${token('font')}`;
  document.body.append(probe);
  const s = getComputedStyle(probe);
  const font = [s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily];
  probe.remove();
  return font;
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
 * The test's own copy of ButtonDefaults for each size (Button.kt and
 * ButtonXSmallTokens to ButtonXLargeTokens): container height,
 * contentPaddingFor (sides, vertical), iconSizeFor, iconSpacingFor,
 * textStyleFor, and shapesFor's pressed shape (CornerSmall 8dp, CornerMedium
 * 12dp, CornerLarge 16dp).
 */
const SIZES = {
  xs: {height: 32, sides: 12, vertical: 6, icon: 20, spacing: 4, type: 'label-large', pressed: 8},
  s: {height: 40, sides: 16, vertical: 10, icon: 20, spacing: 8, type: 'label-large', pressed: 8},
  m: {height: 56, sides: 24, vertical: 16, icon: 24, spacing: 8, type: 'title-medium', pressed: 12},
  l: {
    height: 96,
    sides: 48,
    vertical: 32,
    icon: 32,
    spacing: 12,
    type: 'headline-small',
    pressed: 16,
  },
  xl: {
    height: 136,
    sides: 64,
    vertical: 48,
    icon: 40,
    spacing: 16,
    type: 'headline-large',
    pressed: 16,
  },
} as const;

describe('rx-button sizes', () => {
  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: ${want.height}dp tall, contentPaddingFor, iconSizeFor, iconSpacingFor, textStyleFor`, async () => {
      const el = await mount(
        `<rx-button size="${size}"><rx-icon slot="icon">edit</rx-icon><span id="label">Label</span></rx-button>`,
      );
      const box = container(el).getBoundingClientRect();
      expect(box.height).toBe(want.height);
      expect(box.width).toBeGreaterThanOrEqual(58);
      // Never smaller than the 48dp touch target (an extra small button is centered in it).
      expect(el.getBoundingClientRect().height).toBe(Math.max(48, want.height));
      const s = getComputedStyle(container(el));
      expect([s.paddingLeft, s.paddingRight, s.paddingTop, s.paddingBottom]).toEqual(
        [want.sides, want.sides, want.vertical, want.vertical].map((v) => `${v}px`),
      );
      const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
      const label = document.getElementById('label')!.getBoundingClientRect();
      expect([icon.width, icon.height]).toEqual([want.icon, want.icon]);
      expect(label.left - icon.right).toBe(want.spacing);
      expect([s.fontSize, s.fontWeight, s.lineHeight, s.fontFamily]).toEqual(typescale(want.type));
    });
  }

  it('pads the same with or without icons, and for every variant', async () => {
    for (const [size, want] of Object.entries(SIZES)) {
      for (const variant of ['filled', 'text']) {
        for (const icons of ['', '<rx-icon slot="trailing-icon">add</rx-icon>']) {
          const el = await mount(
            `<rx-button size="${size}" variant="${variant}">${icons}Label</rx-button>`,
          );
          const s = getComputedStyle(container(el));
          expect([s.paddingLeft, s.paddingRight], `${size} ${variant} ${icons}`).toEqual([
            `${want.sides}px`,
            `${want.sides}px`,
          ]);
        }
      }
    }
  });

  it('keeps the 1dp outline at every size (outlinedButtonBorder)', async () => {
    for (const size of Object.keys(SIZES)) {
      const el = await mount(`<rx-button size="${size}" variant="outlined">Label</rx-button>`);
      expect(getComputedStyle(container(el), '::before').borderTopWidth, size).toBe('1px');
    }
  });

  it('is fully round by default; square is ButtonDefaults.squareShape (12dp) at every size', async () => {
    for (const [size, want] of Object.entries(SIZES)) {
      const round = await mount(`<rx-button size="${size}">Label</rx-button>`);
      expect(radius(round)).toBeGreaterThanOrEqual(want.height / 2);
      const square = await mount(`<rx-button size="${size}" shape="square">Label</rx-button>`);
      expect(radius(square), size).toBe(12);
    }
    const classic = await mount('<rx-button shape="square">Label</rx-button>');
    expect(radius(classic)).toBe(12);
  });

  it('puts the start padding at the start in right-to-left text', async () => {
    document.documentElement.dir = 'rtl';
    const el = await mount('<rx-button><rx-icon slot="icon">add</rx-icon>Label</rx-button>');
    const s = getComputedStyle(container(el));
    // ButtonWithIconContentPadding: 16dp start (the right), 24dp end.
    expect([s.paddingRight, s.paddingLeft]).toEqual(['16px', '24px']);
  });
});

describe('rx-button morph', () => {
  it("pads as the expressive overload's default, contentPaddingFor(MinHeight)", async () => {
    for (const markup of [
      '<rx-button morph>Label</rx-button>',
      '<rx-button morph><rx-icon slot="icon">add</rx-icon>Label</rx-button>',
      '<rx-button morph variant="text">Label</rx-button>',
      '<rx-button morph variant="text"><rx-icon slot="icon">add</rx-icon>Label</rx-button>',
    ]) {
      const el = await mount(markup);
      const s = getComputedStyle(container(el));
      expect([s.paddingLeft, s.paddingRight, s.paddingTop, s.paddingBottom], markup).toEqual([
        '16px',
        '16px',
        '10px',
        '10px',
      ]);
      expect(container(el).getBoundingClientRect().height).toBe(40);
    }
  });

  it("goes to shapesFor's pressed shape while pressed, and back", async () => {
    setMotionDurationScale(0);
    const cases = [['', 40, 8], ...Object.entries(SIZES).map(([s, w]) => [s, w.height, w.pressed])];
    for (const [size, height, pressed] of cases) {
      const el = await mount(`<rx-button morph ${size ? `size="${size}"` : ''}>Label</rx-button>`);
      expect(radius(el)).toBeGreaterThanOrEqual((height as number) / 2);
      press(el);
      await frames(2);
      expect(radius(el), `${size} pressed`).toBe(pressed);
      release(el);
      await frames(2);
      expect(radius(el), `${size} released`).toBeGreaterThanOrEqual((height as number) / 2);
    }
  });

  it('a square button presses to the same pressed shape', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-button morph shape="square" size="m">Label</rx-button>');
    expect(radius(el)).toBe(12);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(12);
    el.size = 'l';
    await el.updateComplete;
    await frames(2);
    // A new size is a new key(shapes): the new state starts on the shape for
    // the current press, without a morph.
    expect(radius(el)).toBe(16);
  });

  it('interpolates each corner in px from the real half height, not from 9999px', async () => {
    setMotionDurationScale(10);
    const el = await mount('<rx-button morph size="m">Label</rx-button>');
    const state = () =>
      (el as unknown as {shapeState: {progress: {value: number}}}).shapeState.progress;
    press(el);
    let last = 28;
    for (let i = 0; i < 6; i++) {
      await nextFrame();
      const p = state().value;
      // lerp(28, 12, p) on a 56dp button.
      expect(radius(el)).toBeCloseTo((1 - p) * 28 + p * 12, 3);
      // The default effects spring is critically damped: no bounce.
      expect(radius(el)).toBeLessThanOrEqual(last);
      expect(radius(el)).toBeGreaterThanOrEqual(12);
      last = radius(el);
    }
    expect(last).toBeLessThan(28);
    expect(last).toBeGreaterThan(12);
  });

  it('springs on the default effects spec (damping 1, stiffness 1600)', async () => {
    const el = await mount('<rx-button morph>Label</rx-button>');
    const spec = (el as unknown as {shapeState: {spec: () => object}}).shapeState.spec();
    expect(spec).toMatchObject({dampingRatio: 1, stiffness: 1600});
  });

  it('released mid-morph, turns back from the shape it shows', async () => {
    setMotionDurationScale(10);
    const el = await mount('<rx-button morph>Label</rx-button>');
    press(el);
    await frames(3);
    const before = radius(el);
    expect(before).toBeLessThan(20);
    expect(before).toBeGreaterThan(8);
    release(el);
    // No jump on release.
    expect(radius(el)).toBeCloseTo(before, 3);
    await frames(3);
    expect(radius(el)).toBeGreaterThan(before);
    setMotionDurationScale(0);
    await frames(3);
    // At rest, fully round again: half the height, in px.
    expect(container(el).style.getPropertyValue('border-start-start-radius')).toBe('20px');
    // It follows later size changes: a two-line label makes it taller.
    el.innerHTML = 'Two<br />lines';
    await frames(3);
    const height = container(el).getBoundingClientRect().height;
    expect(height).toBeGreaterThan(40);
    expect(container(el).style.getPropertyValue('border-start-start-radius')).toBe(
      `${height / 2}px`,
    );
  });

  it('morphs for a keyboard press, not for a disabled button', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-button morph>Label</rx-button>');
    el.focus();
    await userEvent.keyboard('{Space>}');
    await frames(2);
    expect(radius(el)).toBe(8);
    await userEvent.keyboard('{/Space}');
    await frames(2);
    expect(radius(el)).toBe(20);

    el.disabled = true;
    await el.updateComplete;
    press(el);
    await frames(2);
    expect(radius(el)).toBe(20);
  });

  it('turns back when disabled while pressed', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-button morph>Label</rx-button>');
    press(el);
    await frames(2);
    expect(radius(el)).toBe(8);
    el.disabled = true;
    await el.updateComplete;
    await frames(2);
    expect(radius(el)).toBe(20);
    // The press was cancelled: enabling it again under the same held pointer
    // does not bring the press back.
    el.disabled = false;
    await el.updateComplete;
    await frames(2);
    expect(radius(el)).toBe(20);
  });

  it('jumps to the new shapes without a morph when the size changes (key(shapes))', async () => {
    setMotionDurationScale(10);
    const el = await mount('<rx-button morph size="m">Label</rx-button>');
    press(el);
    await frames(2);
    el.size = 'l';
    await el.updateComplete;
    // Large's pressed shape at once, with no animation running towards it.
    expect(radius(el)).toBe(16);
    const state = (el as unknown as {shapeState: {progress: {isRunning: boolean}}}).shapeState;
    expect(state.progress.isRunning).toBe(false);
  });

  it('does nothing without morph, and lets go when morph is removed', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-button>Label</rx-button>');
    press(el);
    await frames(2);
    expect(radius(el)).toBe(20);
    release(el);
    el.morph = true;
    await el.updateComplete;
    press(el);
    await frames(2);
    expect(radius(el)).toBe(8);
    el.morph = false;
    await el.updateComplete;
    expect(container(el).style.cssText).not.toMatch(/radius/);
    expect(radius(el)).toBe(20);
  });

  it('takes its shapes from --rx-button-shape and --rx-button-pressed-shape', async () => {
    setMotionDurationScale(0);
    const el = await mount(
      '<rx-button morph style="--rx-button-shape: 6px; --rx-button-pressed-shape: 2px">Label</rx-button>',
    );
    expect(radius(el)).toBe(6);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(2);
  });

  it('switches without a morph between shapes it cannot interpolate', async () => {
    setMotionDurationScale(10);
    const el = await mount(
      '<rx-button morph style="--rx-button-pressed-shape: calc(1px + 3px)">Label</rx-button>',
    );
    press(el);
    await el.updateComplete;
    expect(radius(el)).toBe(4);
    release(el);
    expect(radius(el)).toBe(20);
  });

  it('follows a new theme value as a new key, at rest', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-button morph>Label</rx-button>');
    press(el);
    await frames(2);
    el.style.setProperty('--md-sys-shape-corner-small', '3px');
    release(el);
    await frames(2);
    press(el);
    await frames(2);
    expect(radius(el)).toBe(3);
  });
});
