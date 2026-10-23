/*
 * Ported by hand from androidx/compose/material3 MaterialShapes.kt.
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * The 35 Material 3 Expressive shapes, each normalized to the 0..1 square.
 */

import {CornerRounding} from './graphics/corner-rounding.js';
import type {PointTransformer} from './graphics/point.js';
import {RoundedPolygon} from './graphics/rounded-polygon.js';
import {circle as polygonCircle, rectangle, star} from './graphics/shapes.js';

// Compose Matrix().apply { rotateZ(degrees) } applied with Matrix.map:
// x' = c*x - s*y, y' = s*x + c*y, with c and s computed in double precision.
function rotateZ(degrees: number): PointTransformer {
  const r = degrees * (Math.PI / 180);
  const s = Math.sin(r);
  const c = Math.cos(r);
  return (x, y) => [c * x - s * y, s * x + c * y];
}

// Compose Matrix().apply { scale(x, y) }.
function scale(sx: number, sy: number): PointTransformer {
  return (x, y) => [x * sx, y * sy];
}

// Cached roundings, as upstream.
const cornerRound15 = new CornerRounding(Math.fround(0.15));
const cornerRound20 = new CornerRounding(Math.fround(0.2));
const cornerRound30 = new CornerRounding(Math.fround(0.3));
const cornerRound50 = new CornerRounding(Math.fround(0.5));
const cornerRound100 = new CornerRounding(Math.fround(1));

const rotateNeg45 = rotateZ(-45);
const rotateNeg90 = rotateZ(-90);
const rotateNeg135 = rotateZ(-135);

// The shape data below is laid out with Kotlin Floats (32-bit) and
// kotlin.math functions that round their results to Float. The helpers here
// round every step the same way (Math.fround), so the vertices are the same
// 32-bit values Android computes. That matters for vertices that sit exactly
// on a straight line, such as in the pixel shapes: whether such a corner
// counts as convex depends on the last bit, and Morph pairs corners by it.
const f = Math.fround;
const PIf = f(Math.PI);

interface Offset {
  x: number;
  y: number;
}

const offset = (x: number, y: number): Offset => ({x: f(x), y: f(y)});
const minus = (a: Offset, b: Offset): Offset => offset(a.x - b.x, a.y - b.y);

interface PointNRound {
  o: Offset;
  r: CornerRounding;
}

/** A vertex and its rounding, from Kotlin Float literals. */
const pnr = (x: number, y: number, r: CornerRounding = CornerRounding.Unrounded): PointNRound => ({
  o: offset(x, y),
  r,
});

/** CornerRounding from Kotlin Float literals. */
const cr = (radius: number, smoothing = 0) => new CornerRounding(f(radius), f(smoothing));

// Float.toRadians(): this / 360f * 2 * PI.toFloat()
const toRadians = (degrees: number) => f(f(f(f(degrees) / 360) * 2) * PIf);

// Offset.angleDegrees(): atan2(y, x) * 180f / PI.toFloat()
const angleDegrees = (o: Offset) => f(f(f(Math.atan2(o.y, o.x)) * 180) / PIf);

// Compose Offset.getDistance(): sqrt(x * x + y * y)
const getDistance = (o: Offset) => f(Math.sqrt(f(f(o.x * o.x) + f(o.y * o.y))));

// Offset.rotateDegrees(angle, center)
function rotateDegrees(o: Offset, angle: number, center: Offset = offset(0, 0)): Offset {
  const a = toRadians(angle);
  const off = minus(o, center);
  const cos = f(Math.cos(a));
  const sin = f(Math.sin(a));
  return offset(
    f(f(off.x * cos) - f(off.y * sin)) + center.x,
    f(f(off.x * sin) + f(off.y * cos)) + center.y,
  );
}

/**
 * Repeats `points` `reps` times around `center`. With mirroring, every other
 * section is a mirror image, and its first point (shared with the previous
 * section) is skipped.
 */
