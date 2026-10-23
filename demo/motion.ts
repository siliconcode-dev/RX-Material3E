import {
  Animatable,
  animateWithSpring,
  FloatSpringSpec,
  MotionSchemes,
  setMotionDurationScale,
  springTiming,
  type MotionScheme,
  type MotionSchemeKey,
} from '../packages/web/src/motion/index.js';

const form = document.getElementById('controls') as HTMLFormElement;
const field = (name: string) => form.elements.namedItem(name) as HTMLSelectElement;
const scheme = (): MotionScheme =>
  field('scheme').value === 'standard' ? MotionSchemes.standard() : MotionSchemes.expressive();

const keys: [MotionSchemeKey, string][] = [
  ['defaultSpatial', 'Default spatial'],
  ['fastSpatial', 'Fast spatial'],
  ['slowSpatial', 'Slow spatial'],
  ['defaultEffects', 'Default effects'],
  ['fastEffects', 'Fast effects'],
  ['slowEffects', 'Slow effects'],
];

// The six springs, drawn from the port: value at every millisecond.
const svgNS = 'http://www.w3.org/2000/svg';
const curves = document.getElementById('curves')!;
const MaxMs = 900;
function drawCurves() {
  curves.replaceChildren(
    ...keys.map(([key, title]) => {
      const {dampingRatio, stiffness} = scheme()[key];
      const to = key.endsWith('Spatial') ? 100 : 1;
      const spec = new FloatSpringSpec(dampingRatio, stiffness);
      const {duration} = springTiming(dampingRatio, stiffness, {to});
      const points: string[] = [];
      for (let ms = 0; ms <= MaxMs; ms += 3) {
        const v = ms >= duration ? to : spec.getValueFromNanos(ms * 1e6, 0, to, 0);
        points.push(`${(ms / MaxMs) * 100},${50 - (v / to) * 40}`);
      }
      const card = document.createElement('figure');
      card.className = 'curve';
      card.style.margin = '0';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 60');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `${title} spring curve`);
      for (const y of [10, 50]) {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('class', 'grid');
        line.setAttribute('x1', '0');
        line.setAttribute('x2', '100');
        line.setAttribute('y1', String(y));
        line.setAttribute('y2', String(y));
        svg.append(line);
      }
      const end = document.createElementNS(svgNS, 'line');
      end.setAttribute('class', 'grid');
      const x = String(Math.min(100, (duration / MaxMs) * 100));
      end.setAttribute('x1', x);
      end.setAttribute('x2', x);
      end.setAttribute('y1', '0');
      end.setAttribute('y2', '60');
      end.setAttribute('stroke-dasharray', '3 3');
      const path = document.createElementNS(svgNS, 'polyline');
      path.setAttribute('class', 'line');
      path.setAttribute('points', points.join(' '));
      svg.append(end, path);
      const caption = document.createElement('figcaption');
      caption.innerHTML = `<div class="rx-typescale-title-small">${title}</div><div class="meta rx-typescale-body-small">damping ${dampingRatio}, stiffness ${stiffness} · ${duration}ms</div>`;
      card.append(svg, caption);
      return card;
    }),
  );
}

// Animatable: the ball.
const track = document.getElementById('track')!;
const ball = document.getElementById('ball')!;
const readout = document.getElementById('readout')!;
const x = new Animatable(0);
let ballSpring: MotionSchemeKey = 'defaultSpatial';
const springButtons = document.getElementById('ball-springs')!;
const ballKeys = keys.filter(([k]) => k.endsWith('Spatial'));
springButtons.append(
  ...ballKeys.map(([key, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = title;
    b.setAttribute('aria-pressed', String(key === ballSpring));
    b.addEventListener('click', () => {
      ballSpring = key;
      for (const other of springButtons.children) {
        other.setAttribute('aria-pressed', String(other === b));
      }
    });
    return b;
  }),
);
const show = () => {
  ball.style.translate = `${x.value}px 0`;
  readout.textContent = `x ${x.value.toFixed(1)}px · velocity ${x.velocity.toFixed(0)}px/s`;
};
track.addEventListener('click', (event) => {
  const box = track.getBoundingClientRect();
  const target = Math.max(0, Math.min(box.width - 96, event.clientX - box.left - 48));
  void x.animateTo(target, scheme()[ballSpring], undefined, show).then(show);
});
show();

// Web Animations: the cards.
document.getElementById('pop')!.addEventListener('click', () => {
  const cards = [...document.querySelectorAll<HTMLElement>('#cards .card')];
  const specs: MotionSchemeKey[] = ['fastSpatial', 'defaultSpatial', 'slowSpatial'];
  cards.forEach((card, i) => {
    animateWithSpring(card, {translate: ['0 48px', '0 0'], scale: [0.6, 1]}, scheme()[specs[i]], {
      distance: 48,
    });
  });
});

form.addEventListener('input', () => {
  // CSS tokens follow the scheme too (as components read them).
  if (field('scheme').value === 'standard')
    document.documentElement.dataset.motionScheme = 'standard';
  else delete document.documentElement.dataset.motionScheme;
  const scale = field('scale').value;
  setMotionDurationScale(scale === 'system' ? null : Number(scale));
  drawCurves();
});
drawCurves();
