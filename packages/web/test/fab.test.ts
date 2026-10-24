import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/fab/fab.js';
import '../src/icon/icon.js';
import type {RxFab} from '../src/fab/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-fab') as RxFab;
  await el.updateComplete;
  return el;
}

const container = (el: RxFab) => el.shadowRoot!.querySelector('.fab') as HTMLElement;
const elevation = (el: RxFab) =>
  parseFloat(getComputedStyle(container(el)).getPropertyValue('--rx-elevation'));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

/** A color role as the browser computes it. */
function color(role: string) {
  const probe = document.createElement('i');
  probe.style.color = `var(--md-sys-color-${role})`;
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

/*
 * The test's own copy of each size (FabSmallTokens, FabBaselineTokens,
 * FabMediumTokens, FabLargeTokens and FloatingActionButtonDefaults): the
 * container, its corners (CornerMedium, CornerLarge, ShapeDefaults
 * .LargeIncreased, CornerExtraLarge) and the icon size (MediumIconSize 28dp,
 * LargeIconSize 36dp where the token says 32dp).
 */
const SIZES = {
  small: {size: 40, corner: 12, icon: 24, target: 48},
  baseline: {size: 56, corner: 16, icon: 24, target: 56},
  medium: {size: 80, corner: 20, icon: 28, target: 80},
  large: {size: 96, corner: 28, icon: 36, target: 96},
} as const;

describe('rx-fab sizes', () => {
  for (const [size, want] of Object.entries(SIZES)) {
    it(`${size}: ${want.size}dp, ${want.corner}dp corners, ${want.icon}dp icon`, async () => {
      const attr = size === 'baseline' ? '' : ` size="${size}"`;
      const el = await mount(`<rx-fab${attr}><rx-icon label="Add">add</rx-icon></rx-fab>`);
      const box = container(el).getBoundingClientRect();
      expect([box.width, box.height]).toEqual([want.size, want.size]);
      expect(getComputedStyle(container(el)).borderTopLeftRadius).toBe(`${want.corner}px`);
      const icon = el.querySelector('rx-icon')!.getBoundingClientRect();
      expect([icon.width, icon.height]).toEqual([want.icon, want.icon]);
      // The icon is centered.
      expect(icon.left - box.left).toBe((want.size - want.icon) / 2);
      // The touch target: at least 48dp.
      expect(el.getBoundingClientRect().width).toBe(want.target);
    });
  }

  it('is baseline by default', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    expect(el.size).toBe('baseline');
  });

  it('grows with wider content (sizeIn sets only minimums)', async () => {
    const el = await mount('<rx-fab><span style="display:block;width:70px">x</span></rx-fab>');
    expect(container(el).getBoundingClientRect().width).toBe(70);
    expect(container(el).getBoundingClientRect().height).toBe(56);
  });

  it('takes its shape from --rx-fab-shape', async () => {
    const el = await mount('<rx-fab style="--rx-fab-shape: 50%"></rx-fab>');
    expect(getComputedStyle(container(el)).borderTopLeftRadius).toBe('50%');
  });
});

