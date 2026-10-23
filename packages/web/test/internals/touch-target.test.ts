import {LitElement, css, html} from 'lit';
import {afterEach, describe, expect, it} from 'vitest';
import {minimumInteractiveComponentSize} from '../../src/internals/index.js';

class SmallControl extends LitElement {
  static override styles = [
    minimumInteractiveComponentSize,
    css`
      .visible {
        width: 20px;
        height: 20px;
      }
    `,
  ];
  protected override render() {
    return html`<div class="visible"></div>`;
  }
}
customElements.define('test-small-control', SmallControl);

afterEach(() => document.body.replaceChildren());

describe('minimumInteractiveComponentSize', () => {
  it('lays a small control out at 48 by 48 with its visible part centered', async () => {
    document.body.innerHTML = '<test-small-control></test-small-control>';
    const el = document.querySelector('test-small-control') as SmallControl;
    await el.updateComplete;
    const box = el.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([48, 48]);
    const visible = el.shadowRoot!.querySelector('.visible')!.getBoundingClientRect();
    expect(visible.left - box.left).toBe(14);
    expect(visible.top - box.top).toBe(14);
  });

  it('follows --rx-minimum-interactive-component-size; 0 turns it off', async () => {
    document.body.innerHTML =
      '<test-small-control style="--rx-minimum-interactive-component-size: 0px"></test-small-control>';
    const el = document.querySelector('test-small-control') as SmallControl;
    await el.updateComplete;
    const box = el.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([20, 20]);
  });
});
