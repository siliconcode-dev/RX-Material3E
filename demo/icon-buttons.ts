import '../packages/web/src/icon-button/icon-button.js';
import '../packages/web/src/icon/icon.js';
import type {IconButtonSize, IconButtonVariant} from '../packages/web/src/icon-button/index.js';

const variants: [IconButtonVariant, string, string, string][] = [
  ['standard', 'Standard', 'IconButton', 'search'],
  ['filled', 'Filled', 'FilledIconButton', 'add'],
  ['tonal', 'Tonal', 'FilledTonalIconButton', 'edit'],
  ['outlined', 'Outlined', 'OutlinedIconButton', 'share'],
];

function iconButton(attributes: Record<string, string>, icon: string, label: string) {
  const el = document.createElement('rx-icon-button');
  el.setAttribute('type', 'button');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.innerHTML = `<rx-icon label="${label}">${icon}</rx-icon>`;
  return el;
}

function row(target: HTMLElement, label: string, compose: string, cells: [HTMLElement, boolean][]) {
  const name = document.createElement('span');
  name.className = 'name rx-typescale-body-large';
  name.innerHTML = `${label}<br /><code class="rx-typescale-body-small">${compose}</code>`;
  target.append(name);
  for (const [cell, wideOnly] of cells) {
    const wrap = document.createElement('span');
    if (wideOnly) wrap.className = 'wide-only';
    wrap.append(cell);
    target.append(wrap);
  }
}

const buttons = document.getElementById('buttons')!;
for (const [variant, label, compose, icon] of variants) {
  const hasVibrant = variant === 'standard' || variant === 'outlined';
  row(buttons, label, compose, [
    [iconButton({variant}, icon, label), false],
    [
      hasVibrant ? iconButton({variant, vibrant: ''}, icon, label) : document.createElement('span'),
      false,
    ],
    [iconButton({variant, disabled: ''}, icon, label), true],
    [iconButton({variant, morph: ''}, icon, label), true],
  ]);
}

const toggles = document.getElementById('toggles')!;
const toggleIcons: Record<IconButtonVariant, string> = {
  standard: 'favorite',
  filled: 'bookmark',
  tonal: 'push_pin',
  outlined: 'notifications',
};
for (const [variant, label, compose] of variants) {
  const icon = toggleIcons[variant];
  row(toggles, label, compose.replace('Button', 'ToggleButton'), [
    [iconButton({variant, toggle: ''}, icon, label), false],
    [iconButton({variant, toggle: '', checked: ''}, icon, label), false],
    [iconButton({variant, toggle: '', checked: '', disabled: ''}, icon, label), true],
    [iconButton({variant, toggle: '', morph: ''}, icon, label), true],
  ]);
}

const sizes: [IconButtonSize, string][] = [
  ['xs', 'Extra small · 32dp'],
  ['s', 'Small · 40dp (default)'],
  ['m', 'Medium · 56dp'],
  ['l', 'Large · 96dp'],
  ['xl', 'Extra large · 136dp'],
];
const sizeRows = document.getElementById('sizes')!;
for (const [size, name] of sizes) {
  const row = document.createElement('div');
  row.className = 'row';
  const label = document.createElement('span');
  label.className = 'name rx-typescale-label-large';
  label.textContent = name;
  row.append(
    label,
    iconButton({size, width: 'narrow', variant: 'tonal', toggle: '', morph: ''}, 'edit', 'Narrow'),
    iconButton({size, variant: 'filled', toggle: '', morph: ''}, 'favorite', 'Uniform'),
    iconButton({size, width: 'wide', variant: 'tonal', toggle: '', morph: ''}, 'send', 'Wide'),
    iconButton(
      {size, shape: 'square', variant: 'filled', toggle: '', morph: '', checked: ''},
      'star',
      'Square',
    ),
    iconButton({size, variant: 'outlined', morph: ''}, 'share', 'Outlined'),
  );
  sizeRows.append(row);
}

for (const id of ['bar-primary', 'bar-surface']) {
  const bar = document.getElementById(id)!;
  bar.prepend(iconButton({}, 'menu', 'Menu'));
  bar.append(
    iconButton({toggle: ''}, 'star', 'Star'),
    iconButton({variant: 'outlined'}, 'attach_file', 'Attach'),
    iconButton({}, 'more_vert', 'More'),
  );
}