function doRepeat(
  points: readonly PointNRound[],
  reps: number,
  center: Offset,
  mirroring: boolean,
): PointNRound[] {
  if (mirroring) {
    const result: PointNRound[] = [];
    const angles = points.map((p) => angleDegrees(minus(p.o, center)));
    const distances = points.map((p) => getDistance(minus(p.o, center)));
    const actualReps = reps * 2;
    const sectionAngle = f(360 / actualReps);
    for (let it = 0; it < actualReps; it++) {
      for (let index = 0; index < points.length; index++) {
        const i = it % 2 === 0 ? index : points.length - 1 - index;
        if (i > 0 || it % 2 === 0) {
          // sectionAngle * it + if (even) angles[i] else sectionAngle - angles[i] + 2 * angles[0]
          const offsetAngle =
            it % 2 === 0 ? angles[i] : f(f(sectionAngle - angles[i]) + f(2 * angles[0]));
          const a = toRadians(f(f(sectionAngle * it) + offsetAngle));
          // Offset(cos(a), sin(a)) * distances[i] + center
          const finalPoint = offset(
            f(f(Math.cos(a)) * distances[i]) + center.x,
            f(f(Math.sin(a)) * distances[i]) + center.y,
          );
          result.push({o: finalPoint, r: points[i].r});
        }
      }
    }
    return result;
  }
  const np = points.length;
  return Array.from({length: np * reps}, (_, it) => ({
    // (it / np) * 360f / reps, with Kotlin's integer division for it / np.
    o: rotateDegrees(points[it % np].o, f(f(Math.trunc(it / np) * 360) / reps), center),
    r: points[it % np].r,
  }));
}

function customPolygon(
  points: readonly PointNRound[],
  reps: number,
  center: Offset = offset(0.5, 0.5),
  mirroring = false,
): RoundedPolygon {
  const actualPoints = doRepeat(points, reps, center, mirroring);
  return RoundedPolygon.fromVertices(
    actualPoints.flatMap((p) => [p.o.x, p.o.y]),
    {
      perVertexRounding: actualPoints.map((p) => p.r),
      centerX: center.x,
      centerY: center.y,
    },
  );
}

