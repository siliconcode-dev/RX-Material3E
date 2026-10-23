import {afterEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import '../src/scrim/scrim.js';
import {setMotionDurationScale} from '../src/motion/index.js';
import {ScrimLabels, type RxScrim} from '../src/scrim/index.js';

async function mount(markup: string) {
  document.body.innerHTML = `<div id="box" style="position: relative; width: 300px; height: 200px">${markup}</div>`;
  const el = document.querySelector('rx-scrim') as RxScrim;
  await el.updateComplete;
  return el;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));
const opacity = (el: Element) => Number(getComputedStyle(el).opacity);

afterEach(() => {
  document.body.replaceChildren();
  setMotionDurationScale(null);
  delete document.documentElement.dataset.theme;
});

describe('rx-scrim', () => {
  it('is the scrim color at 32% over its whole container (ScrimTokens)', async () => {
    document.documentElement.dataset.theme = 'light';
    const el = await mount('<rx-scrim open></rx-scrim>');
    const box = el.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([300, 200]);
    // scrim is neutral 0 (black).
    // color-mix() reports color(srgb ...); either way: black at 0.32.
    expect(getComputedStyle(el).backgroundColor).toMatch(
      /^(rgba\(0, 0, 0, 0\.32\)|color\(srgb 0 0 0 \/ 0\.32\))$/,
    );
    expect(opacity(el)).toBe(1);
  });

  it('when closed is invisible, lets clicks through and is hidden from assistive technology', async () => {
    const el = await mount('<rx-scrim></rx-scrim>');
    const style = getComputedStyle(el);
    expect(Number(style.opacity)).toBe(0);
    expect(style.visibility).toBe('hidden');
    expect(style.pointerEvents).toBe('none');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('fades in and out on the default effects spring', async () => {
    const el = await mount('<rx-scrim></rx-scrim>');
    el.open = true;
    await el.updateComplete;
    const seen: number[] = [];
    for (let i = 0; i < 12; i++) {
      await nextFrame();
      seen.push(opacity(el));
    }
    // It fades (the 0 to 1 effects spring takes 165ms): values in between,
    // never going down (no bounce: damping 1).
    expect(seen.some((v) => v > 0 && v < 1)).toBe(true);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    await new Promise((r) => setTimeout(r, 300));
    expect(opacity(el)).toBe(1);
    expect(getComputedStyle(el).visibility).toBe('visible');

    el.open = false;
    await el.updateComplete;
    // Clicks go through at once; the fade finishes, then it hides.
    expect(getComputedStyle(el).pointerEvents).toBe('none');
    // Still fading out on the next frames.
    await nextFrame();
    expect(opacity(el)).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 300));
    expect(opacity(el)).toBe(0);
    expect(getComputedStyle(el).visibility).toBe('hidden');
  });

  it('uses the default effects spring, not a faster one', async () => {
    // Ten times slower: default effects ends at 1650ms, fast effects at 1070ms.
    setMotionDurationScale(10);
    const el = await mount('<rx-scrim></rx-scrim>');
    el.open = true;
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 1300));
    expect(opacity(el)).toBeLessThan(1);
    expect(opacity(el)).toBeGreaterThan(0.9);
  });

  it('switches at once with reduced motion', async () => {
    setMotionDurationScale(0);
    const el = await mount('<rx-scrim></rx-scrim>');
    el.open = true;
    await el.updateComplete;
    await nextFrame();
    await nextFrame();
    expect(opacity(el)).toBe(1);
  });

  it('when dismissible and open, is a labelled button that is not a Tab stop', async () => {
    const el = await mount(
      `<rx-scrim open dismissible label="${ScrimLabels.closeSheet}"></rx-scrim>`,
    );
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('aria-label')).toBe('Close sheet');
    expect(el.hasAttribute('aria-hidden')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
    const clicks: Event[] = [];
    el.addEventListener('click', (e) => clicks.push(e));
    const box = el.getBoundingClientRect();
    expect(document.elementFromPoint(box.left + 10, box.top + 10)).toBe(el);
    el.click();
    expect(clicks).toHaveLength(1);

    el.open = false;
    await el.updateComplete;
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('can be driven by hand, as a dragged drawer does', async () => {
    const el = await mount('<rx-scrim open></rx-scrim>');
    el.currentAlpha = 0.25;
    expect(opacity(el)).toBe(0.25);
    el.currentAlpha = 7;
    expect(el.currentAlpha).toBe(1);
  });

  it("has Compose's labels", () => {
    expect(ScrimLabels).toEqual({
      closeDrawer: 'Close navigation menu',
      closeSheet: 'Close sheet',
      closeRail: 'Close rail',
    });
  });
});
