import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import '../src/fab/fab.js';
import '../src/icon/icon.js';
import type {RxFab} from '../src/fab/index.js';
import {FloatSpringSpec} from '../src/motion/spring.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {manualFrames} from './helpers/manual-frames.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-fab') as RxFab;
  await el.updateComplete;
  return el;
}

const part = (el: RxFab, name: string) => el.shadowRoot!.querySelector(`.${name}`) as HTMLElement;
const rect = (e: Element) => e.getBoundingClientRect();
const icon = (el: RxFab) => el.querySelector('rx-icon')!;
/** Lets the expand or collapse start (it waits for the label to be laid out). */
const settle = async (el: RxFab) => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r));
};

/** A spring's value at a play time; once its time is up, exactly its target (as Animatable). */
function springAt(spec: FloatSpringSpec, t: number, from: number, to: number) {
  return t >= spec.getDurationNanos(from, to, 0) ? to : spec.getValueFromNanos(t, from, to, 0);
}

/** A typescale role's font size as the browser computes it. */
function fontSize(role: string) {
  const probe = document.createElement('i');
  probe.style.fontSize = `var(--md-sys-typescale-${role}-size)`;
  document.body.append(probe);
  const value = getComputedStyle(probe).fontSize;
  probe.remove();
  return value;
}

/** The label's width in a typescale role, as laid out. */
function textWidth(text: string, role: string) {
  const probe = document.createElement('span');
  probe.textContent = text;
  probe.style.cssText =
    `position:absolute;white-space:nowrap;font:var(--md-sys-typescale-${role}-weight) ` +
    `var(--md-sys-typescale-${role}-size)/var(--md-sys-typescale-${role}-line-height) ` +
    `var(--md-sys-typescale-${role}-font);letter-spacing:var(--md-sys-typescale-${role}-tracking)`;
  document.body.append(probe);
  const width = rect(probe).width;
  probe.remove();
  return width;
}

beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute('dir');
  setMotionDurationScale(null);
});

/*
 * The test's own copy of the extended FABs (FloatingActionButton.kt's
 * private values and the ExtendedFab tokens): height, shape, padding before
 * the icon (or the label alone) and after the label, the space between, and
 * the text style. Medium and Large take Compose's 12dp and 16dp over the
 * tokens' 16dp and 20dp.
 */
const EXPRESSIVE = {
  small: {
    height: 56,
    corner: 16,
    leading: 16,
    trailing: 16,
    gap: 8,
    icon: 24,
    type: 'title-medium',
  },
  medium: {
    height: 80,
    corner: 20,
    leading: 26,
    trailing: 26,
    gap: 12,
    icon: 28,
    type: 'title-large',
  },
  large: {
    height: 96,
    corner: 28,
    leading: 28,
    trailing: 28,
    gap: 16,
    icon: 36,
    type: 'headline-small',
  },
} as const;

