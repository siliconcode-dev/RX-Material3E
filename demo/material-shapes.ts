import '../packages/web/src/shapes/shape.js';
import '../packages/web/src/icon/icon.js';
import {MATERIAL_SHAPE_NAMES, kebabShapeName} from '../packages/web/src/shapes/index.js';

const form = document.getElementById('shape-controls') as HTMLFormElement;
const grid = document.getElementById('shape-grid')!;

grid.append(
  ...MATERIAL_SHAPE_NAMES.map((name) => {
    const cell = document.createElement('div');
    cell.className = 'shape-cell';
    const shape = document.createElement('rx-shape');
    shape.shape = kebabShapeName(name);
    const label = Object.assign(document.createElement('code'), {
      textContent: kebabShapeName(name),
    });
    cell.append(shape, label);
    return cell;
  }),
);

function update() {
  const size = (form.elements.namedItem('size') as HTMLInputElement).value;
  const color = (form.elements.namedItem('color') as HTMLSelectElement).value;
  (form.elements.namedItem('sizeOut') as HTMLOutputElement).value = size;
  grid.style.setProperty('--size', `${size}px`);
  grid.style.setProperty('--rx-shape-color', `var(--md-sys-color-${color})`);
}
form.addEventListener('input', update);
update();
