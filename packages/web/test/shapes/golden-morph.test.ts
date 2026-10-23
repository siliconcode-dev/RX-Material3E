// Compares the Morph port against output from Google's real Kotlin: Morph,
// FeatureMapping, FloatMapping and PolygonMeasure, MaterialShapes and
// Compose's Morph.toPath, compiled by scripts/shapes-golden/generate.sh
// (GoldenMorph.kt). Every case here must match one there.
import {describe, expect, it} from 'vitest';
import {
  circle,
  Corner,
  CornerRounding,
  doMapping,
  featureMapper,
  LengthMeasurer,
  MeasuredPolygon,
  Morph,
  morphToPath,
  pill,
  pillStar,
  rectangle,
  RoundedPolygon,
  rotateZTransformer,
  star,
  type Cubic,
} from '../../src/shapes/graphics/index.js';
import {MATERIAL_SHAPE_NAMES, materialShape} from '../../src/shapes/material-shapes.js';
import golden from './golden/morph.json';
import {expectFloatsEqual} from './golden-utils.js';

interface GoldenCase {
  error?: string;
  features1: number[];
  features2: number[];
  mapping: [number, number][];
  cutPoint: number;
  bounds: number[];
  exactBounds: number[];
  maxBounds: number[];
  match: [number[], number[]][];
  asCubics: Record<string, number[][]>;
  sums: Record<string, [number, number[]]>;
  forEachCubic04: number[][];
  paths: {progress: number; startAngle: number; pivot: number; commands: (string | number)[][]}[];
}

interface GoldenMatrixEntry {
  error?: string;
  n: number;
  mapping: [number, number][];
  first: number[];
  second: number[];
  half: number[];
}

const data = golden as unknown as {
  cases: Record<string, GoldenCase>;
  matrix: Record<string, GoldenMatrixEntry>;
  raster: Record<string, string>;
};

const r = (radius: number, smoothing: number) => new CornerRounding(radius, smoothing);
const f = Math.fround;

const material = (name: string) => materialShape(name as never);

// The same pairs as GoldenMorph.kt, with the same Float literals.
const cases: Record<string, () => [RoundedPolygon, RoundedPolygon, number]> = {};
{
  const tri = () => RoundedPolygon.fromNumVertices(3, {centerX: 0.5, centerY: 0.5});
  const sq = () => RoundedPolygon.fromNumVertices(4, {centerX: 0.5, centerY: 0.5});
  cases['morphtest-triangle-square'] = () => [tri(), sq(), 0];
  cases['morphtest-triangle-triangle'] = () => {
    const t = tri();
    return [t, t, 0];
  };
  cases['square-triangle'] = () => [sq(), tri(), 0];
  cases['rounded-triangles'] = () => [
    RoundedPolygon.fromNumVertices(3, {rounding: new CornerRounding(f(0.2))}),
    RoundedPolygon.fromNumVertices(3),
    0,
  ];
  cases['checkmark-very-sunny'] = () => [
    RoundedPolygon.fromVertices([
      400, -304, 240, -464, 296, -520, 400, -416, 664, -680, 720, -624, 400, -304,
    ]).normalized(),
    star(8, {innerRadius: f(0.65), rounding: new CornerRounding(f(0.15))}).normalized(),
    0.5,
  ];
  cases['square-rotated-triangle'] = () => {
    // GoldenMorph.kt rotates with Float cos/sin.
    const rad = (45 * Math.PI) / 180;
    const c = f(Math.cos(rad));
    const s = f(Math.sin(rad));
    return [
      RoundedPolygon.fromNumVertices(4).transformed((x, y) => [
        f(f(c * x) - f(s * y)),
        f(f(s * x) + f(c * y)),
      ]),
      RoundedPolygon.fromNumVertices(3),
      0,
    ];
  };
  cases['hexagon-star8'] = () => [
    RoundedPolygon.fromNumVertices(6, {rounding: r(f(0.3), f(0.2))}),
    star(8, {innerRadius: f(0.6), rounding: r(f(0.1), f(0.5))}),
    0,
  ];
  cases['circle-star5'] = () => [circle(), star(5), 0];
  cases['rectangle-pill'] = () => [
    rectangle({width: 2, height: 1, rounding: r(f(0.2), 0)}),
    pill({width: 2, height: 1}),
    0,
  ];
  cases['star12-circle8'] = () => [
    star(12, {
      innerRadius: f(0.7),
      rounding: r(f(0.05), 0),
      innerRounding: r(f(0.1), f(0.3)),
    }),
    circle({numVertices: 8}),
    0,
  ];
  cases['concave-square'] = () => [
    RoundedPolygon.fromVertices([0, 0, 2, 0, 2, 2, 1, 1, 0, 2], {rounding: r(f(0.3), f(0.4))}),
    rectangle({width: 2, height: 2, rounding: r(0.5, 0.5), centerX: 1, centerY: 1}),
    0,
  ];
  cases['pillstar-circle'] = () => [
    pillStar({width: 3, height: 1, numVerticesPerRadius: 10, innerRadiusRatio: f(0.6)}),
    circle({numVertices: 6, radius: 1.5}),
    0,
  ];
  cases['hourglass-square'] = () => [
    RoundedPolygon.fromVertices([0, 0, 1, 1, -1, 1, 0, 0, -1, -1, 1, -1]),
    rectangle({width: 2, height: 2}),
    0,
  ];
  // Compose LoadingIndicator: the indeterminate sequence, circular, normalized.
  const indeterminate = [
    'SoftBurst',
    'Cookie9Sided',
    'Pentagon',
    'Pill',
    'Sunny',
    'Cookie4Sided',
    'Oval',
  ];
  indeterminate.forEach((name, i) => {
    const next = indeterminate[(i + 1) % indeterminate.length];
    cases[`loading-${name}-${next}`] = () => [
      material(name).normalized(),
      material(next).normalized(),
      0,
    ];
  });
  // Compose LoadingIndicator: the determinate pair.
  cases['loading-determinate'] = () => [
    material('Circle')
      .transformed(rotateZTransformer(f(360 / 20)))
      .normalized(),
    material('SoftBurst').normalized(),
    0,
  ];
  for (const [a, b] of [
    ['Heart', 'Clover8Leaf'],
    ['Square', 'Circle'],
    ['PixelCircle', 'Burst'],
    ['Arrow', 'Fan'],
    ['Ghostish', 'Bun'],
    ['Triangle', 'PuffyDiamond'],
    ['Slanted', 'Arch'],
  ]) {
    cases[`material-${a}-${b}`] = () => [material(a), material(b), 0.5];
  }
}

