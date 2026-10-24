import {expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
// Only the set: the buttons are defined later, as when a page loads the
// set's module first (each test file gets a fresh page).
import '../src/segmented-button/segmented-button-set.js';
import type {RxSegmentedButtonSet} from '../src/segmented-button/index.js';

it('makes buttons that upgrade after it radio buttons, and measures them once they render', async () => {
  document.body.innerHTML = `<rx-segmented-button-set>
    <rx-segmented-button>One</rx-segmented-button><rx-segmented-button>Two</rx-segmented-button>
  </rx-segmented-button-set>`;
  const set = document.querySelector('rx-segmented-button-set') as RxSegmentedButtonSet;
  await set.updateComplete;
  await new Promise((r) => setTimeout(r));
  expect(customElements.get('rx-segmented-button')).toBeUndefined();

  await import('../src/segmented-button/segmented-button.js');
  const items = [...set.children] as (HTMLElement & {updateComplete: Promise<unknown>})[];
  await Promise.all(items.map((i) => i.updateComplete));
  expect(items.map((i) => i.getAttribute('role'))).toEqual(['radio', 'radio']);
  for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r));
  // Two buttons of at least ButtonDefaults.MinWidth (58dp), overlapping by 1dp.
  const width = set.getBoundingClientRect().width;
  expect(width).toBe(2 * items[0].getBoundingClientRect().width - 1);
  expect(width).toBeGreaterThanOrEqual(2 * 58 - 1);
});
