import '../packages/web/src/icon/icon.js';
import type {IconVariant} from '../packages/web/src/index.js';

const NAMES = [
  'home',
  'search',
  'settings',
  'favorite',
  'star',
  'person',
  'mail',
  'notifications',
  'add',
  'edit',
  'delete',
  'share',
  'check',
  'close',
  'menu',
  'more_vert',
  'arrow_back',
  'download',
  'photo_camera',
  'image',
  'calendar_month',
  'schedule',
  'call',
  'map',
];

const form = document.getElementById('icon-controls') as HTMLFormElement;
const field = <T extends Element>(name: string) => form.elements.namedItem(name) as unknown as T;
const grid = document.getElementById('icon-grid')!;

function cell(name: string) {
  const div = document.createElement('div');
  div.className = 'icon-cell';
  const icon = document.createElement('rx-icon');
  icon.textContent = name;
  const label = Object.assign(document.createElement('small'), {
    className: 'rx-typescale-body-small',
    textContent: name,
  });
  div.append(icon, label);
  return div;
}

function render() {
  const custom = field<HTMLInputElement>('custom').value.trim().toLowerCase().replace(/\s+/g, '_');
  grid.replaceChildren(...[custom, ...NAMES].filter(Boolean).map(cell));
  update();
}

function update() {
  const variant = field<HTMLSelectElement>('variant').value as IconVariant;
  const filled = field<HTMLInputElement>('filled').checked;
  const weight = field<HTMLInputElement>('weight').value;
  const grade = field<HTMLInputElement>('grade').value;
  const size = field<HTMLInputElement>('size').value;
  field<HTMLOutputElement>('weightOut').value = weight;
  field<HTMLOutputElement>('gradeOut').value = grade;
  field<HTMLOutputElement>('sizeOut').value = size;
  for (const icon of grid.querySelectorAll('rx-icon')) {
    icon.variant = variant;
    icon.filled = filled;
    icon.style.setProperty('--rx-icon-weight', weight);
    icon.style.setProperty('--rx-icon-grade', grade);
    icon.style.setProperty('--rx-icon-size', `${size}px`);
    icon.style.setProperty('--rx-icon-optical-size', size);
  }
}

field<HTMLInputElement>('custom').addEventListener('input', render);
form.addEventListener('input', (event) => {
  if ((event.target as HTMLElement).getAttribute('name') !== 'custom') update();
});
render();
