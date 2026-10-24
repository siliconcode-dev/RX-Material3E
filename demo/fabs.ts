import '../packages/web/src/fab/fab.js';
import '../packages/web/src/icon/icon.js';
import '../packages/web/src/button/button.js';
import type {FabColor, FabSize} from '../packages/web/src/fab/index.js';

function fab(attributes: Record<string, string>, icon: string, label: string) {
  const el = document.createElement('rx-fab');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.innerHTML = `<rx-icon label="${label}">${icon}</rx-icon>`;
  return el;
}

function figure(el: HTMLElement, caption: string) {
  const fig = document.createElement('figure');
  const cap = document.createElement('figcaption');
  cap.className = 'rx-typescale-label-medium';
  cap.textContent = caption;
  fig.append(el, cap);
  return fig;
}

const sizes: [FabSize, string][] = [
  ['small', 'Small · 40dp'],
  ['baseline', 'Baseline · 56dp'],
  ['medium', 'Medium · 80dp'],
  ['large', 'Large · 96dp'],
];
const sizeRow = document.getElementById('sizes')!;
for (const [size, caption] of sizes) sizeRow.append(figure(fab({size}, 'add', 'Add'), caption));

const colors: [FabColor, string][] = [
  ['primary-container', 'Primary container'],
  ['secondary-container', 'Secondary container'],
  ['tertiary-container', 'Tertiary container'],
  ['primary', 'Primary'],
  ['secondary', 'Secondary'],
  ['tertiary', 'Tertiary'],
  ['surface', 'Surface'],
];
const colorRow = document.getElementById('colors')!;
for (const [color, caption] of colors)
  colorRow.append(figure(fab({color}, 'edit', 'Edit'), caption));

const log = document.getElementById('log')!;
document
  .getElementById('placed')!
  .addEventListener('click', () => (log.textContent = 'Compose clicked'));

const extendedSizes: [FabSize, string, string][] = [
  ['baseline', 'Extended FAB', 'add'],
  ['small', 'Small extended FAB', 'add'],
  ['medium', 'Medium extended FAB', 'add'],
  ['large', 'Large extended FAB', 'add'],
];
const extended = document.getElementById('extended')!;
for (const [size, text, icon] of extendedSizes) {
  const textOnly = document.createElement('rx-fab');
  textOnly.setAttribute('size', size);
  textOnly.label = text;
  const withIcon = fab({size}, icon, 'Add');
  withIcon.setAttribute('label', text);
  const row = document.createElement('div');
  row.className = 'row';
  row.append(textOnly, withIcon);
  extended.append(row);
}

const collapsing = document.getElementById('collapsing')!;
const folding: HTMLElement[] = [];
for (const [size, text, icon] of extendedSizes) {
  const el = fab({size, label: text}, icon, 'Add');
  folding.push(el);
  collapsing.append(el);
}
const toggle = document.getElementById('toggle')!;
toggle.addEventListener('click', () => {
  const collapse = !folding[0].hasAttribute('collapsed');
  for (const el of folding) el.toggleAttribute('collapsed', collapse);
  toggle.textContent = collapse ? 'Expand' : 'Collapse';
});
