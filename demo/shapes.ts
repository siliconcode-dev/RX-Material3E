import {
  circle,
  Corner,
  CornerRounding,
  pill,
  pillStar,
  rectangle,
  RoundedPolygon,
  star,
  toPath,
} from '../packages/web/src/shapes/graphics/index.js';

const SVG = 'http://www.w3.org/2000/svg';
const form = document.getElementById('shape-controls') as HTMLFormElement;
const field = <T extends Element>(name: string) => form.elements.namedItem(name) as unknown as T;
const num = (name: string) => Number(field<HTMLInputElement>(name).value);
const stage = document.getElementById('stage')!;
const stats = document.getElementById('stats')!;

function build(): RoundedPolygon {
  const kind = field<HTMLSelectElement>('kind').value;
  const vertices = num('vertices');
  const rounding = new CornerRounding(num('radius'), num('smoothing'));
  const innerRounding = new CornerRounding(num('innerRadius'), num('smoothing'));
  switch (kind) {
    case 'polygon':
      return RoundedPolygon.fromNumVertices(vertices, {rounding});
    case 'star':
      return star(vertices, {innerRadius: num('inner'), rounding, innerRounding});
    case 'pillStar':
      return pillStar({
        numVerticesPerRadius: vertices,
        innerRadiusRatio: num('inner'),
        rounding,
        innerRounding,
      });
    case 'rectangle':
      return rectangle({width: 2, height: 1.4, rounding});
    case 'circle':
      return circle({numVertices: vertices});
    default:
      return pill({width: 2, height: 1, smoothing: num('smoothing')});
  }
}

function el(tag: string, attrs: Record<string, string | number>) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function render() {
  const kind = field<HTMLSelectElement>('kind').value;
  for (const label of form.querySelectorAll<HTMLElement>('[data-for]')) {
    label.hidden = !label.dataset.for!.split(' ').includes(kind);
  }
  for (const name of ['vertices', 'inner', 'radius', 'smoothing', 'innerRadius']) {
    field<HTMLOutputElement>(`${name}Out`).value = field<HTMLInputElement>(name).value;
  }

  const polygon = build().normalized();
  stage.replaceChildren(el('path', {class: 'shape-fill', d: toPath(polygon, {startAngle: 0})}));

  if (field<HTMLInputElement>('points').checked) {
    for (const c of polygon.cubics) {
      stage.append(
        el('line', {
          class: 'handle-line',
          x1: c.anchor0X,
          y1: c.anchor0Y,
          x2: c.control0X,
          y2: c.control0Y,
        }),
        el('line', {
          class: 'handle-line',
          x1: c.anchor1X,
          y1: c.anchor1Y,
          x2: c.control1X,
          y2: c.control1Y,
        }),
        el('circle', {class: 'control', cx: c.control0X, cy: c.control0Y, r: 0.007}),
        el('circle', {class: 'control', cx: c.control1X, cy: c.control1Y, r: 0.007}),
        el('circle', {class: 'anchor', cx: c.anchor0X, cy: c.anchor0Y, r: 0.01}),
      );
    }
  }

  const corners = polygon.features.filter((f) => f instanceof Corner) as Corner[];
  const convex = corners.filter((c) => c.convex).length;
  stats.textContent =
    `${polygon.cubics.length} cubic curves · ${corners.length} corners ` +
    `(${convex} convex, ${corners.length - convex} concave)`;
}

form.addEventListener('input', render);
render();

const r = (radius: number, smoothing = 0) => new CornerRounding(radius, smoothing);
const examples: [string, RoundedPolygon][] = [
  ['Triangle, rounded', RoundedPolygon.fromNumVertices(3, {rounding: r(0.2)})],
  ['Square, smoothed', RoundedPolygon.fromNumVertices(4, {rounding: r(0.3, 1)})],
  ['Pentagon', RoundedPolygon.fromNumVertices(5, {rounding: r(0.1)})],
  ['Hexagon, smoothed', RoundedPolygon.fromNumVertices(6, {rounding: r(0.2, 0.6)})],
  ['Circle', circle()],
  ['Pill', pill()],
  ['Star, 5 points', star(5, {innerRadius: 0.45, rounding: r(0.05)})],
  ['Soft burst', star(10, {innerRadius: 0.75, rounding: r(0.06, 1), innerRounding: r(0.06, 1)})],
  ['Cookie', star(9, {innerRadius: 0.85, rounding: r(0.2, 0.2), innerRounding: r(0.2, 0.2)})],
  ['Clover', star(4, {innerRadius: 0.35, rounding: r(0.32), innerRounding: r(0.32)})],
  ['Pill star', pillStar({rounding: r(0.5, 0.2)})],
  ['Rounded rectangle', rectangle({width: 2, height: 1.4, rounding: r(0.3, 0.6)})],
];
document.getElementById('gallery')!.append(
  ...examples.map(([name, polygon]) => {
    const figure = document.createElement('figure');
    const svg = el('svg', {viewBox: '0 0 1 1', 'aria-hidden': 'true'});
    svg.append(el('path', {d: toPath(polygon.normalized(), {startAngle: 0})}));
    const caption = Object.assign(document.createElement('figcaption'), {
      className: 'rx-typescale-body-small',
      textContent: name,
    });
    figure.append(svg, caption);
    return figure;
  }),
);
