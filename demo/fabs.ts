import '../packages/web/src/fab/fab.js';
import '../packages/web/src/icon/icon.js';
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
