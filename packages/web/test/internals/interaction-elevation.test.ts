import {afterEach, describe, expect, it} from 'vitest';
import {LitElement, html} from 'lit';
import {
  InteractionElevationController,
  type InteractionElevations,
} from '../../src/internals/interaction-elevation.js';
// Registers --rx-elevation as a length, so it animates.
import '../../src/elevation/elevation.js';
import {setMotionDurationScale} from '../../src/motion/index.js';

// Pressed and hovered share a value here, so the two ways of telling which
// interaction it is leaving (from the value, or the one last targeted)
// disagree when a hover ends.
class ElevationHost extends LitElement {
  elevations: InteractionElevations = {default: 0, pressed: 2, focused: 0, hovered: 2, disabled: 0};
  constructor() {
    super();
    new InteractionElevationController(this, {
      target: () => this.renderRoot.querySelector('div'),
      elevations: () => this.elevations,
      enabled: () => true,
      trackLastInteraction: this.hasAttribute('tracked'),
    });
  }
  protected override render() {
    return html`<div></div>`;
  }
}
customElements.define('test-elevation-host', ElevationHost);

async function mount(tracked: boolean) {
  document.body.innerHTML = `<test-elevation-host${tracked ? ' tracked' : ''}></test-elevation-host>`;
  const el = document.querySelector('test-elevation-host') as ElevationHost;
  await el.updateComplete;
  return el;
}

const target = (el: ElevationHost) => el.renderRoot.querySelector('div') as HTMLElement;
const timing = (el: ElevationHost) => target(el).getAnimations()[0]?.effect?.getTiming();
const hover = (el: ElevationHost) =>
  el.dispatchEvent(new PointerEvent('pointerenter', {pointerType: 'mouse'}));
const unhover = (el: ElevationHost) =>
  el.dispatchEvent(new PointerEvent('pointerleave', {pointerType: 'mouse'}));
/** Lets a slowed-down tween get under way. */
const frames = async () => {
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
};

afterEach(() => {
  document.body.replaceChildren();
  setMotionDurationScale(null);
});

// Slowed down so the tweens are under way when they are checked.
const SCALE = 10;

describe('InteractionElevationController', () => {
  it('ButtonElevation: works out the interaction it leaves from the value, pressed first', async () => {
    const el = await mount(false);
    setMotionDurationScale(SCALE);
    hover(el);
    await frames();
    unhover(el);
    // 2dp is the pressed value: DefaultOutgoingSpec, 150ms.
    expect(timing(el)?.duration).toBe(150 * SCALE);
  });

  it('trackLastInteraction (the FAB): leaves the interaction it last targeted', async () => {
    const el = await mount(true);
    setMotionDurationScale(SCALE);
    hover(el);
    await frames();
    unhover(el);
    // It last targeted hover: HoveredOutgoingSpec, 120ms.
    expect(timing(el)?.duration).toBe(120 * SCALE);
    expect(timing(el)?.easing).toBe('cubic-bezier(0.4, 0, 0.6, 1)');
  });

  it('trackLastInteraction: remembers an interaction even when the value stays the same', async () => {
    const el = await mount(true);
    setMotionDurationScale(SCALE);
    hover(el);
    await frames();
    // Pressed while hovered: the same 2dp, no new animation, but press is now the last.
    el.dispatchEvent(new PointerEvent('pointerdown', {button: 0}));
    unhover(el);
    // pointerleave ends both; it leaves press: DefaultOutgoingSpec, 150ms.
    expect(timing(el)?.duration).toBe(150 * SCALE);
  });

  it('trackLastInteraction: snaps to new elevation values, even mid-interaction', async () => {
    const el = await mount(true);
    hover(el);
    el.elevations = {default: 4, pressed: 4, focused: 4, hovered: 6, disabled: 4};
    el.requestUpdate();
    await el.updateComplete;
    expect(target(el).style.getPropertyValue('--rx-elevation')).toBe('6px');
    expect(target(el).getAnimations()).toHaveLength(0);
  });
});
