import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/button-group/button-group.js';
import '../src/button/button.js';
import '../src/button/toggle-button.js';
import '../src/icon-button/icon-button.js';
import '../src/icon/icon.js';
import type {RxButtonGroup} from '../src/button-group/index.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {manualFrames} from './helpers/manual-frames.js';

async function mount(markup: string, attributes = '') {
  document.body.innerHTML = `<rx-button-group ${attributes}>${markup}</rx-button-group>`;
  const group = document.querySelector('rx-button-group') as RxButtonGroup;
  await group.updateComplete;
  await Promise.all(
    [...group.children].map((c) => (c as {updateComplete?: Promise<unknown>}).updateComplete),
  );
  return group;
}

/** Plain fixed-width items, so the widths are exact. */
const items = (...widths: number[]) =>
  widths.map((w) => `<div tabindex="0" style="width: ${w}px; height: 40px"></div>`).join('');
const children = (group: RxButtonGroup) => [...group.children] as HTMLElement[];
const widths = (group: RxButtonGroup) =>
  children(group).map((c) => c.getBoundingClientRect().width);
const press = (el: Element) =>
  el.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
const release = (el: Element) =>
  el.dispatchEvent(new PointerEvent('pointerup', {button: 0, bubbles: true}));
const container = (el: Element) => el.shadowRoot!.querySelector('.button') as HTMLElement;

let clock: ReturnType<typeof manualFrames> | null = null;
beforeEach(() => {
  document.documentElement.dataset.theme = 'light';
});
afterEach(() => {
  clock?.restore();
  clock = null;
  document.body.replaceChildren();
  delete document.documentElement.dataset.theme;
  setMotionDurationScale(null);
});

/** Presses `el` and runs frames until the spring has settled at 1. */
function pressAndSettle(el: Element) {
  press(el);
  clock!.step(120);
}

describe('rx-button-group layout', () => {
  it('lays the items in a row 12dp apart (ButtonGroupSmallTokens.BetweenSpace)', async () => {
    const group = await mount(items(100, 60, 80));
    const boxes = children(group).map((c) => c.getBoundingClientRect());
    expect(boxes[1].left - boxes[0].right).toBe(12);
    expect(boxes[2].left - boxes[1].right).toBe(12);
    expect(group.getBoundingClientRect().width).toBe(100 + 60 + 80 + 24);
  });

  it('keeps each button at its own width, its container filling its touch target', async () => {
    const group = await mount(
      `<rx-button>Day</rx-button><rx-icon-button><rx-icon label="Add">add</rx-icon></rx-icon-button><rx-toggle-button>Week</rx-toggle-button>`,
    );
    const [button, iconButton, toggle] = children(group);
    // The same width as outside a group.
    document.body.insertAdjacentHTML('beforeend', '<rx-button id="alone">Day</rx-button>');
    const alone = document.getElementById('alone')!;
    await (alone as unknown as {updateComplete: Promise<unknown>}).updateComplete;
    expect(button.getBoundingClientRect().width).toBe(alone.getBoundingClientRect().width);
    expect(container(button).getBoundingClientRect().width).toBe(
      button.getBoundingClientRect().width,
    );
    // An icon button is measured at its 48dp touch target and its container
    // takes that width, as in Compose (40dp tall).
    const icon = container(iconButton).getBoundingClientRect();
    expect([icon.width, icon.height]).toEqual([48, 40]);
    expect(container(toggle).getBoundingClientRect().width).toBe(
      toggle.getBoundingClientRect().width,
    );
  });

  it('aligns the items to the top by default, or center or bottom', async () => {
    const markup = `<rx-button size="m">Big</rx-button><rx-button>Small</rx-button>`;
    for (const [align, offset] of [
      ['', 0],
      ['align="center"', 4],
      ['align="bottom"', 8],
    ] as const) {
      const group = await mount(markup, align);
      const [big, small] = children(group).map((c) => c.getBoundingClientRect());
      // A 56dp button beside a small one (40dp in its 48dp touch target).
      expect(big.height).toBe(56);
      expect(small.top - big.top, align).toBe(offset);
    }
  });

  it('gives an item with flex its share of the free width (Compose weight)', async () => {
    const group = await mount(
      `<rx-button style="flex: 1">One</rx-button><rx-button style="flex: 1">Two</rx-button>`,
      'style="display: flex; width: 412px"',
    );
    const [a, b] = children(group);
    expect(a.getBoundingClientRect().width).toBe(200);
    expect(b.getBoundingClientRect().width).toBe(200);
    expect(container(a).getBoundingClientRect().width).toBe(200);
  });

  it('keeps the items at their widths when the row is too narrow', async () => {
    const group = await mount(items(100, 100, 100), 'style="width: 150px"');
    expect(widths(group)).toEqual([100, 100, 100]);
  });
});