describe('rx-fab colors', () => {
  // The test's own copy of the pairs (FabPrimaryContainerTokens,
  // FabSecondaryContainerTokens and MDC's fab_tokens.xml).
  const COLORS = {
    'primary-container': ['primary-container', 'on-primary-container'],
    'secondary-container': ['secondary-container', 'on-secondary-container'],
    'tertiary-container': ['tertiary-container', 'on-tertiary-container'],
    primary: ['primary', 'on-primary'],
    secondary: ['secondary', 'on-secondary'],
    tertiary: ['tertiary', 'on-tertiary'],
    surface: ['surface-container-high', 'primary'],
  } as const;

  for (const [name, [bg, fg]] of Object.entries(COLORS)) {
    it(`${name}: ${bg} with ${fg} content`, async () => {
      const el = await mount(`<rx-fab color="${name}"></rx-fab>`);
      const style = getComputedStyle(container(el));
      expect(style.backgroundColor).toBe(color(bg));
      expect(style.color).toBe(color(fg));
    });
  }

  it('is primary container by default', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    expect(getComputedStyle(container(el)).backgroundColor).toBe(color('primary-container'));
    expect(getComputedStyle(container(el)).color).toBe(color('on-primary-container'));
  });

  it('falls back to primary container for a color it does not know', async () => {
    const el = await mount('<rx-fab color="purple"></rx-fab>');
    expect(getComputedStyle(container(el)).backgroundColor).toBe(color('primary-container'));
    expect(getComputedStyle(container(el)).color).toBe(color('on-primary-container'));
  });

  it('takes colors from the custom properties', async () => {
    const el = await mount(
      '<rx-fab style="--rx-fab-container-color: rgb(1, 2, 3); --rx-fab-content-color: rgb(4, 5, 6)"></rx-fab>',
    );
    expect(getComputedStyle(container(el)).backgroundColor).toBe('rgb(1, 2, 3)');
    expect(getComputedStyle(container(el)).color).toBe('rgb(4, 5, 6)');
  });
});

describe('rx-fab elevation', () => {
  it('reads elevation(): level 3, level 4 hovered; lowered: level 1, level 2 hovered', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    expect(el.elevations).toEqual({default: 6, pressed: 6, focused: 6, hovered: 8, disabled: 6});
    expect(elevation(el)).toBe(6);
    el.lowered = true;
    await el.updateComplete;
    expect(el.elevations).toEqual({default: 1, pressed: 1, focused: 1, hovered: 3, disabled: 1});
    // New elevations snap (updateElevation), with no transition.
    expect(elevation(el)).toBe(1);
    expect(container(el).getAnimations()).toHaveLength(0);
  });

  it('rises on hover with a 120ms tween and settles back with the hover outgoing spec', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    setMotionDurationScale(20);
    const timing = () => container(el).getAnimations()[0]?.effect?.getTiming();
    await userEvent.hover(el);
    expect(timing()?.duration).toBe(120 * 20);
    expect(timing()?.easing).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    await nextFrame();
    await nextFrame();
    expect(elevation(el)).toBeGreaterThan(6);
    expect(elevation(el)).toBeLessThan(8);
    await userEvent.unhover(el);
    expect(timing()?.duration).toBe(120 * 20);
    expect(timing()?.easing).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
    setMotionDurationScale(0);
    await userEvent.hover(el);
    expect(elevation(el)).toBe(8);
  });

  it('lowered while hovered: snaps to the new hovered level (updateElevation)', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    setMotionDurationScale(0);
    await userEvent.hover(el);
    expect(elevation(el)).toBe(8);
    setMotionDurationScale(20);
    el.lowered = true;
    await el.updateComplete;
    expect(elevation(el)).toBe(3);
    expect(container(el).getAnimations()).toHaveLength(0);
  });

  it('a press without hover keeps level 3 (pressed is level 3 too)', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
    expect(elevation(el)).toBe(6);
    expect(container(el).getAnimations()).toHaveLength(0);
  });

  it('draws the shadow from the elevation', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    expect(getComputedStyle(container(el)).boxShadow).not.toBe('none');
  });
});

describe('rx-fab behaviour', () => {
  it('is a button in the tab order', async () => {
    const el = await mount('<rx-fab><rx-icon label="Compose">edit</rx-icon></rx-fab>');
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.hasAttribute('aria-disabled')).toBe(false);
  });

  it('clicks with Enter and Space', async () => {
    const el = await mount('<rx-fab></rx-fab>');
    let clicks = 0;
    el.addEventListener('click', () => clicks++);
    el.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(clicks).toBe(2);
  });

  it('is not a form control: pressing it in a form does not submit', async () => {
    document.body.innerHTML = '<form><rx-fab></rx-fab></form>';
    const form = document.querySelector('form')!;
    const el = document.querySelector('rx-fab') as RxFab;
    await el.updateComplete;
    let submitted = false;
    form.addEventListener('submit', (e) => {
      submitted = true;
      e.preventDefault();
    });
    el.click();
    expect(submitted).toBe(false);
  });
});
