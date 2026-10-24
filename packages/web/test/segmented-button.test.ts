import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/segmented-button/segmented-button.js';
import '../src/segmented-button/segmented-button-set.js';
import '../src/icon/icon.js';
import type {RxSegmentedButton, RxSegmentedButtonSet} from '../src/segmented-button/index.js';
import {FloatSpringSpec} from '../src/motion/spring.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {manualFrames} from './helpers/manual-frames.js';

// The test's own copy of Compose's numbers (SegmentedButton.kt and
// OutlinedSegmentedButtonTokens): ContentPadding's 12dp sides and 8dp top and
// bottom, the 18dp IconSize, the private 8dp IconSpacing, ButtonDefaults'
// 58dp MinWidth and 40dp MinHeight, the 1dp BorderWidth, and the 48dp
// minimum touch target.
const PADDING = 12;
const ICON = 18;
const SPACING = 8;
const MIN_WIDTH = 58;
const HEIGHT = 40;
const BORDER = 1;
const TOUCH = 48;
/** -(IconSize + IconSpacing) / 2: where the label sits with no icon. */
const NO_ICON_OFFSET = -13;
/** The expressive fast spatial spring (the default motion scheme). */
const FAST_SPATIAL = {damping: 0.6, stiffness: 800};

async function mountSet(markup: string) {
  document.body.innerHTML = markup;
  const set = document.querySelector('rx-segmented-button-set') as RxSegmentedButtonSet;
  await set.updateComplete;
  const items = [...set.querySelectorAll('rx-segmented-button')] as RxSegmentedButton[];
  await Promise.all(items.map((i) => i.updateComplete));
  await settle();
  return {set, items};
}

async function mountOne(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-segmented-button') as RxSegmentedButton;
  await el.updateComplete;
  return el;
}

/** Lets the set measure (a microtask after its buttons render) and lay out. */
const settle = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r));
};
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await nextFrame();
};
const button = (el: RxSegmentedButton) => el.shadowRoot!.querySelector('.button') as HTMLElement;
const part = (el: RxSegmentedButton, name: string) =>
  el.shadowRoot!.querySelector(`.${name}`) as HTMLElement;
const rect = (el: Element) => el.getBoundingClientRect();
/** A corner as drawn: CSS scales 9999px down to half the shorter side. */
const corner = (
  el: RxSegmentedButton,
  which: 'TopLeft' | 'TopRight' | 'BottomLeft' | 'BottomRight',
) => {
  const box = button(el);
  const specified = parseFloat(getComputedStyle(box)[`border${which}Radius`]);
  return Math.min(specified, Math.min(box.offsetWidth, box.offsetHeight) / 2);
};
const press = (el: HTMLElement) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: HTMLElement) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));

/** The width of a word in the label large style, rounded up as Compose's text. */
function wordWidth(word: string) {
  const span = document.createElement('span');
  span.textContent = word;
  span.style.cssText =
    'position:absolute;white-space:nowrap;font:var(--md-sys-typescale-label-large-weight) ' +
    'var(--md-sys-typescale-label-large-size)/var(--md-sys-typescale-label-large-line-height) ' +
    'var(--md-sys-typescale-label-large-font);letter-spacing:var(--md-sys-typescale-label-large-tracking)';
  document.body.append(span);
  const width = rect(span).width;
  span.remove();
  return Math.ceil(width);
}

/** A segmented button's minIntrinsicWidth for a label, as Compose works it out. */
const intrinsic = (label: string) =>
  Math.max(
    MIN_WIDTH,
    PADDING + Math.max(ICON, 0) + SPACING + Math.max(...label.split(' ').map(wordWidth)) + PADDING,
  );

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

const outlineColor = (el: RxSegmentedButton) =>
  getComputedStyle(part(el, 'outline')).borderTopColor;

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