// The un-normalized shape builders, in upstream order.
const builders = {
  Circle: () => polygonCircle({numVertices: 10}),
  Square: () => rectangle({width: 1, height: 1, rounding: cornerRound30}),
  Slanted: () =>
    customPolygon([pnr(0.926, 0.97, cr(0.189, 0.811)), pnr(-0.021, 0.967, cr(0.187, 0.057))], 2),
  Arch: () =>
    RoundedPolygon.fromNumVertices(4, {
      perVertexRounding: [cornerRound100, cornerRound100, cornerRound20, cornerRound20],
    }).transformed(rotateNeg135),
  Fan: () =>
    customPolygon(
      [
        pnr(1.004, 1.0, cr(0.148, 0.417)),
        pnr(0.0, 1.0, cr(0.151)),
        pnr(0.0, -0.003, cr(0.148)),
        pnr(0.978, 0.02, cr(0.803)),
      ],
      1,
    ),
  Arrow: () =>
    customPolygon(
      [
        pnr(0.5, 0.892, cr(0.313)),
        pnr(-0.216, 1.05, cr(0.207)),
        pnr(0.499, -0.16, cr(0.215, 1.0)),
        pnr(1.225, 1.06, cr(0.211)),
      ],
      1,
    ),
  SemiCircle: () =>
    rectangle({
      width: 1.6,
      height: 1,
      perVertexRounding: [cornerRound20, cornerRound20, cornerRound100, cornerRound100],
    }),
  Oval: () => polygonCircle().transformed(scale(1, 0.64)).transformed(rotateNeg45),
  Pill: () =>
    customPolygon(
      [pnr(0.961, 0.039, cr(0.426)), pnr(1.001, 0.428), pnr(1.0, 0.609, cr(1.0))],
      2,
      undefined,
      true,
    ),
  Triangle: () =>
    RoundedPolygon.fromNumVertices(3, {rounding: cornerRound20}).transformed(rotateNeg90),
  Diamond: () => customPolygon([pnr(0.5, 1.096, cr(0.151, 0.524)), pnr(0.04, 0.5, cr(0.159))], 2),
  ClamShell: () =>
    customPolygon(
      [pnr(0.171, 0.841, cr(0.159)), pnr(-0.02, 0.5, cr(0.14)), pnr(0.17, 0.159, cr(0.159))],
      2,
    ),
  Pentagon: () =>
    customPolygon(
      [pnr(0.5, -0.009, cr(0.172)), pnr(1.03, 0.365, cr(0.164)), pnr(0.828, 0.97, cr(0.169))],
      1,
      undefined,
      true,
    ),
  Gem: () =>
    customPolygon(
      [
        pnr(0.499, 1.023, cr(0.241, 0.778)),
        pnr(-0.005, 0.792, cr(0.208)),
        pnr(0.073, 0.258, cr(0.228)),
        pnr(0.433, -0.0, cr(0.491)),
      ],
      1,
      undefined,
      true,
    ),
  Sunny: () => star(8, {innerRadius: 0.8, rounding: cornerRound15}),
  VerySunny: () => customPolygon([pnr(0.5, 1.08, cr(0.085)), pnr(0.358, 0.843, cr(0.085))], 8),
  Cookie4Sided: () => customPolygon([pnr(1.237, 1.236, cr(0.258)), pnr(0.5, 0.918, cr(0.233))], 4),
  Cookie6Sided: () => customPolygon([pnr(0.723, 0.884, cr(0.394)), pnr(0.5, 1.099, cr(0.398))], 6),
  Cookie7Sided: () =>
    star(7, {innerRadius: 0.75, rounding: cornerRound50}).transformed(rotateNeg90),
  Cookie9Sided: () => star(9, {innerRadius: 0.8, rounding: cornerRound50}).transformed(rotateNeg90),
  Cookie12Sided: () =>
    star(12, {innerRadius: 0.8, rounding: cornerRound50}).transformed(rotateNeg90),
  Ghostish: () =>
    customPolygon(
      [
        pnr(0.5, 0, cr(1.0)),
        pnr(1, 0, cr(1.0)),
        pnr(1, 1.14, cr(0.254, 0.106)),
        pnr(0.575, 0.906, cr(0.253)),
      ],
      1,
      undefined,
      true,
    ),
  Clover4Leaf: () =>
    customPolygon([pnr(0.5, 0.074), pnr(0.725, -0.099, cr(0.476))], 4, undefined, true),
  Clover8Leaf: () => customPolygon([pnr(0.5, 0.036), pnr(0.758, -0.101, cr(0.209))], 8),
  Burst: () => customPolygon([pnr(0.5, -0.006, cr(0.006)), pnr(0.592, 0.158, cr(0.006))], 12),
  SoftBurst: () => customPolygon([pnr(0.193, 0.277, cr(0.053)), pnr(0.176, 0.055, cr(0.053))], 10),
  Boom: () => customPolygon([pnr(0.457, 0.296, cr(0.007)), pnr(0.5, -0.051, cr(0.007))], 15),
  SoftBoom: () =>
    customPolygon(
      [
        pnr(0.733, 0.454),
        pnr(0.839, 0.437, cr(0.532)),
        pnr(0.949, 0.449, cr(0.439, 1.0)),
        pnr(0.998, 0.478, cr(0.174)),
      ],
      16,
      undefined,
      true,
    ),
  Flower: () =>
    customPolygon(
      [pnr(0.37, 0.187), pnr(0.416, 0.049, cr(0.381)), pnr(0.479, 0.001, cr(0.095))],
      8,
      undefined,
      true,
    ),
  Puffy: () =>
    customPolygon(
      [
        pnr(0.5, 0.053),
        pnr(0.545, -0.04, cr(0.405)),
        pnr(0.67, -0.035, cr(0.426)),
        pnr(0.717, 0.066, cr(0.574)),
        pnr(0.722, 0.128),
        pnr(0.777, 0.002, cr(0.36)),
        pnr(0.914, 0.149, cr(0.66)),
        pnr(0.926, 0.289, cr(0.66)),
        pnr(0.881, 0.346),
        pnr(0.94, 0.344, cr(0.126)),
        pnr(1.003, 0.437, cr(0.255)),
      ],
      2,
      undefined,
      true,
    ).transformed(scale(1, 0.742)),
  PuffyDiamond: () =>
    customPolygon(
      [pnr(0.87, 0.13, cr(0.146)), pnr(0.818, 0.357), pnr(1.0, 0.332, cr(0.853))],
      4,
      undefined,
      true,
    ),
  PixelCircle: () =>
    customPolygon(
      [
        pnr(0.5, 0.0),
        pnr(0.704, 0.0),
        pnr(0.704, 0.065),
        pnr(0.843, 0.065),
        pnr(0.843, 0.148),
        pnr(0.926, 0.148),
        pnr(0.926, 0.296),
        pnr(1.0, 0.296),
      ],
      2,
      undefined,
      true,
    ),
  PixelTriangle: () =>
    customPolygon(
      [
        pnr(0.11, 0.5),
        pnr(0.113, 0.0),
        pnr(0.287, 0.0),
        pnr(0.287, 0.087),
        pnr(0.421, 0.087),
        pnr(0.421, 0.17),
        pnr(0.56, 0.17),
        pnr(0.56, 0.265),
        pnr(0.674, 0.265),
        pnr(0.675, 0.344),
        pnr(0.789, 0.344),
        pnr(0.789, 0.439),
        pnr(0.888, 0.439),
      ],
      1,
      undefined,
      true,
    ),
  Bun: () =>
    customPolygon(
      [pnr(0.796, 0.5), pnr(0.853, 0.518, cr(1)), pnr(0.992, 0.631, cr(1)), pnr(0.968, 1.0, cr(1))],
      2,
      undefined,
      true,
    ),
  Heart: () =>
    customPolygon(
      [
        pnr(0.5, 0.268, cr(0.016)),
        pnr(0.792, -0.066, cr(0.958)),
        pnr(1.064, 0.276, cr(1.0)),
        pnr(0.501, 0.946, cr(0.129)),
      ],
      1,
      undefined,
      true,
    ),
} satisfies Record<string, () => RoundedPolygon>;

