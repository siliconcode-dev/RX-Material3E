import '../packages/web/src/fab-menu/fab-menu.js';
import '../packages/web/src/fab-menu/toggle-fab.js';
import '../packages/web/src/icon/icon.js';
import type {
  FabMenuAlign,
  FabMenuColor,
  RxFabMenu,
  ToggleFabSize,
} from '../packages/web/src/fab-menu/index.js';
import {setMotionDurationScale} from '../packages/web/src/motion/index.js';

// The sample's items, with the Material Symbols closest to its icons.
const ITEMS: [string, string][] = [
  ['chat', 'Reply'],
  ['group', 'Reply all'],
  ['contacts', 'Forward'],
  ['snooze', 'Snooze'],
  ['archive', 'Archive'],
  ['label', 'Label'],
];

function item([icon, text]: [string, string], color?: FabMenuColor) {
  const el = document.createElement('rx-fab-menu-item');
  if (color) el.color = color;
  el.innerHTML = `<rx-icon slot="icon">${icon}</rx-icon>${text}`;
  return el;
}

function toggleFab(attributes: Record<string, string> = {}) {
  const el = document.createElement('rx-toggle-fab');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.setAttribute('aria-label', 'Toggle menu');
  el.innerHTML = '<rx-icon>add</rx-icon><rx-icon slot="checked">close</rx-icon>';
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

function screen(menu: RxFabMenu) {
  const div = document.createElement('div');
  div.className = 'screen short';
  div.append(menu);
  return div;
}

function smallMenu(attributes: Record<string, string>, color?: FabMenuColor) {
  const menu = document.createElement('rx-fab-menu');
  for (const [name, value] of Object.entries(attributes)) menu.setAttribute(name, value);
  menu.append(toggleFab(color ? {slot: 'button', color} : {slot: 'button'}));
  for (const entry of ITEMS.slice(0, 3)) menu.append(item(entry, color));
  return menu;
}

document.getElementById('slow')!.addEventListener('change', (event) => {
  setMotionDurationScale((event.target as HTMLInputElement).checked ? 5 : null);
});

const list = document.getElementById('list')!;
for (let i = 0; i < 30; i++) {
  const li = document.createElement('li');
  li.className = 'rx-typescale-body-large';
  li.textContent = `List item - ${i}`;
  list.append(li);
}

const menu = document.getElementById('menu') as RxFabMenu;
for (const entry of ITEMS) menu.append(item(entry));
const log = document.getElementById('log')!;
menu.addEventListener('click', (event) => {
  const chosen = (event.target as Element).closest('rx-fab-menu-item');
  if (chosen) log.textContent = `${chosen.textContent?.trim()} chosen`;
});
menu.addEventListener('toggle', () => {
  log.textContent = menu.expanded ? 'Menu opened' : 'Menu closed';
});

const sizes: [ToggleFabSize, string][] = [
  ['baseline', 'Baseline · 56dp'],
  ['medium', 'Medium · 80dp'],
  ['large', 'Large · 96dp'],
];
const sizeRow = document.getElementById('sizes')!;
for (const [size, caption] of sizes) sizeRow.append(figure(toggleFab({size}), caption));

const colors: [FabMenuColor, string][] = [
  ['primary', 'Primary'],
  ['secondary', 'Secondary'],
  ['tertiary', 'Tertiary'],
];
const colorRow = document.getElementById('colors')!;
for (const [color, caption] of colors) {
  colorRow.append(figure(screen(smallMenu({expanded: ''}, color)), caption));
}

const aligns: [FabMenuAlign, string][] = [
  ['end', 'End'],
  ['start', 'Start'],
  ['center', 'Center'],
];
const alignRow = document.getElementById('aligns')!;
for (const [align, caption] of aligns) {
  alignRow.append(figure(screen(smallMenu({align, expanded: ''})), caption));
}
