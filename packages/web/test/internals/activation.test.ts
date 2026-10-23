import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import {addActivation, HostSemanticsController} from '../../src/internals/index.js';
import {LitElement} from 'lit';

afterEach(() => document.body.replaceChildren());

function control(kind: 'button' | 'toggle', state = {disabled: false}) {
  const el = document.createElement('div');
  el.tabIndex = 0;
  el.textContent = 'Control';
  document.body.append(el);
  addActivation(el, {kind, isDisabled: () => state.disabled});
  const clicks: string[] = [];
  el.addEventListener('click', () => clicks.push('click'));
  return {el, clicks, state};
}

describe('addActivation', () => {
  it('button: Enter clicks on key down, Space on key up, like <button>', async () => {
    const {el, clicks} = control('button');
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks).toHaveLength(1);
    await userEvent.keyboard('{ >1}');
    // Space held: nothing yet.
    expect(clicks).toHaveLength(1);
    await userEvent.keyboard('{/ }');
    expect(clicks).toHaveLength(2);
  });

  it('toggle: Space clicks, Enter does not, like a checkbox', async () => {
    const {el, clicks} = control('toggle');
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(clicks).toHaveLength(0);
    await userEvent.keyboard(' ');
    expect(clicks).toHaveLength(1);
  });

  it('Space does not scroll the page', () => {
    const {el} = control('button');
    const down = new KeyboardEvent('keydown', {key: ' ', bubbles: true, cancelable: true});
    el.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it('a Space released after focus moved away does not click', async () => {
    const {el, clicks} = control('button');
    const other = document.createElement('button');
    document.body.append(other);
    el.focus();
    await userEvent.keyboard('{ >1}');
    other.focus();
    await userEvent.keyboard('{/ }');
    expect(clicks).toHaveLength(0);
  });

  it('a Space held while focus leaves and comes back does not click', async () => {
    const {el, clicks} = control('button');
    const other = document.createElement('button');
    document.body.append(other);
    el.focus();
    await userEvent.keyboard('{ >1}');
    other.focus();
    el.focus();
    await userEvent.keyboard('{/ }');
    expect(clicks).toHaveLength(0);
  });

  it('while disabled, swallows clicks and keys before page listeners', async () => {
    const {el, clicks} = control('button', {disabled: true});
    el.focus();
    await userEvent.keyboard('{Enter} ');
    el.click();
    expect(clicks).toHaveLength(0);
  });

  it('ignores keys meant for a control inside it', async () => {
    const {el, clicks} = control('button');
    const input = document.createElement('input');
    el.append(input);
    input.focus();
    await userEvent.keyboard('{Enter} ');
    expect(clicks).toHaveLength(0);
  });
});

class SemanticsHost extends LitElement {
  static override properties = {
    role2: {},
    disabled: {type: Boolean},
    pressed: {},
  };
  declare role2: string | null;
  declare disabled: boolean;
  declare pressed: boolean | null;
  constructor() {
    super();
    this.role2 = 'button';
    this.disabled = false;
    this.pressed = null;
    new HostSemanticsController(this, () => ({
      role: this.role2,
      disabled: this.disabled,
      aria: {pressed: this.pressed},
    }));
  }
}
customElements.define('test-semantics', SemanticsHost);

describe('HostSemanticsController', () => {
  it('owns role, tabindex, aria-disabled and its ARIA states; leaves the rest', async () => {
    document.body.innerHTML = '<test-semantics aria-label="Save"></test-semantics>';
    const el = document.querySelector('test-semantics') as SemanticsHost;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.hasAttribute('aria-pressed')).toBe(false);

    el.pressed = true;
    el.disabled = true;
    await el.updateComplete;
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.hasAttribute('tabindex')).toBe(false);

    el.pressed = null;
    el.disabled = false;
    el.role2 = null;
    await el.updateComplete;
    expect(el.hasAttribute('aria-pressed')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(el.getAttribute('aria-label')).toBe('Save');
  });

  it("keeps a page's own tabindex", async () => {
    document.body.innerHTML = '<test-semantics tabindex="-1"></test-semantics>';
    const el = document.querySelector('test-semantics') as SemanticsHost;
    await el.updateComplete;
    expect(el.getAttribute('tabindex')).toBe('-1');
  });
});