export type MaterialShapeName = keyof typeof builders;

/** The Material shape names, in Compose's order. */
export const MATERIAL_SHAPE_NAMES = Object.keys(builders) as MaterialShapeName[];

const cache = new Map<MaterialShapeName, RoundedPolygon>();

/**
 * A Material 3 Expressive shape, normalized to the 0..1 square. Built on
 * first use and cached, as Compose does.
 */
export function materialShape(name: MaterialShapeName): RoundedPolygon {
  let polygon = cache.get(name);
  if (!polygon) {
    const build = builders[name];
    if (!build) throw new Error(`Unknown Material shape: ${name}`);
    polygon = build().normalized();
    cache.set(name, polygon);
  }
  return polygon;
}

/** Compose-style access: `MaterialShapes.Cookie9Sided`. */
export const MaterialShapes: Readonly<Record<MaterialShapeName, RoundedPolygon>> = Object.freeze(
  Object.defineProperties(
    {},
    Object.fromEntries(
      MATERIAL_SHAPE_NAMES.map((name) => [
        name,
        {get: () => materialShape(name), enumerable: true},
      ]),
    ),
  ) as Record<MaterialShapeName, RoundedPolygon>,
);

/** `cookie-9-sided` → `Cookie9Sided`; also accepts the Compose name itself. */
export function materialShapeName(name: string): MaterialShapeName | undefined {
  if (name in builders) return name as MaterialShapeName;
  const pascal = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return pascal in builders ? (pascal as MaterialShapeName) : undefined;
}

/** `Cookie9Sided` → `cookie-9-sided`. */
export function kebabShapeName(name: MaterialShapeName): string {
  return name
    .replace(/([a-z])([A-Z0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}
