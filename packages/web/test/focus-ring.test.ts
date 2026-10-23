import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {LitElement, css, html} from 'lit';
import '@rx-m3e/tokens/theme.css';
import '../src/focus/focus-ring.js';
import type {RxFocusRing} from '../src/index.js';

const root = document.documentElement;

/** Normalizes a CSS color through the browser. */
function rgb(color: string) {
  const probe = document.createElement('i');
  probe.style.color = color;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** Skips the spring so computed values are final. */
function settle(ring: RxFocusRing) {
  ring.style.transition = 'none';
}

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const ring = document.querySelector('rx-focus-ring') as RxFocusRing;
  await ring.updateComplete;
  settle(ring);
  return ring;
}

const BUTTON = `
  <button id="b" style="position: relative; border: none; border-radius: 20px; padding: 8px 16px">
    Save<rx-focus-ring></rx-focus-ring>
  </button>`;

afterEach(async () => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
  delete root.dataset.theme;
});

describe('rx-focus-ring', () => {
  it('shows on keyboard focus with the M3 ring: 3px secondary, 2px outside', async () => {
    root.dataset.theme = 'light';
    const ring = await mount(BUTTON);
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(true);
    const style = getComputedStyle(ring);
    expect(style.outlineWidth).toBe('3px');
    expect(style.outlineOffset).toBe('2px');
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineColor).toBe(rgb('var(--md-sys-color-secondary)'));
  });

  it('stays hidden when the control is clicked', async () => {
    const ring = await mount(BUTTON);
    await userEvent.click(document.getElementById('b')!);
    await ring.updateComplete;
    expect(document.activeElement?.id).toBe('b');
    expect(ring.visible).toBe(false);
    expect(getComputedStyle(ring).outlineWidth).toBe('0px');
  });

  it('hides when focus leaves', async () => {
    const ring = await mount(BUTTON + '<button>Next</button>');
    await userEvent.keyboard('{Tab}');
    expect(ring.visible).toBe(true);
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(false);
  });

  it('follows the corner radius of its control', async () => {
    const ring = await mount(BUTTON);
    expect(getComputedStyle(ring).borderRadius).toBe('20px');
    const rect = ring.getBoundingClientRect();
    const button = document.getElementById('b')!.getBoundingClientRect();
    expect([rect.width, rect.height]).toEqual([button.width, button.height]);
  });

  it('inward style draws the Compose inset ring: 2px secondary over an on-secondary band', async () => {
    root.dataset.theme = 'light';
    const ring = await mount(BUTTON.replace('<rx-focus-ring>', '<rx-focus-ring inward>'));
    ring.visible = true;
    await ring.updateComplete;
    const shadow = getComputedStyle(ring).boxShadow;
    const [outer, inner] = shadow.split(/,(?![^(]*\))/);
    expect(outer).toContain('inset');
    expect(outer).toMatch(/0px 0px 0px 2px/);
    expect(outer).toContain(rgb('var(--md-sys-color-secondary)'));
    expect(inner).toMatch(/0px 0px 0px 4px/);
    expect(inner).toContain(rgb('var(--md-sys-color-on-secondary)'));
    expect(getComputedStyle(ring).outlineStyle).toBe('none');
  });

  it('attaches to another element with for=', async () => {
    const ring = await mount(`
      <div style="position: relative">
        <input id="field" />
        <rx-focus-ring for="field"></rx-focus-ring>
      </div>`);
    expect(ring.control?.id).toBe('field');
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(true);
  });

  it('works inside a component, for a control in its shadow root', async () => {
    class RingProbe extends LitElement {
      static override styles = css`
        button {
          position: relative;
        }
      `;
      override render() {
        return html`<button>Inner<rx-focus-ring></rx-focus-ring></button>`;
      }
    }
    customElements.define('ring-probe', RingProbe);
    document.body.innerHTML = '<ring-probe></ring-probe>';
    const probe = document.querySelector('ring-probe') as RingProbe;
    await probe.updateComplete;
    const ring = probe.shadowRoot!.querySelector('rx-focus-ring')!;
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(true);
  });

  it('springs in and out', async () => {
    document.body.innerHTML = BUTTON;
    const ring = document.querySelector('rx-focus-ring') as RxFocusRing;
    await ring.updateComplete;
    expect(getComputedStyle(ring).transitionProperty).toContain('--rx-focus-ring-progress');
    ring.visible = true;
    await ring.updateComplete;
    expect(getComputedStyle(ring).transitionTimingFunction).toMatch(/^linear\(/);
  });

  it('can be detached and re-attached in code', async () => {
    const ring = await mount(BUTTON + '<button id="other">Other</button>');
    const other = document.getElementById('other')!;
    ring.attach(other);
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(false);
    await userEvent.keyboard('{Tab}');
    await ring.updateComplete;
    expect(ring.visible).toBe(true);
    ring.attach(null);
    expect(ring.control).not.toBeNull();
  });
});
