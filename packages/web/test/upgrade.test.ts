// Every element must start up cleanly when it is already in the page before
// the library loads. The browser upgrades such elements the moment their class
// is defined, before any module code after the class has run.
//
// Each test file runs in its own page, so nothing here is defined yet.
import {expect, it} from 'vitest';

const TAGS = [
  'rx-theme',
  'rx-elevation',
  'rx-focus-ring',
  'rx-ripple',
  'rx-icon',
  'rx-surface',
  'rx-shape',
  'rx-scrim',
  'rx-button',
  'rx-toggle-button',
  'rx-icon-button',
  'rx-button-group',
  'rx-split-button',
  'rx-segmented-button',
  'rx-segmented-button-set',
  'rx-fab',
];

it('upgrades elements that were in the page before the library loaded', async () => {
  document.body.innerHTML = TAGS.map(
    (tag) => `<div style="position: relative"><button>x</button><${tag}></${tag}></div>`,
  ).join('');
  for (const tag of TAGS) expect(customElements.get(tag), tag).toBeUndefined();

  const errors: unknown[] = [];
  const onError = (event: ErrorEvent) => errors.push(event.error ?? event.message);
  window.addEventListener('error', onError);
  await import('../src/index.js');
  await new Promise((resolve) => setTimeout(resolve));
  window.removeEventListener('error', onError);

  expect(errors).toEqual([]);
  for (const tag of TAGS) {
    const el = document.querySelector(tag)!;
    expect(customElements.get(tag), tag).toBeDefined();
    expect(el.shadowRoot, `${tag} rendered`).not.toBeNull();
  }
});
