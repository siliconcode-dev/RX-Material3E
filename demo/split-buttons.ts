import '../packages/web/src/split-button/split-button.js';
import '../packages/web/src/icon/icon.js';
import type {SplitButtonVariant} from '../packages/web/src/split-button/index.js';
import type {ButtonSize} from '../packages/web/src/button/index.js';

function split(attributes: Record<string, string>, content: string) {
  const el = document.createElement('rx-split-button');
  el.setAttribute('trailing-label', 'More options');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  el.innerHTML = content;
  return el;
}

const log = document.getElementById('log')!;
const variants: [SplitButtonVariant, string, string][] = [
  ['filled', 'Edit', 'edit'],
  ['tonal', 'Reply', 'reply'],
  ['elevated', 'Save', 'save'],
  ['outlined', 'Share', 'share'],
];
const row = document.getElementById('variants')!;
for (const [variant, label, icon] of variants) {
  const el = split({variant}, `<rx-icon slot="icon">${icon}</rx-icon>${label}`);
  el.addEventListener('leading-click', () => (log.textContent = `${label}: main action`));
  el.addEventListener('change', () => {
    log.textContent = `${label}: menu ${(el as unknown as {checked: boolean}).checked ? 'open' : 'closed'}`;
  });
  row.append(el);
}

const sizes: [ButtonSize, string][] = [
  ['xs', 'Extra small · 32dp'],
  ['s', 'Small · 40dp (default)'],
  ['m', 'Medium · 56dp'],
  ['l', 'Large · 96dp'],
  ['xl', 'Extra large · 136dp'],
];
const sizeList = document.getElementById('sizes')!;
for (const [size, name] of sizes) {
  const label = document.createElement('span');
  label.className = 'name rx-typescale-label-large';
  label.textContent = name;
  sizeList.append(label, split({size}, '<rx-icon slot="icon">edit</rx-icon>Label'));
}
