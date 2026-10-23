import {describe, expect, it} from 'vitest';
import {
  colorToVector,
  cssColor,
  parseCssColor,
  Transparent,
  vectorToColor,
} from '../../src/motion/color.js';

// The test's own copy of Oklab values for sRGB colors (Björn Ottosson's
// reference: https://bottosson.github.io/posts/oklab/).
const OKLAB = [
  [{r: 1, g: 1, b: 1}, [1, 0, 0]],
  [{r: 0, g: 0, b: 0}, [0, 0, 0]],
  [{r: 1, g: 0, b: 0}, [0.627955, 0.224863, 0.125846]],
  [{r: 0, g: 1, b: 0}, [0.86644, -0.233888, 0.179498]],
  [{r: 0, g: 0, b: 1}, [0.452014, -0.032457, -0.311528]],
] as const;

describe("Color.VectorConverter (Compose's color animation space)", () => {
  it('converts sRGB to [alpha, L, a, b] in Oklab', () => {
    for (const [rgb, [L, a, b]] of OKLAB) {
      const [alpha, l, aa, bb] = colorToVector({...rgb, alpha: 0.5});
      expect(alpha).toBe(0.5);
      expect(l).toBeCloseTo(L, 4);
      expect(aa).toBeCloseTo(a, 4);
      expect(bb).toBeCloseTo(b, 4);
    }
  });

  it('converts back, round trip within float noise', () => {
    for (const rgb of [
      {r: 0.2, g: 0.4, b: 0.6, alpha: 1},
      {r: 0.79, g: 0.77, b: 0.82, alpha: 0.1},
      {r: 1, g: 0, b: 0.5, alpha: 0},
    ]) {
      const back = vectorToColor(colorToVector(rgb));
      for (const key of ['r', 'g', 'b', 'alpha'] as const)
        expect(back[key]).toBeCloseTo(rgb[key], 6);
    }
  });

  it('clamps on the way back: L 0..1, a and b ±0.5, alpha 0..1, channels into sRGB', () => {
    // Past the ends, as a bouncing spring can take them.
    expect(vectorToColor([1.3, 1.2, 0, 0])).toEqual(vectorToColor([1, 1, 0, 0]));
    expect(vectorToColor([-0.2, -0.1, 0, 0])).toEqual({r: 0, g: 0, b: 0, alpha: 0});
    expect(vectorToColor([1, 0.6, 0.9, 0])).toEqual(vectorToColor([1, 0.6, 0.5, 0]));
    const c = vectorToColor([1, 0.9, 0.5, -0.5]);
    for (const v of [c.r, c.g, c.b]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('interpolates alpha and color separately: half way to Transparent is darker and half see-through', () => {
    const from = colorToVector({r: 0.79, g: 0.77, b: 0.82, alpha: 1});
    const to = colorToVector(Transparent);
    const mid = vectorToColor(from.map((v, i) => (v + to[i]) / 2));
    expect(mid.alpha).toBeCloseTo(0.5, 9);
    // Not the premultiplied mix CSS would make (which keeps the color itself).
    expect(mid.r).toBeLessThan(0.5);
  });
});

describe('CSS colors', () => {
  it('reads the forms getComputedStyle gives', () => {
    expect(parseCssColor('rgb(255, 0, 51)')).toEqual({r: 1, g: 0, b: 0.2, alpha: 1});
    expect(parseCssColor('rgba(0, 0, 0, 0.25)')).toEqual({r: 0, g: 0, b: 0, alpha: 0.25});
    expect(parseCssColor('color(srgb 0.5 0.25 1 / 0.1)')).toEqual({
      r: 0.5,
      g: 0.25,
      b: 1,
      alpha: 0.1,
    });
    expect(parseCssColor('color(srgb 1 0 0)')).toEqual({r: 1, g: 0, b: 0, alpha: 1});
    expect(parseCssColor('red')).toBeNull();
  });

  it('writes a color the browser reads back the same', () => {
    const probe = document.createElement('i');
    probe.style.color = cssColor({r: 0.5, g: 0.25, b: 1, alpha: 0.5});
    document.body.append(probe);
    expect(parseCssColor(getComputedStyle(probe).color)).toEqual({
      r: 0.5,
      g: 0.25,
      b: 1,
      alpha: 0.5,
    });
    probe.remove();
  });
});
