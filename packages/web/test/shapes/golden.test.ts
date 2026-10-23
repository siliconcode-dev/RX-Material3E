// Compares the TypeScript port against output from Google's real Kotlin
// graphics-shapes code (scripts/shapes-golden/Golden.kt). Every case here
// must match one there, bit for bit: the port does Kotlin's 32-bit Float
// math step for step.
import {describe, expect, it} from 'vitest';
import {
  circle,
  Corner,
  CornerRounding,
  pill,
  pillStar,
  rectangle,
  RoundedPolygon,
  star,
} from '../../src/shapes/graphics/index.js';
import golden from './golden/graphics-shapes.json';
import {expectFloatsEqual} from './golden-utils.js';

interface GoldenPolygon {
  center: [number, number];
  bounds: number[];
  exactBounds: number[];
  maxBounds: number[];
  cubics: number[][];
  features: {type: 'corner' | 'edge'; convex: boolean | null; cubics: number[][]}[];
}

const r = (radius: number, smoothing: number) => new CornerRounding(radius, smoothing);

const cases: Record<string, () => RoundedPolygon> = {
  poly3: () => RoundedPolygon.fromNumVertices(3),
  poly4: () => RoundedPolygon.fromNumVertices(4),
  poly5: () => RoundedPolygon.fromNumVertices(5),
  poly8: () => RoundedPolygon.fromNumVertices(8),
  'poly6-rounded': () => RoundedPolygon.fromNumVertices(6, {rounding: r(0.2, 0)}),
  'poly4-smoothed': () => RoundedPolygon.fromNumVertices(4, {rounding: r(0.3, 0.5)}),
  'poly5-offset-full-smoothing': () =>
    RoundedPolygon.fromNumVertices(5, {radius: 2, centerX: 1, centerY: 2, rounding: r(0.4, 1)}),
  'poly7-per-vertex': () =>
    RoundedPolygon.fromNumVertices(7, {
      perVertexRounding: Array.from({length: 7}, (_, i) => r(0.05 * (i + 1), i / 6)),
    }),
  'vertices-triangle-uneven': () =>
    RoundedPolygon.fromVertices([0, 0, 1, 0, 0.5, 1], {
      perVertexRounding: [r(1, 0), r(1, 1), CornerRounding.Unrounded],
    }),
  'vertices-rect-competing': () =>
    RoundedPolygon.fromVertices([0, 0, 5, 0, 5, 1, 0, 1], {
      perVertexRounding: [
        r(0.4, 0.5),
        CornerRounding.Unrounded,
        CornerRounding.Unrounded,
        r(0.2, 1),
      ],
    }),
  'vertices-concave': () =>
    RoundedPolygon.fromVertices([0, 0, 2, 0, 2, 2, 1, 1, 0, 2], {rounding: r(0.3, 0.4)}),
  'vertices-repeated-point': () => RoundedPolygon.fromVertices([0, 0, 1, 0, 1, 0, 0, 1]),
  // Kotlin's vertices are Float literals; pass the same 32-bit values.
  'vertices-collinear': () =>
    RoundedPolygon.fromVertices([0, 0, 0.5, 0, 1, 0, 1, 1, 0, 1].map(Math.fround), {
      rounding: r(Math.fround(0.1), 0),
    }),
  'vertices-collinear-diagonal': () =>
    RoundedPolygon.fromVertices(
      [0.1, 0.1, 0.4, 0.4, 0.7, 0.7, 0.7, 1.3, 0.1, 1.3].map(Math.fround),
      {
        rounding: r(Math.fround(0.05), Math.fround(0.5)),
      },
    ),
  // The middle three vertices are within rounding error of a straight line.
  'vertices-near-collinear': () =>
    RoundedPolygon.fromVertices(
      [
        0.4700031876564026, 1.1063426733016968, 0.2314673811197281, 0.8148945569992065,
        -0.08738595992326736, 0.42531275749206543, 1.5, -0.5,
      ].map(Math.fround),
    ),
  circle: () => circle(),
  circle3: () => circle({numVertices: 3}),
  'circle12-offset': () => circle({numVertices: 12, radius: 3, centerX: 1, centerY: 2}),
  rectangle: () => rectangle(),
  'rectangle-rounded': () => rectangle({width: 3, height: 1, rounding: r(0.4, 0.6)}),
  'rectangle-per-vertex': () =>
    rectangle({
      width: 2,
      height: 1.5,
      perVertexRounding: [r(0.1, 0), r(0.6, 0.2), r(0, 0), r(0.3, 1)],
      centerX: -1,
      centerY: 0.5,
    }),
  star4: () => star(4),
  'star5-inner': () => star(5, {innerRadius: 0.4, rounding: r(0.1, 0), innerRounding: r(0.3, 0.5)}),
  'star12-smooth': () => star(12, {rounding: r(0.05, 1)}),
  'star8-offset': () =>
    star(8, {radius: 3, innerRadius: 1.2, rounding: r(0.2, 0), centerX: 5, centerY: 5}),
  pill: () => pill(),
  'pill-smooth': () => pill({width: 3, height: 1, smoothing: 0.5}),
  'pill-tall': () => pill({width: 1, height: 3}),
  pillStar: () => pillStar(),
  'pillStar-rounded': () => pillStar({rounding: r(0.5, 0.2)}),
  'pillStar-custom': () =>
    pillStar({
      width: 1,
      height: 2,
      numVerticesPerRadius: 6,
      innerRadiusRatio: 0.7,
      rounding: r(0.1, 0),
      vertexSpacing: 0.2,
      startLocation: 0.3,
    }),
  'normalized-star5': () => star(5, {rounding: r(0.1, 0.3)}).normalized(),
  'normalized-pill': () => pill({width: 3, height: 1}).normalized(),
  'transformed-hexagon': () =>
    // The same Float steps as the Kotlin lambda.
    RoundedPolygon.fromNumVertices(6, {rounding: r(0.25, 0.5)}).transformed((x, y) => [
      Math.fround(Math.fround(Math.fround(x * 2) + Math.fround(y * 0.5)) + 3),
      Math.fround(Math.fround(y * 1.5) - 1),
    ]),
  empty: () => RoundedPolygon.fromNumVertices(6, {radius: 0, rounding: r(0.1, 0)}),
};

