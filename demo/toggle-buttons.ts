import '../packages/web/src/button/toggle-button.js';
import '../packages/web/src/icon/icon.js';
import type {ButtonSize, ToggleButtonVariant} from '../packages/web/src/button/index.js';

const variants: [ToggleButtonVariant, string, string, string][] = [
  ['filled', 'Filled', 'ToggleButton', 'favorite'],
  ['tonal', 'Tonal', 'FilledTonalToggleButton', 'bookmark'],
  ['elevated', 'Elevated', 'ElevatedToggleButton', 'star'],
  ['outlined', 'Outlined', 'OutlinedToggleButton', 'notifications'],
];

function toggle(attributes: Record<string, string>, content: string) {
  const el = document.createElement('rx-toggle-button');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.innerHTML = content;
  return el;
}

const grid = document.getElementById('grid')!;
for (const [variant, label, compose, icon] of variants) {
  const name = document.createElement('span');
  name.className = 'rx-typescale-body-large';
  name.innerHTML = `${label}<br /><code class="rx-typescale-body-small">${compose}</code>`;
  const cell = document.createElement('span');
  cell.className = 'wide-only';
  cell.append(toggle({variant, disabled: ''}, label));
  grid.append(
    name,
    toggle({variant}, label),
    toggle({variant, checked: ''}, `<rx-icon slot="icon">${icon}</rx-icon>${label}`),
    cell,
  );
}

const sizes: [ButtonSize, string][] = [
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
    toggle({size}, '<rx-icon slot="icon">wifi</rx-icon>Wi-Fi'),
    toggle({size, checked: '', variant: 'tonal'}, 'On'),
    toggle({size, variant: 'outlined'}, 'Outlined'),
  );
  sizeRows.append(row);
}

const form = document.getElementById('form') as HTMLFormElement;
const output = document.getElementById('form-output')!;
const show = () => {
  const data = [...new FormData(form)].map(([k, v]) => `${k}=${String(v)}`);
  output.textContent = `Form data: ${data.join('&') || '(nothing)'}`;
};
form.addEventListener('change', show);
// After the reset has put the buttons back.
form.addEventListener('reset', () => setTimeout(show));
customElements.whenDefined('rx-toggle-button').then(() => requestAnimationFrame(show));