describe('rx-segmented-button-set layout', () => {
  const DAYS = `<rx-segmented-button-set>
    <rx-segmented-button checked>Day</rx-segmented-button>
    <rx-segmented-button>Month</rx-segmented-button>
    <rx-segmented-button>Week</rx-segmented-button>
  </rx-segmented-button-set>`;

  it("is as wide as the widest button's minIntrinsicWidth times the count, less the overlaps", async () => {
    const {set, items} = await mountSet(DAYS);
    const widest = Math.max(...['Day', 'Month', 'Week'].map(intrinsic));
    expect(rect(set).width).toBe(3 * widest - 2 * BORDER);
    for (const item of items) expect(rect(item).width).toBe(widest);
  });

  it('overlaps the buttons by the border width', async () => {
    const {items} = await mountSet(DAYS);
    for (let i = 1; i < items.length; i++) {
      expect(rect(items[i]).left).toBeCloseTo(rect(items[i - 1]).right - BORDER, 5);
    }
  });

  it('sizes from the longest word, so a label of two words wraps and its button grows taller', async () => {
    const {set, items} = await mountSet(`<rx-segmented-button-set>
      <rx-segmented-button checked>Today</rx-segmented-button>
      <rx-segmented-button>Last weekend</rx-segmented-button>
      <rx-segmented-button>All time</rx-segmented-button>
    </rx-segmented-button-set>`);
    const widest = Math.max(...['Today', 'Last weekend', 'All time'].map(intrinsic));
    expect(rect(set).width).toBe(3 * widest - 2 * BORDER);
    // Two lines of 20dp, plus 8dp above and below.
    expect(rect(button(items[1])).height).toBe(56);
    // Row's CenterVertically: the others stay 40dp, centered.
    expect(rect(button(items[0])).height).toBe(HEIGHT);
    const middle = (r: DOMRect) => r.top + r.height / 2;
    expect(middle(rect(button(items[0])))).toBeCloseTo(middle(rect(button(items[1]))), 5);
    // The wrapped label is measured with the whole padded width, as Compose's Box gives it.
    expect(rect(part(items[1], 'label')).width).toBeCloseTo(
      rect(button(items[1])).width - 2 * PADDING,
      3,
    );
  });

  it('makes no button narrower than ButtonDefaults.MinWidth', async () => {
    const {set, items} = await mountSet(`<rx-segmented-button-set>
      <rx-segmented-button>i</rx-segmented-button><rx-segmented-button>l</rx-segmented-button>
    </rx-segmented-button-set>`);
    expect(intrinsic('i')).toBe(MIN_WIDTH);
    expect(rect(set).width).toBe(2 * MIN_WIDTH - BORDER);
    expect(rect(button(items[0])).width).toBe(MIN_WIDTH);
  });

  it('counts a larger minimum touch target in the width', async () => {
    const {set} =
      await mountSet(`<rx-segmented-button-set style="--rx-minimum-interactive-component-size: 72px">
      <rx-segmented-button>i</rx-segmented-button><rx-segmented-button>l</rx-segmented-button>
    </rx-segmented-button-set>`);
    expect(rect(set).width).toBe(2 * 72 - BORDER);
  });

  it('is never wider than the room it has (the width is coerced), and the buttons stay equal', async () => {
    const {set, items} = await mountSet(`<div style="width: 150px">${DAYS}</div>`);
    expect(rect(set).width).toBe(150);
    // To the browser's 1/64px layout unit.
    const widths = items.map((i) => rect(i).width);
    for (const width of widths)
      expect(Math.abs(width - (150 + 2 * BORDER) / 3)).toBeLessThan(1 / 32);
    // The visible buttons too: the row's fixed widths win over the 58dp
    // minimum, and the shape clips the label that no longer fits.
    for (const item of items) {
      expect(Math.abs(rect(button(item)).width - (150 + 2 * BORDER) / 3)).toBeLessThan(1 / 32);
      expect(getComputedStyle(part(item, 'clip')).overflow).toBe('hidden');
    }
  });

  it('lets the buttons shrink below the 48dp touch target width when the row is that short of room', async () => {
    const {items} = await mountSet(`<div style="width: 120px">${DAYS}</div>`);
    for (const item of items) {
      expect(Math.abs(rect(item).width - (120 + 2 * BORDER) / 3)).toBeLessThan(1 / 32);
      expect(Math.abs(rect(button(item)).width - (120 + 2 * BORDER) / 3)).toBeLessThan(1 / 32);
    }
  });

  it('given a width, shares it equally (weight 1 each)', async () => {
    const {items} = await mountSet(
      DAYS.replace('<rx-segmented-button-set>', '<rx-segmented-button-set style="width: 400px">'),
    );
    for (const item of items) expect(rect(item).width).toBeCloseTo((400 + 2 * BORDER) / 3, 3);
  });

  it('measures again when a label changes', async () => {
    const {set, items} = await mountSet(DAYS);
    items[1].textContent = 'Fortnightly';
    await settle();
    expect(rect(set).width).toBe(3 * intrinsic('Fortnightly') - 2 * BORDER);
  });

  it('lays out a 48dp touch target around the 40dp button', async () => {
    const {set, items} = await mountSet(DAYS);
    expect(rect(items[0]).height).toBe(TOUCH);
    expect(rect(set).height).toBe(TOUCH);
    expect(rect(button(items[0])).height).toBe(HEIGHT);
  });

  it('rounds the outer ends only (itemShape)', async () => {
    const {items} = await mountSet(DAYS);
    const half = HEIGHT / 2;
    const corners = (el: RxSegmentedButton) =>
      (['TopLeft', 'BottomLeft', 'TopRight', 'BottomRight'] as const).map((c) => corner(el, c));
    expect(corners(items[0])).toEqual([half, half, 0, 0]);
    expect(corners(items[1])).toEqual([0, 0, 0, 0]);
    expect(corners(items[2])).toEqual([0, 0, half, half]);
  });

  it('rounds a lone button all round (count 1), and flips the ends in right-to-left text', async () => {
    let {items} = await mountSet(
      '<rx-segmented-button-set><rx-segmented-button>One</rx-segmented-button></rx-segmented-button-set>',
    );
    expect(corner(items[0], 'TopLeft')).toBe(20);
    expect(corner(items[0], 'BottomRight')).toBe(20);
    ({items} = await mountSet(`<div dir="rtl">${DAYS}</div>`));
    expect(rect(items[0]).left).toBeGreaterThan(rect(items[1]).left);
    expect(corner(items[0], 'TopRight')).toBe(20);
    expect(corner(items[0], 'TopLeft')).toBe(0);
    expect(corner(items[2], 'BottomLeft')).toBe(20);
  });

  it('takes its outer corners from --rx-segmented-button-shape', async () => {
    const {items} = await mountSet(
      DAYS.replace(
        '<rx-segmented-button-set>',
        '<rx-segmented-button-set style="--rx-segmented-button-shape: 8px">',
      ),
    );
    expect(corner(items[0], 'TopLeft')).toBe(8);
    expect(corner(items[0], 'TopRight')).toBe(0);
    expect(corner(items[2], 'BottomRight')).toBe(8);
  });
});