// Bit for bit: see golden-utils.ts.
const expectNumbersClose = expectFloatsEqual;

/**
 * The checksums are sums in double precision, printed by Kotlin with 7
 * significant digits.
 */
function expectSumsClose(actual: readonly number[], expected: readonly number[], label: string) {
  expect(actual.length, `${label} length`).toBe(expected.length);
  actual.forEach((value, i) => {
    const tolerance = 1e-6 * Math.max(1, Math.abs(expected[i]));
    expect(
      Math.abs(value - expected[i]),
      `${label}[${i}]: ${value} vs. Kotlin ${expected[i]}`,
    ).toBeLessThanOrEqual(tolerance);
  });
}

/** Weighted sums of each of the 8 coordinates, weights sin(i + 1), as GoldenMorph.kt. */
function checksum(cubics: readonly Cubic[]): number[] {
  const sums = new Array<number>(8).fill(0);
  cubics.forEach((c, i) => {
    const w = Math.sin(i + 1);
    for (let k = 0; k < 8; k++) sums[k] += w * c.points[k];
  });
  return sums;
}

function corners(polygon: RoundedPolygon) {
  return MeasuredPolygon.measurePolygon(new LengthMeasurer(), polygon).features.filter(
    (it) => it.feature instanceof Corner,
  );
}

/** Splits SVG path data into commands with their numbers. */
function parsePath(d: string): (string | number)[][] {
  return [...d.matchAll(/([MLCZ])([^MLCZ]*)/g)].map(([, c, args]) => [
    c,
    ...args
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number),
  ]);
}

describe("golden: Morph vs Google's Kotlin", () => {
  it('covers exactly the generated cases', () => {
    expect(Object.keys(cases).sort()).toEqual(Object.keys(data.cases).sort());
  });

  for (const [id, build] of Object.entries(cases)) {
    it(id, () => {
      const want = data.cases[id];
      expect(want.error, `${id}: Kotlin threw`).toBeUndefined();
      const [p1, p2, pivot] = build();

      const m1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1);
      const m2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2);
      expectNumbersClose(
        m1.features.map((it) => it.progress),
        want.features1,
        `${id} features1`,
      );
      expectNumbersClose(
        m2.features.map((it) => it.progress),
        want.features2,
        `${id} features2`,
      );
      const mapping = doMapping(corners(p1), corners(p2));
      expectNumbersClose(mapping.flat(), want.mapping.flat(), `${id} mapping`);
      expectNumbersClose(
        [featureMapper(m1.features, m2.features).map(0)],
        [want.cutPoint],
        `${id} cut point`,
      );

      const morph = new Morph(p1, p2);
      expectNumbersClose(morph.calculateBounds(), want.bounds, `${id} bounds`);
      expectNumbersClose(
        morph.calculateBounds(undefined, false),
        want.exactBounds,
        `${id} exactBounds`,
      );
      expectNumbersClose(morph.calculateMaxBounds(), want.maxBounds, `${id} maxBounds`);

      expect(morph.morphMatch.length, `${id} matched pairs`).toBe(want.match.length);
      morph.morphMatch.forEach(([a, b], i) => {
        expectNumbersClose(a.points, want.match[i][0], `${id} pair ${i} start`);
        expectNumbersClose(b.points, want.match[i][1], `${id} pair ${i} end`);
      });

      for (const [progress, cubics] of Object.entries(want.asCubics)) {
        const got = morph.asCubics(Number(progress));
        expect(got.length, `${id} asCubics(${progress}) count`).toBe(cubics.length);
        got.forEach((c, i) =>
          expectNumbersClose(c.points, cubics[i], `${id} asCubics(${progress}) ${i}`),
        );
      }
      for (const [progress, [count, sums]] of Object.entries(want.sums)) {
        // Kotlin's progress keys are 32-bit floats (0.33333334 for 1/3).
        const got = morph.asCubics(Number(progress));
        expect(got.length, `${id} asCubics(${progress}) count`).toBe(count);
        expectSumsClose(checksum(got), sums, `${id} asCubics(${progress}) sums`);
      }

      const forEach: number[][] = [];
      morph.forEachCubic(f(0.4), (c) => forEach.push([...c.points]));
      expect(forEach.length).toBe(want.forEachCubic04.length);
      forEach.forEach((p, i) =>
        expectNumbersClose(p, want.forEachCubic04[i], `${id} forEach ${i}`),
      );

      // Compose's Morph.toPath: the same commands with the same numbers.
      for (const path of want.paths) {
        expect(path.pivot, `${id} rotation pivot`).toBe(pivot);
        const d = morphToPath(morph, path.progress, {
          startAngle: path.startAngle,
          rotationPivotX: path.pivot,
          rotationPivotY: path.pivot,
          precision: null,
        });
        const got = parsePath(d);
        const label = `${id} toPath(${path.progress}, startAngle ${path.startAngle})`;
        expect(
          got.map((c) => c[0]),
          label,
        ).toEqual(path.commands.map((c) => c[0]));
        got.forEach((c, i) =>
          expectNumbersClose(
            c.slice(1) as number[],
            path.commands[i].slice(1) as number[],
            `${label} command ${i}`,
          ),
        );
      }
    });
  }
});