const expectNumbersClose = expectFloatsEqual;

describe("golden: TypeScript port vs Google's Kotlin graphics-shapes", () => {
  const data = golden as unknown as Record<string, GoldenPolygon>;

  it('covers exactly the generated cases', () => {
    expect(Object.keys(cases).sort()).toEqual(Object.keys(data).sort());
  });

  for (const [id, build] of Object.entries(cases)) {
    it(id, () => {
      const want = data[id];
      const polygon = build();
      expectNumbersClose([polygon.centerX, polygon.centerY], want.center, `${id} center`);
      expectNumbersClose(polygon.calculateBounds(), want.bounds, `${id} bounds`);
      expectNumbersClose(
        polygon.calculateBounds(undefined, false),
        want.exactBounds,
        `${id} exactBounds`,
      );
      expectNumbersClose(polygon.calculateMaxBounds(), want.maxBounds, `${id} maxBounds`);

      expect(polygon.cubics.length, `${id} cubic count`).toBe(want.cubics.length);
      polygon.cubics.forEach((c, i) =>
        expectNumbersClose(c.points, want.cubics[i], `${id} cubic ${i}`),
      );

      expect(polygon.features.length, `${id} feature count`).toBe(want.features.length);
      polygon.features.forEach((feature, i) => {
        const wantFeature = want.features[i];
        const label = `${id} feature ${i}`;
        expect(feature instanceof Corner ? 'corner' : 'edge', label).toBe(wantFeature.type);
        if (feature instanceof Corner)
          expect(feature.convex, `${label} convex`).toBe(wantFeature.convex);
        expect(feature.cubics.length, `${label} cubic count`).toBe(wantFeature.cubics.length);
        feature.cubics.forEach((c, j) =>
          expectNumbersClose(c.points, wantFeature.cubics[j], `${label} cubic ${j}`),
        );
      });
    });
  }
});
