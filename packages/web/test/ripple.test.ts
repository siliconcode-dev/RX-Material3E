import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import '@rx-m3e/tokens/theme.css';
import '../src/ripple/ripple.js';
import type {RxRipple} from '../src/index.js';

const W = 200;
const H = 100;

async function mount(attrs = '') {
  document.body.innerHTML = `
    <button id="b" style="position: absolute; left: 20px; top: 20px; width: ${W}px; height: ${H}px;
      border: none; border-radius: 24px; color: rgb(0, 0, 255); background: white">
      Tap<rx-ripple ${attrs}></rx-ripple>
    </button>`;
  const ripple = document.querySelector('rx-ripple') as RxRipple;
  await ripple.updateComplete;
  return {ripple, button: document.getElementById('b')!};
}

const stateLayer = (r: RxRipple) => r.shadowRoot!.querySelector('.state') as HTMLElement;
const ripples = (r: RxRipple) => [...r.shadowRoot!.querySelectorAll<HTMLElement>('.ripple')];

/** Fires a pointer event the way a mouse or finger would. */
function pointer(target: Element, type: string, init: PointerEventInit = {}) {
  target.dispatchEvent(
    new PointerEvent(type, {bubbles: true, composed: true, pointerType: 'mouse', ...init}),
  );
}

/** Jumps every running animation on an element to its end. */
const finishAll = (el: Element) => el.getAnimations().forEach((a) => a.finish());

/** Waits for the state layer's opacity transition, then reads it. */
async function layerOpacity(r: RxRipple) {
  await r.updateComplete;
  const layer = stateLayer(r);
  layer.style.transition = 'none';
  return Number(getComputedStyle(layer).opacity);
}

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

