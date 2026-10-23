import {LitElement, html} from 'lit';
import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {RovingTabindexController} from '../../src/internals/index.js';

class TestGroup extends LitElement {
  static override properties = {orientation: {}, wrap: {type: Boolean}};
  declare orientation: 'horizontal' | 'vertical' | 'both';
  declare wrap: boolean;
  preferredItem: HTMLElement | null = null;
  readonly roving: RovingTabindexController;
  constructor() {
    super();
    this.orientation = 'horizontal';
    this.wrap = true;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const group = this;
    // Getters, so the options follow the element's properties.
    this.roving = new RovingTabindexController(this, {
      items: () => [...this.querySelectorAll('button')],
      get orientation() {
        return group.orientation;
      },
      get wrap() {
        return group.wrap;
      },
      preferred: () => this.preferredItem,
    });
  }
  protected override render() {
    return html`<slot></slot>`;
  }
}
customElements.define('test-group', TestGroup);

async function mount(attrs = '', disabled = -1) {
  document.body.innerHTML = `<button id="before">before</button><test-group ${attrs}>${[0, 1, 2, 3]
    .map((i) => `<button ${i === disabled ? 'disabled' : ''}>${i}</button>`)
    .join('')}</test-group><button id="after">after</button>`;
  const group = document.querySelector('test-group') as TestGroup;
  await group.updateComplete;
  return {group, items: [...group.querySelectorAll('button')]};
}

const focused = () => document.activeElement?.textContent;

afterEach(() => document.body.replaceChildren());

describe('RovingTabindexController', () => {
  it('is one Tab stop', async () => {
    const {items} = await mount();
    expect(items.map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
    document.getElementById('before')!.focus();
    await userEvent.tab();
    expect(focused()).toBe('0');
    await userEvent.tab();
    expect(focused()).toBe('after');
  });

  it('moves with the arrow keys, Home and End, and wraps', async () => {
    const {items} = await mount();
    items[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('1');
    expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1]);
    await userEvent.keyboard('{End}');
    expect(focused()).toBe('3');
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('0');
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused()).toBe('3');
    await userEvent.keyboard('{Home}');
    expect(focused()).toBe('0');
    // Vertical keys do nothing in a horizontal group.
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('0');
  });

  it('swaps left and right in right-to-left text', async () => {
    const {items} = await mount('dir="rtl"');
    items[1].focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(focused()).toBe('2');
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('1');
  });

  it('skips disabled items, and can stop at the ends', async () => {
    const {group, items} = await mount('', 1);
    group.wrap = false;
    await group.updateComplete;
    items[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('2');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(focused()).toBe('3');
  });

  it('vertical groups use up and down', async () => {
    const {group, items} = await mount();
    group.orientation = 'vertical';
    await group.updateComplete;
    items[0].focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(focused()).toBe('1');
    await userEvent.keyboard('{ArrowRight}');
    expect(focused()).toBe('1');
  });

  it('remembers the last focused item, and prefers a selected one', async () => {
    const {group, items} = await mount();
    items[2].focus();
    document.getElementById('after')!.focus();
    expect(items.map((b) => b.tabIndex)).toEqual([-1, -1, 0, -1]);
    group.preferredItem = items[3];
    group.roving.sync();
    expect(items.map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);
    // A click (focus) on another item moves the Tab stop there.
    items[1].focus();
    expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1]);
  });
});