describe('rx-segmented-button colors', () => {
  it('off: no container, on-surface content, an outline border', async () => {
    const el = await mountOne('<rx-segmented-button>A</rx-segmented-button>');
    const style = getComputedStyle(button(el));
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(style.color).toBe(color('on-surface'));
    expect(outlineColor(el)).toBe(color('outline'));
    expect(getComputedStyle(part(el, 'outline')).borderTopWidth).toBe(`${BORDER}px`);
  });

  it('on: secondary container, on-secondary-container content, the same outline', async () => {
    const el = await mountOne('<rx-segmented-button checked>A</rx-segmented-button>');
    const style = getComputedStyle(button(el));
    expect(style.backgroundColor).toBe(color('secondary-container'));
    expect(style.color).toBe(color('on-secondary-container'));
    expect(outlineColor(el)).toBe(color('outline'));
  });

  it('disabled: on-surface at 38%, the outline at 12%; the checked container stays', async () => {
    const off = await mountOne('<rx-segmented-button disabled>A</rx-segmented-button>');
    expect(getComputedStyle(button(off)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(button(off)).color).toBe(color('on-surface', 0.38));
    expect(outlineColor(off)).toBe(color('outline', 0.12));
    const on = await mountOne('<rx-segmented-button disabled checked>A</rx-segmented-button>');
    expect(getComputedStyle(button(on)).backgroundColor).toBe(color('secondary-container'));
    expect(getComputedStyle(button(on)).color).toBe(color('on-surface', 0.38));
    expect(outlineColor(on)).toBe(color('outline', 0.12));
  });

  it('draws the border over the content and the ripple', async () => {
    const el = await mountOne('<rx-segmented-button>A</rx-segmented-button>');
    const order = [...button(el).children].map(
      (c) => c.localName + (c.className ? '.' + c.className : ''),
    );
    expect(order.indexOf('span.outline')).toBe(order.length - 1);
    expect(order.indexOf('rx-ripple')).toBeGreaterThan(order.indexOf('span.clip'));
  });
});

describe('rx-segmented-button z order (interactionZIndex)', () => {
  const z = (el: HTMLElement) => Number(getComputedStyle(el).zIndex);

  it('5 when checked, plus one while pressed', async () => {
    const {items} = await mountSet(`<rx-segmented-button-set selection="multi">
      <rx-segmented-button checked>A</rx-segmented-button><rx-segmented-button>B</rx-segmented-button>
    </rx-segmented-button-set>`);
    expect(z(items[0])).toBe(5);
    expect(z(items[1])).toBe(0);
    press(items[1]);
    expect(z(items[1])).toBe(1);
    press(items[0]);
    expect(z(items[0])).toBe(6);
    release(items[0]);
    release(items[1]);
    expect(z(items[0])).toBe(5);
    expect(z(items[1])).toBe(0);
  });

  it('above any neighbour with keyboard focus, so its focus ring shows', async () => {
    const {items} = await mountSet(`<rx-segmented-button-set>
      <rx-segmented-button checked>A</rx-segmented-button><rx-segmented-button>B</rx-segmented-button>
    </rx-segmented-button-set>`);
    items[0].focus();
    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(items[1]);
    expect(z(items[1])).toBeGreaterThan(z(items[0]) + 1);
  });

  it('a disabled button is not lifted by a press', async () => {
    const el = await mountOne('<rx-segmented-button disabled>A</rx-segmented-button>');
    press(el);
    expect(z(el)).toBe(0);
  });
});

describe('rx-segmented-button selection', () => {
  it('single (the default): a radio group of radio buttons, one on at a time', async () => {
    const {set, items} = await mountSet(`<rx-segmented-button-set>
      <rx-segmented-button checked>A</rx-segmented-button>
      <rx-segmented-button>B</rx-segmented-button>
      <rx-segmented-button>C</rx-segmented-button>
    </rx-segmented-button-set>`);
    expect(set.getAttribute('role')).toBe('radiogroup');
    expect(set.hasAttribute('tabindex')).toBe(false);
    expect(items.map((i) => i.getAttribute('role'))).toEqual(['radio', 'radio', 'radio']);
    let changes = 0;
    set.addEventListener('change', () => changes++);
    items[2].click();
    await set.updateComplete;
    expect(items.map((i) => i.checked)).toEqual([false, false, true]);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true']);
    expect(changes).toBe(1);
    // Pressing the one that is on keeps it on, and fires nothing.
    items[2].click();
    expect(items[2].checked).toBe(true);
    expect(changes).toBe(1);
  });

  it('multi: checkboxes, each on its own; no group role', async () => {
    const {set, items} = await mountSet(`<rx-segmented-button-set selection="multi">
      <rx-segmented-button checked>A</rx-segmented-button>
      <rx-segmented-button>B</rx-segmented-button>
    </rx-segmented-button-set>`);
    expect(set.hasAttribute('role')).toBe(false);
    expect(items.map((i) => i.getAttribute('role'))).toEqual(['checkbox', 'checkbox']);
    items[1].click();
    expect(items.map((i) => i.checked)).toEqual([true, true]);
    items[0].click();
    expect(items.map((i) => i.checked)).toEqual([false, true]);
  });

  it('switching selection changes the roles', async () => {
    const {set, items} = await mountSet(`<rx-segmented-button-set>
      <rx-segmented-button>A</rx-segmented-button></rx-segmented-button-set>`);
    set.selection = 'multi';
    await set.updateComplete;
    await items[0].updateComplete;
    expect(items[0].getAttribute('role')).toBe('checkbox');
    expect(set.hasAttribute('role')).toBe(false);
  });

  it('toggles on click and Space (not Enter), firing input and change', async () => {
    const el = await mountOne('<rx-segmented-button>A</rx-segmented-button>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(el.checked).toBe(false);
    await userEvent.keyboard(' ');
    expect(el.checked).toBe(true);
    expect(events).toEqual(['input', 'change']);
  });

  it('does not toggle when disabled', async () => {
    const el = await mountOne('<rx-segmented-button disabled>A</rx-segmented-button>');
    el.click();
    expect(el.checked).toBe(false);
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.hasAttribute('tabindex')).toBe(false);
  });

  it('is a form control: submits its value when checked, and resets to its attribute', async () => {
    document.body.innerHTML = `<form>
      <rx-segmented-button name="period" value="day" checked>Day</rx-segmented-button>
      <rx-segmented-button name="period" value="week">Week</rx-segmented-button>
    </form>`;
    const form = document.querySelector('form')!;
    const [day, week] = [...form.querySelectorAll('rx-segmented-button')] as RxSegmentedButton[];
    await Promise.all([day.updateComplete, week.updateComplete]);
    expect(new FormData(form).getAll('period')).toEqual(['day']);
    week.click();
    await week.updateComplete;
    expect(new FormData(form).getAll('period')).toEqual(['day', 'week']);
    form.reset();
    await week.updateComplete;
    expect(week.checked).toBe(false);
    expect(day.checked).toBe(true);
  });
});

describe('rx-segmented-button content', () => {
  const offset = (el: RxSegmentedButton) => el.contentState.offset;
  const translate = (el: RxSegmentedButton) =>
    parseFloat(getComputedStyle(part(el, 'label')).translate) || 0;
  const centre = (r: DOMRect) => r.left + r.width / 2;

  it('unchecked: no checkmark, the label moved back to the middle', async () => {
    const el = await mountOne('<rx-segmented-button>Label</rx-segmented-button>');
    expect(part(el, 'check').hidden).toBe(true);
    expect(offset(el)).toBe(NO_ICON_OFFSET);
    expect(translate(el)).toBe(NO_ICON_OFFSET);
    expect(centre(rect(part(el, 'label')))).toBeCloseTo(centre(rect(button(el))), 0);
  });

  it('checked: the checkmark at the start, the label after it', async () => {
    const el = await mountOne('<rx-segmented-button checked>Label</rx-segmented-button>');
    const check = part(el, 'check');
    expect(check.hidden).toBe(false);
    expect(offset(el)).toBe(0);
    expect(rect(check).width).toBe(ICON);
    expect(rect(part(el, 'label')).left - rect(check).left).toBe(ICON + SPACING);
    // The row of icon and label is centered in the padded box.
    const row = rect(part(el, 'content'));
    expect(centre(row)).toBeCloseTo(centre(rect(button(el))), 0);
  });

  it('checking: the checkmark fades and scales in from 0 while the label springs over in whole pixels', async () => {
    const el = await mountOne('<rx-segmented-button>Label</rx-segmented-button>');
    const clock = manualFrames();
    try {
      el.checked = true;
      await el.updateComplete;
      // Nothing moves before the first frame.
      expect(el.contentState).toMatchObject({offset: NO_ICON_OFFSET, checkAlpha: 0, checkScale: 0});
      expect(part(el, 'check').hidden).toBe(false);
      const spec = new FloatSpringSpec(FAST_SPATIAL.damping, FAST_SPATIAL.stiffness, 0.01);
      const effects = new FloatSpringSpec(1, 1600, 0.01);
      const seen: number[] = [];
      const want: number[] = [];
      for (let i = 0; i < 40; i++) {
        clock.step();
        if (i < 10) {
          expect(el.contentState.checkScale).toBeCloseTo(
            spec.getValueFromNanos(i * 16e6, 0, 1, 0),
            5,
          );
          expect(el.contentState.checkAlpha).toBeCloseTo(
            effects.getValueFromNanos(i * 16e6, 0, 1, 0),
            5,
          );
        }
        seen.push(offset(el));
        // Int.VectorConverter: each frame's value cut toward zero.
        want.push(Math.trunc(spec.getValueFromNanos(i * 16e6, NO_ICON_OFFSET, 0, 0)) + 0);
      }
      expect(seen).toEqual(want);
      // The checkmark: scaleIn on fast spatial (it overshoots past 1),
      // fadeIn on default effects (it doesn't).
      // The fast spatial spring overshoots past 0 by a pixel.
      expect(Math.max(...seen)).toBe(1);
      expect(el.contentState).toMatchObject({offset: 0, checkAlpha: 1, checkScale: 1});
    } finally {
      clock.restore();
    }
  });

  it('scales the checkmark from its bottom left corner', async () => {
    const el = await mountOne('<rx-segmented-button checked>Label</rx-segmented-button>');
    expect(getComputedStyle(part(el, 'check')).transformOrigin).toBe(`0px ${ICON}px`);
  });

  it('unchecking: the checkmark goes at once and the label springs back', async () => {
    const el = await mountOne('<rx-segmented-button checked>Label</rx-segmented-button>');
    const clock = manualFrames();
    try {
      el.checked = false;
      await el.updateComplete;
      expect(part(el, 'check').hidden).toBe(true);
      expect(offset(el)).toBe(0);
      clock.step(3);
      expect(offset(el)).toBeLessThan(0);
      expect(offset(el)).toBeGreaterThan(NO_ICON_OFFSET);
      expect(Number.isInteger(offset(el))).toBe(true);
      clock.step(60);
      expect(offset(el)).toBe(NO_ICON_OFFSET);
    } finally {
      clock.restore();
    }
  });

  it('turned back on mid-slide, carries on from the whole pixel it shows', async () => {
    const el = await mountOne('<rx-segmented-button checked>Label</rx-segmented-button>');
    const clock = manualFrames();
    try {
      el.checked = false;
      await el.updateComplete;
      clock.step(3);
      const at = offset(el);
      el.checked = true;
      await el.updateComplete;
      expect(offset(el)).toBe(at);
      expect(el.contentState.offsetTarget).toBe(0);
      clock.step(60);
      expect(offset(el)).toBe(0);
    } finally {
      clock.restore();
    }
  });

  it('with an icon: the icon while off, crossfading with the checkmark; the label stays put', async () => {
    const el = await mountOne(
      '<rx-segmented-button><rx-icon slot="icon">star</rx-icon>Favorites</rx-segmented-button>',
    );
    await el.updateComplete;
    expect(el.contentState).toMatchObject({offset: 0, checkAlpha: 0, inactiveAlpha: 1});
    expect(part(el, 'inactive').hidden).toBe(false);
    setMotionDurationScale(10);
    el.checked = true;
    await el.updateComplete;
    await frames(4);
    const mid = el.contentState;
    expect(mid.checkAlpha).toBeGreaterThan(0);
    expect(mid.checkAlpha).toBeLessThan(1);
    expect(mid.inactiveAlpha).toBeGreaterThan(0);
    expect(mid.inactiveAlpha).toBeLessThan(1);
    // A plain crossfade: no scale.
    expect(mid.checkScale).toBe(1);
    expect(mid.offset).toBe(0);
    setMotionDurationScale(0);
    await frames(3);
    expect(el.contentState).toMatchObject({checkAlpha: 1, inactiveAlpha: 0, offset: 0});
    expect(part(el, 'inactive').hidden).toBe(true);
  });

  it('moves the label back by -(IconSize + IconSpacing) / 2 in whole pixels, cut toward zero', async () => {
    const el = await mountOne(
      '<rx-segmented-button style="--md-comp-outlined-segmented-button-icon-size: 21px">L</rx-segmented-button>',
    );
    // -(21 + 8) / 2 in Kotlin's Int arithmetic.
    expect(offset(el)).toBe(-14);
  });

  it('no-checkmark: nothing when checked, the label stays in the middle', async () => {
    const el = await mountOne('<rx-segmented-button no-checkmark>L</rx-segmented-button>');
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(part(el, 'check').hidden).toBe(true);
    expect(el.contentState.offsetTarget).toBe(NO_ICON_OFFSET);
  });

  it('no-checkmark with an icon: the icon always shows', async () => {
    const el = await mountOne(
      '<rx-segmented-button no-checkmark checked><rx-icon slot="icon">star</rx-icon>L</rx-segmented-button>',
    );
    await el.updateComplete;
    expect(part(el, 'inactive').hidden).toBe(false);
    expect(part(el, 'check').hidden).toBe(true);
    expect(el.contentState.offset).toBe(0);
  });

  it('right to left: the checkmark at the start (the right), the label moved the other way', async () => {
    document.body.innerHTML =
      '<div dir="rtl"><rx-segmented-button>Label</rx-segmented-button></div>';
    const el = document.querySelector('rx-segmented-button') as RxSegmentedButton;
    await el.updateComplete;
    expect(translate(el)).toBe(-NO_ICON_OFFSET);
    el.checked = true;
    await el.updateComplete;
    setMotionDurationScale(0);
    await frames(3);
    expect(rect(part(el, 'check')).left).toBeGreaterThan(rect(part(el, 'label')).right);
  });

  it('follows a change of direction after it is drawn', async () => {
    document.body.innerHTML = '<div><rx-segmented-button>Label</rx-segmented-button></div>';
    const el = document.querySelector('rx-segmented-button') as RxSegmentedButton;
    await el.updateComplete;
    expect(translate(el)).toBe(NO_ICON_OFFSET);
    el.parentElement!.dir = 'rtl';
    expect(translate(el)).toBe(-NO_ICON_OFFSET);
  });

  it('jumps straight there with reduced motion', async () => {
    setMotionDurationScale(0);
    const el = await mountOne('<rx-segmented-button>Label</rx-segmented-button>');
    el.checked = true;
    await el.updateComplete;
    await frames(2);
    expect(el.contentState).toMatchObject({offset: 0, checkAlpha: 1, checkScale: 1});
  });
});
