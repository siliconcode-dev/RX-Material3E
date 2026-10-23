import '../packages/web/src/button/button.js';
import '../packages/web/src/icon/icon.js';
import type {ButtonSize, ButtonVariant} from '../packages/web/src/button/index.js';

const variants: [ButtonVariant, string, string, string][] = [
  ['filled', 'Filled', 'Button', 'add'],
  ['tonal', 'Tonal', 'FilledTonalButton', 'edit'],
  ['elevated', 'Elevated', 'ElevatedButton', 'favorite'],
  ['outlined', 'Outlined', 'OutlinedButton', 'share'],
  ['text', 'Text', 'TextButton', 'open_in_new'],
];

const grid = document.getElementById('grid')!;
for (const [variant, label, compose, icon] of variants) {
  const name = document.createElement('span');
  name.className = 'rx-typescale-body-large';
  name.innerHTML = `${label}<br /><code class="rx-typescale-body-small">${compose}</code>`;
  const plain = Object.assign(document.createElement('rx-button'), {variant, type: 'button'});
  plain.textContent = label;
  const withIcon = Object.assign(document.createElement('rx-button'), {variant, type: 'button'});
  withIcon.innerHTML = `<rx-icon slot="icon">${icon}</rx-icon>${label}`;
  const disabled = Object.assign(document.createElement('rx-button'), {
    variant,
    type: 'button',
    disabled: true,
  });
  disabled.textContent = label;
  const cell = document.createElement('span');
  cell.className = 'wide-only';
  cell.append(disabled);
  grid.append(name, plain, withIcon, cell);
}

const sizes: [ButtonSize, string][] = [
  ['xs', 'Extra small · 32dp'],
  ['s', 'Small · 40dp'],
  ['m', 'Medium · 56dp'],
  ['l', 'Large · 96dp'],
  ['xl', 'Extra large · 136dp'],
];

function button(attributes: Record<string, string>, content: string) {
  const el = document.createElement('rx-button');
  el.setAttribute('type', 'button');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.innerHTML = content;
  return el;
}

function sizeRows(target: HTMLElement, extra: Record<string, string>) {
  for (const [size, name] of sizes) {
    const row = document.createElement('div');
    row.className = 'row';
    const label = document.createElement('span');
    label.className = 'name rx-typescale-label-large';
    label.textContent = name;
    row.append(
      label,
      button({size, ...extra}, '<rx-icon slot="icon">edit</rx-icon>Label'),
      button({size, shape: 'square', variant: 'tonal', ...extra}, 'Square'),
      button({size, variant: 'outlined', ...extra}, 'Outlined'),
    );
    target.append(row);
  }
}

sizeRows(document.getElementById('sizes')!, {});
sizeRows(document.getElementById('morph')!, {morph: ''});

const form = document.getElementById('form') as HTMLFormElement;
const output = document.getElementById('form-output')!;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = [...new FormData(form, event.submitter)].map(([k, v]) => `${k}=${String(v)}`);
  output.textContent = `Submitted: ${data.join('&')}`;
});
form.addEventListener('reset', () => (output.textContent = 'Reset.'));