describe('rx-fab extended (baseline ExtendedFloatingActionButton)', () => {
  it('the label alone: at least 80dp wide with 20dp sides, 56dp tall, in the label large style', async () => {
    const el = await mount('<rx-fab label="Extended FAB"></rx-fab>');
    const box = rect(part(el, 'fab'));
    expect(box.height).toBe(56);
    expect(box.width).toBeCloseTo(20 + textWidth('Extended FAB', 'label-large') + 20, 1);
    expect(getComputedStyle(part(el, 'fab')).fontSize).toBe(fontSize('label-large'));
    expect(getComputedStyle(part(el, 'fab')).borderTopLeftRadius).toBe('16px');
    // The label names it.
    expect(part(el, 'text-clip').hasAttribute('aria-hidden')).toBe(false);
  });

  it('a short label is still 80dp wide', async () => {
    const el = await mount('<rx-fab label="Go"></rx-fab>');
    expect(rect(part(el, 'fab')).width).toBe(80);
  });

  it('with an icon: 16dp, the icon, 12dp, the label, 20dp; the label is hidden from assistive technology', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const box = rect(part(el, 'fab'));
    const label = rect(part(el, 'text'));
    expect(rect(icon(el)).left - box.left).toBe(16);
    expect(rect(icon(el)).width).toBe(24);
    expect(label.left - rect(icon(el)).right).toBe(0);
    expect(getComputedStyle(part(el, 'text')).paddingInlineStart).toBe('12px');
    expect(box.right - label.right).toBeCloseTo(20, 1);
    expect(part(el, 'text-clip').getAttribute('aria-hidden')).toBe('true');
  });

  it('with an icon and a short label: from the start in the 80dp minimum, not centered', async () => {
    const el = await mount('<rx-fab label="I"><rx-icon label="Add">add</rx-icon></rx-fab>');
    expect(rect(part(el, 'fab')).width).toBe(80);
    expect(rect(icon(el)).left - rect(part(el, 'fab')).left).toBe(16);
  });

  it('collapsed from the start: the icon alone, centered in 56dp', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB" collapsed><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const box = rect(part(el, 'fab'));
    expect([box.width, box.height]).toEqual([56, 56]);
    expect(part(el, 'text-clip').hidden).toBe(true);
    expect(rect(icon(el)).left - box.left).toBe(16);
    expect(el.expanded).toBe(false);
  });

  it('collapses: the label shrinks towards the start (default spatial) in whole pixels and fades (fast effects)', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const full = Math.round(rect(part(el, 'text')).width);
    const clock = manualFrames();
    try {
      el.collapsed = true;
      await settle(el);
      // No padding and centered at once, as Compose switches them with `expanded`.
      expect(getComputedStyle(part(el, 'row')).paddingInlineStart).toBe('0px');
      const size = new FloatSpringSpec(0.8, 380, 0.01);
      const alpha = new FloatSpringSpec(1, 3800, 0.01);
      for (let i = 0; i < 8; i++) {
        clock.step();
        const t = i * 16e6;
        // IntSize.VectorConverter: rounded, never below 0.
        const width = Math.max(0, Math.round(springAt(size, t, full, 0)));
        expect(el.expandState.textWidth, `width at frame ${i}`).toBe(width);
        expect(parseFloat(part(el, 'text-clip').style.width)).toBe(width);
        expect(el.expandState.textAlpha).toBeCloseTo(springAt(alpha, t, 1, 0), 5);
      }
      clock.step(120);
      await settle(el);
      expect(part(el, 'text-clip').hidden).toBe(true);
      expect(rect(part(el, 'fab')).width).toBe(56);
    } finally {
      clock.restore();
    }
  });

  it('expands: from nothing on fast spatial, fading in on default effects', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB" collapsed><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const clock = manualFrames();
    try {
      el.expanded = true;
      await settle(el);
      const full = Math.round(rect(part(el, 'text')).width);
      // Laid out but drawn 0 wide before the first frame: no flash of the label.
      expect(part(el, 'text-clip').hidden).toBe(false);
      expect(part(el, 'text-clip').style.width).toBe('0px');
      const size = new FloatSpringSpec(0.6, 800, 0.01);
      const alpha = new FloatSpringSpec(1, 1600, 0.01);
      let widest = 0;
      for (let i = 0; i < 40; i++) {
        clock.step();
        const t = i * 16e6;
        if (i < 8) {
          const width = Math.max(0, Math.round(springAt(size, t, 0, full)));
          expect(el.expandState.textWidth, `width at frame ${i}`).toBe(width);
          expect(el.expandState.textAlpha).toBeCloseTo(springAt(alpha, t, 0, 1), 5);
        }
        widest = Math.max(widest, el.expandState.textWidth);
      }
      // Fast spatial bounces past the full width.
      expect(widest).toBeGreaterThan(full);
      clock.step(60);
      await settle(el);
      expect(part(el, 'text-clip').style.width).toBe('');
    } finally {
      clock.restore();
    }
  });

  it('turned back mid-collapse, carries on from where it is', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const clock = manualFrames();
    try {
      el.collapsed = true;
      await settle(el);
      clock.step(4);
      const at = el.expandState.textWidth;
      expect(at).toBeGreaterThan(0);
      el.collapsed = false;
      await settle(el);
      expect(el.expandState.textWidth).toBe(at);
      clock.step(80);
      await settle(el);
      expect(part(el, 'text-clip').hidden).toBe(false);
      expect(rect(part(el, 'fab')).width).toBeGreaterThan(80);
    } finally {
      clock.restore();
    }
  });

  it('collapsed, expanded and collapsed again quickly: the label stays until the last collapse ends', async () => {
    const el = await mount(
      '<rx-fab label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const clock = manualFrames();
    try {
      el.collapsed = true;
      await settle(el);
      clock.step(3);
      el.collapsed = false;
      // Collapsed again before the expand has started (it waits for layout).
      await el.updateComplete;
      el.collapsed = true;
      await settle(el);
      // The interrupted animations have ended, but the last collapse runs on.
      expect(part(el, 'text-clip').hidden).toBe(false);
      expect(el.expandState.textWidth).toBeGreaterThan(0);
      clock.step(120);
      await settle(el);
      expect(part(el, 'text-clip').hidden).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('without an icon, collapsed does nothing', async () => {
    const el = await mount('<rx-fab label="Extended FAB" collapsed></rx-fab>');
    expect(part(el, 'text-clip').hidden).toBe(false);
    expect(rect(part(el, 'fab')).width).toBeGreaterThan(80);
  });
});

describe('rx-fab extended (M3 Expressive Small, Medium and Large)', () => {
  for (const [size, want] of Object.entries(EXPRESSIVE)) {
    it(`${size}, the label alone: ${want.height}dp, ${want.leading}dp sides, ${want.type}`, async () => {
      const el = await mount(`<rx-fab size="${size}" label="Label"></rx-fab>`);
      const box = rect(part(el, 'fab'));
      expect(box.height).toBe(want.height);
      const text = textWidth('Label', want.type);
      expect(box.width).toBeCloseTo(Math.max(want.height, want.leading + text + want.trailing), 1);
      expect(getComputedStyle(part(el, 'fab')).fontSize).toBe(fontSize(want.type));
      expect(getComputedStyle(part(el, 'fab')).borderTopLeftRadius).toBe(`${want.corner}px`);
    });

    it(`${size}, with an icon: ${want.leading}dp, the icon, ${want.gap}dp, the label, ${want.trailing}dp`, async () => {
      const el = await mount(
        `<rx-fab size="${size}" label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>`,
      );
      const box = rect(part(el, 'fab'));
      expect(box.height).toBe(want.height);
      expect(rect(icon(el)).left - box.left).toBe(want.leading);
      expect(rect(icon(el)).width).toBe(want.icon);
      expect(getComputedStyle(part(el, 'text')).paddingInlineStart).toBe(`${want.gap}px`);
      const text = textWidth('Extended FAB', want.type);
      expect(box.width).toBeCloseTo(want.leading + want.icon + want.gap + text + want.trailing, 1);
    });

    it(`${size}, collapsed from the start: ${want.height}dp square, the icon ${want.leading}dp from the start`, async () => {
      const el = await mount(
        `<rx-fab size="${size}" label="Extended FAB" collapsed><rx-icon label="Add">add</rx-icon></rx-fab>`,
      );
      const box = rect(part(el, 'fab'));
      expect([box.width, box.height]).toEqual([want.height, want.height]);
      expect(rect(icon(el)).left - box.left).toBe(want.leading);
    });
  }

  it('small with a label is the 56dp small extended FAB, not the 40dp small FAB', async () => {
    const el = await mount('<rx-fab size="small" label="Label"></rx-fab>');
    expect(rect(part(el, 'fab')).height).toBe(56);
    expect(getComputedStyle(part(el, 'fab')).borderTopLeftRadius).toBe('16px');
  });

  it('collapses: the width goes from full to the height on fast spatial, the label fades on fast effects', async () => {
    const el = await mount(
      '<rx-fab size="medium" label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const full = Math.ceil(rect(part(el, 'row')).width);
    const clock = manualFrames();
    try {
      el.collapsed = true;
      await settle(el);
      const progress = new FloatSpringSpec(0.6, 800, 0.01);
      const alpha = new FloatSpringSpec(1, 3800, 0.01);
      let narrowest = full;
      for (let i = 0; i < 40; i++) {
        clock.step();
        const t = i * 16e6;
        const p = i < 8 ? springAt(progress, t, 1, 0) : el.expandState.widthProgress;
        if (i < 8) {
          expect(el.expandState.widthProgress).toBeCloseTo(p, 5);
          expect(el.expandState.alphaProgress).toBeCloseTo(springAt(alpha, t, 1, 0), 5);
          // lerp(minWidth, the full width, progress), rounded.
          expect(rect(part(el, 'fab')).width, `width at frame ${i}`).toBe(
            80 + Math.round((full - 80) * el.expandState.widthProgress),
          );
        }
        narrowest = Math.min(narrowest, rect(part(el, 'fab')).width);
      }
      // Fast spatial overshoots: narrower than the height for a moment.
      expect(narrowest).toBeLessThan(80);
      clock.step(60);
      await settle(el);
      expect(part(el, 'text-clip').hidden).toBe(true);
      expect(rect(part(el, 'fab')).width).toBe(80);
      expect(part(el, 'fab').style.width).toBe('');
    } finally {
      clock.restore();
    }
  });

  it('expands past its full width on fast spatial, the content kept at the start', async () => {
    const el = await mount(
      '<rx-fab size="small" label="Extended FAB" collapsed><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const clock = manualFrames();
    try {
      el.collapsed = false;
      await settle(el);
      const full = Math.ceil(rect(part(el, 'row')).width);
      let widest = 0;
      for (let i = 0; i < 40; i++) {
        clock.step();
        const box = rect(part(el, 'fab'));
        if (box.width > widest) {
          widest = box.width;
          // placeable.place(0, 0): the extra width is after the content.
          expect(rect(icon(el)).left - box.left).toBe(16);
        }
      }
      expect(widest).toBeGreaterThan(full);
    } finally {
      clock.restore();
    }
  });

  it('keeps the icon at the start while it collapses, in right-to-left text too', async () => {
    document.documentElement.dir = 'rtl';
    const el = await mount(
      '<rx-fab size="small" label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    const clock = manualFrames();
    try {
      el.collapsed = true;
      await settle(el);
      clock.step(4);
      const box = rect(part(el, 'fab'));
      expect(box.width).toBeLessThan(150);
      expect(box.right - rect(icon(el)).right).toBe(16);
    } finally {
      clock.restore();
    }
  });

  it('jumps straight there with reduced motion', async () => {
    setMotionDurationScale(0);
    const el = await mount(
      '<rx-fab size="large" label="Extended FAB"><rx-icon label="Add">add</rx-icon></rx-fab>',
    );
    el.collapsed = true;
    await settle(el);
    await new Promise((r) => requestAnimationFrame(r));
    await settle(el);
    expect(rect(part(el, 'fab')).width).toBe(96);
    expect(part(el, 'text-clip').hidden).toBe(true);
  });
});