describe('rx-button-group press growth (ButtonGroupMeasurePolicy)', () => {
  it('a pressed middle item grows into both neighbours by half the ratio of its width', async () => {
    const group = await mount(items(100, 100, 100));
    clock = manualFrames();
    pressAndSettle(children(group)[1]);
    // round(1 * min(0.15 * 100 / 2, 24, 24)) = 8 from each side.
    expect(widths(group)).toEqual([92, 116, 92]);
  });

  it('the first and last items take from their one neighbour', async () => {
    let group = await mount(items(100, 100, 100));
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    // round(min(0.15 * 100, 24)) = 15.
    expect(widths(group)).toEqual([115, 85, 100]);
    clock.restore();
    group = await mount(items(100, 100, 100));
    clock = manualFrames();
    pressAndSettle(children(group)[2]);
    expect(widths(group)).toEqual([100, 85, 115]);
  });

  it('is limited by the neighbours compression limit (24dp by default)', async () => {
    let group = await mount(items(300, 300));
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    // min(0.15 * 300 = 45, 24) = 24.
    expect(widths(group)).toEqual([324, 276]);
    clock.restore();
    group = await mount(
      `<div tabindex="0" style="width: 100px; height: 40px"></div><div style="width: 100px; height: 40px; --rx-button-group-compression-limit: 5px"></div>`,
    );
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(widths(group)).toEqual([105, 95]);
  });

  it('the last item is limited by the previous one', async () => {
    const group = await mount(
      `<div style="width: 100px; height: 40px; --rx-button-group-compression-limit: 5px"></div>${items(100)}`,
    );
    clock = manualFrames();
    pressAndSettle(children(group)[1]);
    expect(widths(group)).toEqual([95, 105]);
  });

  it('released, turns back at the first frame past three quarters', async () => {
    const group = await mount(items(100, 100, 100));
    const middle = children(group)[1];
    clock = manualFrames();
    press(middle);
    clock.step(1);
    release(middle);
    const values = [group.pressedValues[1]];
    for (let i = 0; i < 60; i++) {
      clock.step();
      values.push(group.pressedValues[1]);
      if (group.pressedTargets[1] === 0) {
        // waitUntil looks at the value once a frame: it turned back on the
        // frame the value passed 0.75 (or the one after), not before.
        const k = values.length - 1;
        expect(Math.max(values[k - 1], values[k])).toBeGreaterThan(0.75);
        expect(values[k - 2]).toBeLessThanOrEqual(0.75);
        return;
      }
    }
    throw new Error('never turned back');
  });

  it('rounds half up, as roundToInt', async () => {
    const group = await mount(items(100, 300, 100));
    clock = manualFrames();
    pressAndSettle(children(group)[1]);
    // round(min(0.15 * 300 / 2 = 22.5, 24, 24)) = 23.
    expect(widths(group)).toEqual([77, 346, 77]);
  });

  it('takes expanded-ratio', async () => {
    const group = await mount(items(100, 100), 'expanded-ratio="0.05"');
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(widths(group)).toEqual([105, 95]);
  });

  it('springs on the fast spatial spring: it overshoots, then settles', async () => {
    const group = await mount(items(100, 100, 100));
    clock = manualFrames();
    press(children(group)[1]);
    let highest = 0;
    for (let i = 0; i < 120; i++) {
      clock.step();
      highest = Math.max(highest, group.pressedValues[1]);
    }
    // FastSpatial (damping 0.6) overshoots about 9.5%.
    expect(highest).toBeGreaterThan(1.05);
    expect(highest).toBeLessThan(1.15);
    expect(group.pressedValues[1]).toBe(1);
  });

  it('released early, it grows to three quarters first, then springs back and lets go', async () => {
    const group = await mount(items(100, 100, 100));
    const middle = children(group)[1];
    clock = manualFrames();
    press(middle);
    clock.step(2);
    release(middle);
    const seen: number[] = [];
    for (let i = 0; i < 120; i++) {
      clock.step();
      seen.push(group.pressedValues[1]);
    }
    const peak = Math.max(...seen);
    expect(peak).toBeGreaterThan(0.75);
    // It turned back only after passing 0.75.
    const turn = seen.indexOf(peak);
    expect(seen.slice(0, turn).every((v, i) => i === 0 || v >= seen[i - 1])).toBe(true);
    expect(group.pressedValues[1]).toBe(0);
    // Back at rest (after the spring's last frame resolves) the group hands the widths back.
    await Promise.resolve();
    expect(middle.style.width).toBe('100px');
    expect(middle.style.minWidth).toBe('');
  });

  it('stops waiting after a second (waitUntil) if the grow is slow', async () => {
    setMotionDurationScale(100);
    const group = await mount(items(100, 100, 100));
    const middle = children(group)[1];
    clock = manualFrames();
    press(middle);
    release(middle);
    clock.step(60);
    const before = group.pressedValues[1];
    expect(before).toBeLessThan(0.75);
    // Past 1000ms: it springs back from where it is.
    clock.step(10);
    expect(group.pressedValues[1]).toBeLessThan(before + 0.01);
    expect(group.pressedValues[1]).toBeGreaterThan(0);
  });

  it('a press again while waiting keeps growing', async () => {
    const group = await mount(items(100, 100, 100));
    const middle = children(group)[1];
    clock = manualFrames();
    press(middle);
    clock.step(1);
    release(middle);
    press(middle);
    clock.step(120);
    expect(group.pressedValues[1]).toBe(1);
    expect(widths(group)).toEqual([92, 116, 92]);
  });

  it('does nothing when static, for a disabled item, or alone', async () => {
    let group = await mount(items(100, 100), 'static');
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(widths(group)).toEqual([100, 100]);
    clock.restore();
    group = await mount(
      `<div aria-disabled="true" style="width: 100px; height: 40px"></div>${items(100)}`,
    );
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(widths(group)).toEqual([100, 100]);
    clock.restore();
    group = await mount(items(100));
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(widths(group)).toEqual([100]);
  });

  it('a button grows for Enter or Space, a toggle for Space only', async () => {
    const group = await mount(
      `<rx-button type="button">One</rx-button><rx-toggle-button>Two</rx-toggle-button>`,
    );
    const [button, toggle] = children(group);
    button.focus();
    await userEvent.keyboard('{Enter>}');
    expect(group.pressedValues[0]).toBe(0);
    // The spring has started (its first frame comes next).
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    expect(group.pressedValues[0]).toBeGreaterThan(0);
    await userEvent.keyboard('{/Enter}');
    toggle.focus();
    await userEvent.keyboard('{Enter>}');
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    expect(group.pressedValues[1]).toBe(0);
    await userEvent.keyboard('{/Enter}');
  });

  it('a pressed button shrinks its neighbour below its minimum width', async () => {
    const group = await mount(
      `<rx-button style="width: 300px">Wide</rx-button><rx-button>A</rx-button>`,
    );
    const [, small] = children(group);
    const before = small.getBoundingClientRect().width;
    expect(before).toBe(58);
    clock = manualFrames();
    pressAndSettle(children(group)[0]);
    expect(small.getBoundingClientRect().width).toBe(58 - 24);
    expect(container(small).getBoundingClientRect().width).toBe(58 - 24);
  });
});
