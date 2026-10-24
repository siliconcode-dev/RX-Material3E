import {afterEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import '../../src/shapes/shape.js';
import {setMotionDurationScale} from '../../src/motion/index.js';
import {Morph, star} from '../../src/shapes/graphics/index.js';
import {manualFrames} from '../helpers/manual-frames.js';
import {
  MATERIAL_SHAPE_NAMES,
  MaterialShapes,
  kebabShapeName,
  materialShape,
  materialShapeName,
  morphShapePath,
  shapePath,
  type RxShape,
} from '../../src/index.js';

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const el = document.querySelector('rx-shape') as RxShape;
  await el.updateComplete;
  return el;
}

const clipOf = (el: RxShape) =>
  (el.shadowRoot!.querySelector('.shape') as HTMLElement).style.clipPath;

/** The browser rewrites path() text when it stores it; compare in its form. */
function clip(d: string) {
  const probe = document.createElement('div');
  probe.style.clipPath = `path('${d}')`;
  return probe.style.clipPath;
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

afterEach(() => document.body.replaceChildren());

describe('MaterialShapes', () => {
  it('maps every kebab name to its Compose name and back', () => {
    for (const name of MATERIAL_SHAPE_NAMES) {
      expect(materialShapeName(kebabShapeName(name))).toBe(name);
      expect(materialShapeName(name)).toBe(name);
    }
    expect(kebabShapeName('Cookie12Sided')).toBe('cookie-12-sided');
    expect(kebabShapeName('Clover4Leaf')).toBe('clover-4-leaf');
    expect(materialShapeName('nope')).toBeUndefined();
  });

  it('builds each shape once and caches it, as Compose does', () => {
    expect(MaterialShapes.Heart).toBe(MaterialShapes.Heart);
    expect(MaterialShapes.Heart).toBe(materialShape('Heart'));
  });

  it('keeps every shape inside the 0..1 square', () => {
    for (const name of MATERIAL_SHAPE_NAMES) {
      const [l, t, r, b] = materialShape(name).calculateBounds(undefined, false);
      for (const v of [l, t, r, b]) {
        expect(v, name).toBeGreaterThanOrEqual(-1e-6);
        expect(v, name).toBeLessThanOrEqual(1 + 1e-6);
      }
    }
  });
});

describe('shapePath', () => {
  it('scales to the size and centers the bounds, like Compose toShape', () => {
    // Compose centers the path's control-point bounds (Android Path bounds),
    // i.e. the approximate polygon bounds, in the available size.
    for (const name of ['Heart', 'Arrow', 'Fan', 'SemiCircle'] as const) {
      const polygon = materialShape(name);
      const [l, t, r, b] = polygon.calculateBounds();
      const w = 200;
      const h = 100;
      const dx = w / 2 - ((l + r) / 2) * w;
      const dy = h / 2 - ((t + b) / 2) * h;
      const placed = polygon.transformed((x, y) => [x * w + dx, y * h + dy]);
      const [pl, pt, pr, pb] = placed.calculateBounds();
      // The polygon math is 32-bit, like Compose's Float math.
      expect((pl + pr) / 2, name).toBeCloseTo(100, 4);
      expect((pt + pb) / 2, name).toBeCloseTo(50, 4);
      expect(shapePath(polygon, w, h)).toMatch(/^M[-\d.]+ [-\d.]+C/);
    }
  });
});

describe('rx-shape', () => {
  it('clips to the named shape at its size', async () => {
    const el = await mount(
      '<rx-shape shape="cookie-9-sided" style="width: 120px; height: 120px"></rx-shape>',
    );
    await nextFrame();
    expect(clipOf(el)).toBe(clip(shapePath(materialShape('Cookie9Sided'), 120, 120)));
  });

  it('accepts Compose names too', async () => {
    const el = await mount('<rx-shape shape="SoftBurst"></rx-shape>');
    await nextFrame();
    expect(clipOf(el)).toBe(clip(shapePath(materialShape('SoftBurst'), 48, 48)));
  });

  it('really clips the fill: corners are outside, the center inside', async () => {
    const el = await mount(
      '<rx-shape shape="clover-4-leaf" style="position: absolute; left: 0; top: 0; width: 100px; height: 100px"></rx-shape>',
    );
    await nextFrame();
    // Clipping only changes what is painted (as in Compose); hit testing
    // inside the shadow root shows whether the fill is there.
    const fill = el.shadowRoot!.querySelector('.shape');
    const at = (x: number, y: number) => el.shadowRoot!.elementFromPoint(x, y);
    expect(at(50, 50)).toBe(fill);
    expect(at(1, 1)).not.toBe(fill);
    expect(at(99, 99)).not.toBe(fill);
  });

  it('updates when it is resized', async () => {
    const el = await mount('<rx-shape shape="heart" style="width: 60px; height: 60px"></rx-shape>');
    await nextFrame();
    el.style.width = '90px';
    await nextFrame();
    expect(clipOf(el)).toBe(clip(shapePath(materialShape('Heart'), 90, 60)));
  });

  it('updates when the shape changes', async () => {
    const el = await mount('<rx-shape shape="heart" no-morph></rx-shape>');
    el.shape = 'sunny';
    await el.updateComplete;
    expect(clipOf(el)).toBe(clip(shapePath(materialShape('Sunny'), 48, 48)));
  });

  it('ignores CSS transforms when sizing the clip', async () => {
    const el = await mount(
      '<rx-shape shape="gem" style="width: 80px; height: 80px; rotate: 30deg"></rx-shape>',
    );
    await nextFrame();
    expect(clipOf(el)).toBe(clip(shapePath(materialShape('Gem'), 80, 80)));
  });

  it('takes any normalized polygon', async () => {
    const el = await mount('<rx-shape no-morph></rx-shape>');
    const custom = star(6, {innerRadius: 0.6}).normalized();
    el.polygon = custom;
    await el.updateComplete;
    expect(clipOf(el)).toBe(clip(shapePath(custom, 48, 48)));
  });

  it('does not clip for an unknown name', async () => {
    const el = await mount('<rx-shape shape="nope"></rx-shape>');
    await nextFrame();
    expect(clipOf(el)).toBe('');
    expect(el.resolvedPolygon).toBeNull();
  });

  it('fills with primary-container and its content color by default', async () => {
    document.documentElement.dataset.theme = 'light';
    const el = await mount('<rx-shape shape="pill">x</rx-shape>');
    const fill = getComputedStyle(el.shadowRoot!.querySelector('.shape')!).backgroundColor;
    const probe = document.createElement('i');
    probe.style.color = 'var(--md-sys-color-primary-container)';
    document.body.append(probe);
    expect(fill).toBe(getComputedStyle(probe).color);
    delete document.documentElement.dataset.theme;
  });

  describe('morphing', () => {
    // A very soft spring keeps the morph going for seconds.
    const slow = 'width: 100px; height: 100px; --rx-shape-morph-stiffness: 2';
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) await nextFrame();
    };

    it("draws Google's Morph at the spring's progress", async () => {
      const el = await mount(`<rx-shape shape="heart" style="${slow}"></rx-shape>`);
      await nextFrame();
      el.shape = 'clover-8-leaf';
      await el.updateComplete;
      await frames(3);
      const progress = el.morphProgress!;
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
      const morph = new Morph(materialShape('Heart'), materialShape('Clover8Leaf'));
      expect(clipOf(el)).toBe(clip(morphShapePath(morph, progress, 100, 100)));
    });

    it('springs back from where it is when the shape goes back mid-morph', async () => {
      const el = await mount(
        '<rx-shape shape="square" style="width: 100px; height: 100px; --rx-shape-morph-stiffness: 60"></rx-shape>',
      );
      // The manual frame clock: every frame is seen, however busy the machine.
      const clock = manualFrames();
      try {
        el.shape = 'circle';
        await el.updateComplete;
        clock.step(4);
        const before = el.morphProgress!;
        el.shape = 'square';
        await el.updateComplete;
        // Same morph, same place: no jump.
        expect(el.morphProgress).toBe(before);
        // It keeps its forward speed for a moment (as Compose's Animatable
        // does), then springs back and settles on the square.
        let peak = before;
        for (let i = 0; i < 180 && el.morphProgress !== null; i++) {
          clock.step();
          peak = Math.max(peak, el.morphProgress ?? 0);
        }
        expect(peak).toBeGreaterThan(before);
        // The morph ends once its animation's promise settles.
        await new Promise((r) => setTimeout(r));
        expect(el.morphProgress).toBeNull();
        expect(clipOf(el)).toBe(clip(shapePath(materialShape('Square'), 100, 100)));
      } finally {
        clock.restore();
      }
    });

    it('ends exactly on the new shape', async () => {
      const el = await mount(
        '<rx-shape shape="pill" style="width: 80px; height: 80px"></rx-shape>',
      );
      el.shape = 'sunny';
      await el.updateComplete;
      expect(el.morphProgress).not.toBeNull();
      await new Promise((r) => setTimeout(r, 1200));
      await nextFrame();
      expect(el.morphProgress).toBeNull();
      expect(clipOf(el)).toBe(clip(shapePath(materialShape('Sunny'), 80, 80)));
    });

    it('switches at once with no-morph, and within a frame with reduced motion', async () => {
      const el = await mount('<rx-shape shape="gem" no-morph></rx-shape>');
      el.shape = 'bun';
      await el.updateComplete;
      expect(el.morphProgress).toBeNull();
      expect(clipOf(el)).toBe(clip(shapePath(materialShape('Bun'), 48, 48)));

      setMotionDurationScale(0);
      try {
        const reduced = await mount('<rx-shape shape="gem"></rx-shape>');
        reduced.shape = 'bun';
        await reduced.updateComplete;
        await frames(2);
        expect(reduced.morphProgress).toBeNull();
        expect(clipOf(reduced)).toBe(clip(shapePath(materialShape('Bun'), 48, 48)));
      } finally {
        setMotionDurationScale(null);
      }
    });

    it('takes its own stiffness, else the default spatial spring', async () => {
      document.body.innerHTML =
        '<rx-shape id="a" shape="gem"></rx-shape><rx-shape id="b" shape="gem" style="--rx-shape-morph-stiffness: 20"></rx-shape>';
      const [a, b] = [...document.querySelectorAll('rx-shape')] as RxShape[];
      await Promise.all([a.updateComplete, b.updateComplete]);
      // Frames from a manual clock, so both springs see the same five frames.
      const clock = manualFrames();
      try {
        a.shape = b.shape = 'bun';
        await Promise.all([a.updateComplete, b.updateComplete]);
        clock.step(5);
        expect(a.morphProgress!).toBeGreaterThan(0);
        expect(a.morphProgress!).toBeGreaterThan(b.morphProgress!);
      } finally {
        clock.restore();
      }
    });
  });
});