describe('state layer', () => {
  it('tints on hover with the hover state token (8%) in the content color', async () => {
    const {ripple, button} = await mount();
    pointer(button, 'pointerenter');
    expect(await layerOpacity(ripple)).toBeCloseTo(0.08);
    expect(getComputedStyle(stateLayer(ripple)).backgroundColor).toBe('rgb(0, 0, 255)');
    pointer(button, 'pointerleave');
    expect(await layerOpacity(ripple)).toBe(0);
  });

  it('does not hover for touch', async () => {
    const {ripple, button} = await mount();
    pointer(button, 'pointerenter', {pointerType: 'touch'});
    expect(await layerOpacity(ripple)).toBe(0);
  });

  it('shows the dragged state (16%) when dragged is set', async () => {
    const {ripple} = await mount('dragged');
    expect(await layerOpacity(ripple)).toBeCloseTo(0.16);
  });

  it('leaves focus to the focus ring by default, but can tint it (10%)', async () => {
    const {ripple} = await mount();
    await userEvent.keyboard('{Tab}');
    expect(await layerOpacity(ripple)).toBe(0);

    ripple.style.setProperty(
      '--rx-ripple-focus-opacity',
      'var(--md-sys-state-focus-state-layer-opacity)',
    );
    expect(await layerOpacity(ripple)).toBeCloseTo(0.1);
  });

  it('uses a custom color', async () => {
    const {ripple, button} = await mount();
    ripple.style.setProperty('--rx-ripple-color', 'rgb(255, 0, 0)');
    pointer(button, 'pointerenter');
    await ripple.updateComplete;
    expect(getComputedStyle(stateLayer(ripple)).backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('press ripple', () => {
  it('grows from the press point to cover the surface plus 10dp', async () => {
    const {ripple, button} = await mount();
    const rect = button.getBoundingClientRect();
    pointer(button, 'pointerdown', {clientX: rect.left + 30, clientY: rect.top + 20, button: 0});
    const [el] = ripples(ripple);
    expect(el).toBeDefined();

    const endRadius = Math.hypot(W, H) / 2 + 10;
    expect(parseFloat(el.style.width)).toBeCloseTo(endRadius * 2);

    // Before it runs: 30% of the longest side, centred on the press point.
    const animations = el.getAnimations() as CSSAnimation[];
    animations.forEach((a) => a.pause());
    animations.forEach((a) => (a.currentTime = 0));
    const start = getComputedStyle(el);
    expect(parseFloat(start.scale)).toBeCloseTo((W * 0.3) / endRadius, 3);
    expect(start.translate).toBe(`${30 - W / 2}px ${20 - H / 2}px`);

    // After it runs: full size, centred on the surface.
    finishAll(el);
    const end = getComputedStyle(el);
    expect(parseFloat(end.scale)).toBe(1);
    expect(['0px', '0px 0px']).toContain(end.translate);
    expect(Number(end.opacity)).toBeCloseTo(0.1);
  });

  it('uses the Compose timings: 75ms fade in, 225ms grow, 150ms fade out', async () => {
    const {ripple, button} = await mount();
    pointer(button, 'pointerdown', {clientX: 50, clientY: 50, button: 0});
    const [el] = ripples(ripple);
    const timings = el
      .getAnimations()
      .map((a) => (a.effect as KeyframeEffect).getTiming())
      .map((t) => [t.duration, t.easing]);
    expect(timings).toEqual([
      [75, 'linear'],
      [225, 'cubic-bezier(0.4, 0, 0.2, 1)'],
      [225, 'linear'],
    ]);

    finishAll(el);
    pointer(button, 'pointerup');
    await new Promise((r) => setTimeout(r));
    const fade = el.getAnimations().at(-1)!;
    expect((fade.effect as KeyframeEffect).getTiming().duration).toBe(150);
  });

  it('keeps growing after a quick tap, then fades out and is removed', async () => {
    const {ripple, button} = await mount();
    pointer(button, 'pointerdown', {clientX: 50, clientY: 50, button: 0});
    pointer(button, 'pointerup');
    const [el] = ripples(ripple);
    // Released during the fade-in: jumps to full strength straight away.
    expect(Number(getComputedStyle(el).opacity)).toBeCloseTo(0.1);
    // Still growing: no fade-out until the 225ms grow is done.
    expect(el.getAnimations()).toHaveLength(3);

    for (const a of el.getAnimations()) a.finish();
    await new Promise((r) => setTimeout(r));
    for (const a of el.getAnimations()) a.finish();
    await new Promise((r) => setTimeout(r, 20));
    expect(ripples(ripple)).toHaveLength(0);
  });

  it('starts from the center for keyboard presses', async () => {
    const {ripple, button} = await mount();
    button.focus();
    await userEvent.keyboard('{Enter}');
    const [el] = ripples(ripple);
    expect(el).toBeDefined();
    el.getAnimations().forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    expect(['0px', '0px 0px']).toContain(getComputedStyle(el).translate);
  });

  it('does not add a second ripple for the click that follows a pointer press', async () => {
    const {ripple, button} = await mount();
    await userEvent.click(button);
    expect(ripples(ripple)).toHaveLength(1);
  });

  it('ignores right clicks', async () => {
    const {ripple, button} = await mount();
    pointer(button, 'pointerdown', {button: 2});
    expect(ripples(ripple)).toHaveLength(0);
  });

  it('clips to the control shape unless unbounded', async () => {
    const {ripple} = await mount();
    const surface = ripple.shadowRoot!.querySelector('.surface')!;
    expect(getComputedStyle(surface).overflow).toBe('hidden');
    expect(getComputedStyle(surface).borderRadius).toBe('24px');

    ripple.unbounded = true;
    await ripple.updateComplete;
    expect(getComputedStyle(surface).overflow).toBe('visible');
    ripple.press();
    const [el] = ripples(ripple);
    expect(parseFloat(el.style.width)).toBeCloseTo(Math.hypot(W, H));
  });

  it('does nothing when disabled', async () => {
    const {ripple, button} = await mount('disabled');
    pointer(button, 'pointerenter');
    pointer(button, 'pointerdown', {clientX: 50, clientY: 50, button: 0});
    expect(ripples(ripple)).toHaveLength(0);
    expect(getComputedStyle(ripple).display).toBe('none');
  });

  it('never blocks clicks on the control', async () => {
    const {ripple} = await mount();
    expect(getComputedStyle(ripple).pointerEvents).toBe('none');
  });
});
