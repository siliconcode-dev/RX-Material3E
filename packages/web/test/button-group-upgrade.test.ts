import {expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
// Only the group: the toggle buttons are defined later, as when a page loads
// the group's module first (each test file gets a fresh page).
import '../src/button-group/button-group.js';
import type {RxButtonGroup} from '../src/button-group/index.js';

it('makes toggle buttons that upgrade after it radio buttons', async () => {
  document.body.innerHTML = `<rx-button-group connected selection="single">
    <rx-toggle-button>One</rx-toggle-button><rx-toggle-button>Two</rx-toggle-button>
  </rx-button-group>`;
  const group = document.querySelector('rx-button-group') as RxButtonGroup;
  await group.updateComplete;
  await new Promise((r) => setTimeout(r));
  expect(customElements.get('rx-toggle-button')).toBeUndefined();

  await import('../src/button/toggle-button.js');
  const toggles = [...group.children] as (HTMLElement & {updateComplete: Promise<unknown>})[];
  await Promise.all(toggles.map((t) => t.updateComplete));
  expect(toggles.map((t) => t.getAttribute('role'))).toEqual(['radio', 'radio']);
});
