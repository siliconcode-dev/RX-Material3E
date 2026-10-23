import '../packages/web/src/surface/surface.js';
import '../packages/web/src/icon/icon.js';
import {SURFACE_COLORS, SURFACE_SHAPES, type RxSurface} from '../packages/web/src/index.js';

function surface(attrs: Partial<RxSurface>, title: string, note: string) {
  const s = Object.assign(document.createElement('rx-surface'), attrs);
  s.innerHTML = `<div class="pad"><span class="rx-typescale-title-small"></span><small class="rx-typescale-body-small"></small></div>`;
  s.querySelector('span')!.textContent = title;
  s.querySelector('small')!.textContent = note;
  return s;
}

document
  .getElementById('colors')!
  .append(
    ...Object.entries(SURFACE_COLORS).map(([color, content]) =>
      surface({color: color as RxSurface['color'], shape: 'medium'}, color, `with ${content}`),
    ),
  );

document
  .getElementById('shapes')!
  .append(
    ...SURFACE_SHAPES.map((shape) =>
      surface({shape, color: 'primary-container'}, shape, 'shape token'),
    ),
  );

const elevation = document.getElementById('elevation')!;
for (let level = 0; level <= 5; level++) {
  elevation.append(
    surface(
      {elevation: level, shape: 'medium', color: 'surface-container-low'},
      `Shadow ${level}`,
      'elevation',
    ),
  );
}
for (let level = 1; level <= 5; level++) {
  elevation.append(
    surface({tonalElevation: level, shape: 'medium'}, `Tonal ${level}`, 'tonal-elevation'),
  );
}
const outer = surface({tonalElevation: 2, shape: 'large'}, 'Tonal 2', 'with a tonal 2 inside');
outer
  .querySelector('.pad')!
  .append(surface({tonalElevation: 2, shape: 'medium'}, 'Nested', 'adds up to 6dp'));
elevation.append(outer);

let clicks = 0;
document.getElementById('clickable')!.addEventListener('click', () => {
  document.getElementById('clicks')!.textContent =
    `Clicked ${++clicks} time${clicks === 1 ? '' : 's'}`;
});

const toggle = document.getElementById('toggle') as RxSurface;
toggle.addEventListener('click', () => {
  toggle.selected = !toggle.selected;
  document.getElementById('toggle-icon')!.toggleAttribute('filled', toggle.selected);
});