describe("golden: every MaterialShapes pair (35 x 35) vs Google's Kotlin", () => {
  it('covers every pair', () => {
    expect(Object.keys(data.matrix)).toHaveLength(35 * 35);
  });

  for (const a of MATERIAL_SHAPE_NAMES) {
    it(`${a} to every shape`, () => {
      for (const b of MATERIAL_SHAPE_NAMES) {
        const id = `${a}>${b}`;
        const want = data.matrix[id];
        expect(want.error, `${id}: Kotlin threw`).toBeUndefined();
        const pa = materialShape(a);
        const pb = materialShape(b);
        const mapping = doMapping(corners(pa), corners(pb));
        expectNumbersClose(mapping.flat(), want.mapping.flat(), `${id} mapping`);
        const morph = new Morph(pa, pb);
        expect(morph.morphMatch.length, `${id} matched pairs`).toBe(want.n);
        expectSumsClose(
          checksum(morph.morphMatch.map((it) => it[0])),
          want.first,
          `${id} start sums`,
        );
        expectSumsClose(
          checksum(morph.morphMatch.map((it) => it[1])),
          want.second,
          `${id} end sums`,
        );
        expectSumsClose(checksum(morph.asCubics(0.5)), want.half, `${id} midway sums`);
      }
    });
  }
});

/** Fills SVG path data into a size x size mask, thresholded like the Kotlin side. */
function rasterize(d: string, size: number): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(size, size);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(d));
  const pixels = ctx.getImageData(0, 0, size, size).data;
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < mask.length; i++) mask[i] = pixels[i * 4 + 3] > 127 ? 1 : 0;
  return mask;
}

function decode(hex: string, size: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < hex.length; i++) {
    const v = parseInt(hex[i], 16);
    for (let b = 0; b < 4; b++) mask[i * 4 + b] = (v >> (3 - b)) & 1;
  }
  return mask;
}

describe('golden: morph drawing vs Compose Morph.toPath filled by Java2D', () => {
  const size = 64;
  for (const [key, hex] of Object.entries(data.raster)) {
    it(key, () => {
      const [id, progress] = key.split('@');
      const [p1, p2] = cases[id]();
      const ours = rasterize(
        morphToPath(new Morph(p1, p2), Number(progress), {startAngle: 0}),
        size,
      );
      const theirs = decode(hex, size);
      // Two rasterizers may disagree only on pixels the edge passes through:
      // every differing pixel must border the other fill state in Kotlin's
      // mask, and there must be few of them.
      let filled = 0;
      let differing = 0;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          filled += theirs[i];
          if (ours[i] === theirs[i]) continue;
          differing++;
          let onEdge = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              // Outside the canvas counts as unfilled.
              const outside = nx < 0 || ny < 0 || nx >= size || ny >= size;
              if ((outside ? 0 : theirs[ny * size + nx]) !== theirs[i]) onEdge = true;
            }
          }
          expect(onEdge, `${key}: pixel ${x},${y} differs away from the edge`).toBe(true);
        }
      }
      expect(filled, `${key}: Kotlin fill is empty`).toBeGreaterThan(500);
      expect(differing, `${key}: differing edge pixels`).toBeLessThanOrEqual(filled * 0.03);
    });
  }
});
