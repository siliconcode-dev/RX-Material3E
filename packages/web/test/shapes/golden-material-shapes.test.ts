// Compares the 35 ported MaterialShapes against output from Google's real
// MaterialShapes.kt, extracted verbatim and compiled by
// scripts/shapes-golden/generate.sh.
import {describe, expect, it} from 'vitest';
import {Corner} from '../../src/shapes/graphics/index.js';
import {MATERIAL_SHAPE_NAMES, materialShape} from '../../src/shapes/material-shapes.js';
import golden from './golden/material-shapes.json';
import {expectFloatsEqual} from './golden-utils.js';

interface GoldenShape {
  center: [number, number];
  bounds: number[];
  cubics: number[][];
  features: {type: 'corner' | 'edge'; convex: boolean | null; cubics: number}[];
}

// Bit for bit: see golden-utils.ts.
const expectNumbersClose = expectFloatsEqual;

describe("golden: MaterialShapes vs Google's Kotlin", () => {
  const data = golden as unknown as Record<string, GoldenShape>;

  it('has exactly the 35 Compose shapes, in Compose order', () => {
    expect(MATERIAL_SHAPE_NAMES).toEqual(Object.keys(data));
    expect(MATERIAL_SHAPE_NAMES).toHaveLength(35);
  });

  for (const name of MATERIAL_SHAPE_NAMES) {
    it(name, () => {
      const want = data[name];
      const shape = materialShape(name);
      expectNumbersClose([shape.centerX, shape.centerY], want.center, `${name} center`);
      expectNumbersClose(shape.calculateBounds(undefined, false), want.bounds, `${name} bounds`);
      expect(shape.cubics.length, `${name} cubic count`).toBe(want.cubics.length);
      shape.cubics.forEach((c, i) =>
        expectNumbersClose(c.points, want.cubics[i], `${name} cubic ${i}`),
      );
      expect(shape.features.length, `${name} feature count`).toBe(want.features.length);
      shape.features.forEach((f, i) => {
        expect(f instanceof Corner ? 'corner' : 'edge', `${name} feature ${i}`).toBe(
          want.features[i].type,
        );
        if (f instanceof Corner)
          expect(f.convex, `${name} feature ${i} convex`).toBe(want.features[i].convex);
        expect(f.cubics.length, `${name} feature ${i} cubics`).toBe(want.features[i].cubics);
      });
    });
  }
});
