import '../packages/web/src/shapes/shape.js';
import '../packages/web/src/ripple/ripple.js';
import '../packages/web/src/focus/focus-ring.js';
import {Morph} from '../packages/web/src/shapes/graphics/index.js';
import {
  MATERIAL_SHAPE_NAMES,
  kebabShapeName,
  materialShape,
  morphShapePath,
  type MaterialShapeName,
  type RxShape,
} from '../packages/web/src/shapes/index.js';

// Tap a shape.
const live = document.getElementById('live') as RxShape;
const picks = document.getElementById('picks')!;
const buttons = MATERIAL_SHAPE_NAMES.map((name) => {
  const button = document.createElement('button');
  button.className = 'pick';
  button.type = 'button';
  button.setAttribute('aria-label', kebabShapeName(name).replaceAll('-', ' '));
  button.setAttribute('aria-pressed', String(name === 'Circle'));
  const icon = document.createElement('rx-shape');
  icon.shape = kebabShapeName(name);
  icon.noMorph = true;
  button.append(icon, document.createElement('rx-ripple'), document.createElement('rx-focus-ring'));
  button.addEventListener('click', () => {
    live.shape = kebabShapeName(name);
    for (const b of buttons) b.setAttribute('aria-pressed', String(b === button));
  });
  return button;
});
picks.append(...buttons);

// Scrub a morph.
const form = document.getElementById('scrub-controls') as HTMLFormElement;
const field = <T extends Element>(name: string) => form.elements.namedItem(name) as unknown as T;
const from = field<HTMLSelectElement>('from');
const to = field<HTMLSelectElement>('to');
for (const select of [from, to]) {
  select.append(
    ...MATERIAL_SHAPE_NAMES.map((name) =>
      Object.assign(document.createElement('option'), {
        value: name,
        textContent: kebabShapeName(name),
      }),
    ),
  );
}
from.value = 'Heart';
to.value = 'Clover8Leaf';

const svgNS = 'http://www.w3.org/2000/svg';
const path = document.getElementById('scrub-path')!;
const anchors = document.getElementById('scrub-anchors')!;
const info = document.getElementById('scrub-info')!;
let morph: Morph | null = null;
let morphKey = '';

function updateScrub() {
  const key = `${from.value}>${to.value}`;
  if (key !== morphKey) {
    morph = new Morph(
      materialShape(from.value as MaterialShapeName),
      materialShape(to.value as MaterialShapeName),
    );
    morphKey = key;
    info.textContent = `${morph.morphMatch.length} matched curve pairs.`;
  }
  const progress = Number(field<HTMLInputElement>('progress').value);
  field<HTMLOutputElement>('progressOut').value = progress.toFixed(2);
  path.setAttribute('d', morphShapePath(morph!, progress, 1, 1));
  anchors.replaceChildren();
  if (field<HTMLInputElement>('anchors').checked) {
    // The anchors, centered the same way as the path (on the control-point bounds).
    const cubics = morph!.asCubics(progress);
    const xs = cubics.flatMap((c) => [c.points[0], c.points[2], c.points[4], c.points[6]]);
    const ys = cubics.flatMap((c) => [c.points[1], c.points[3], c.points[5], c.points[7]]);
    const dx = 0.5 - (Math.min(...xs) + Math.max(...xs)) / 2;
    const dy = 0.5 - (Math.min(...ys) + Math.max(...ys)) / 2;
    for (const c of cubics) {
      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'anchor');
      dot.setAttribute('cx', String(c.anchor0X + dx));
      dot.setAttribute('cy', String(c.anchor0Y + dy));
      dot.setAttribute('r', '0.012');
      anchors.append(dot);
    }
  }
}
form.addEventListener('input', updateScrub);
updateScrub();

// Compose's LoadingIndicator.IndeterminateIndicatorPolygons, as a loop.
const sequence: MaterialShapeName[] = [
  'SoftBurst',
  'Cookie9Sided',
  'Pentagon',
  'Pill',
  'Sunny',
  'Cookie4Sided',
  'Oval',
];
const film = document.getElementById('film')!;
const head = document.createElement('div');
head.className = 'film-row film-head rx-typescale-label-medium';
head.append(document.createElement('span'));
for (const p of [0, 0.25, 0.5, 0.75, 1]) {
  head.append(Object.assign(document.createElement('span'), {textContent: String(p)}));
}
film.append(head);
sequence.forEach((name, i) => {
  const next = sequence[(i + 1) % sequence.length];
  const m = new Morph(materialShape(name).normalized(), materialShape(next).normalized());
  const row = document.createElement('div');
  row.className = 'film-row';
  row.append(
    Object.assign(document.createElement('code'), {
      textContent: `${kebabShapeName(name)} → ${kebabShapeName(next)}`,
    }),
  );
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1 1');
    svg.setAttribute('aria-hidden', 'true');
    const shape = document.createElementNS(svgNS, 'path');
    shape.setAttribute('d', morphShapePath(m, p, 1, 1));
    svg.append(shape);
    row.append(svg);
  }
  film.append(row);
});
