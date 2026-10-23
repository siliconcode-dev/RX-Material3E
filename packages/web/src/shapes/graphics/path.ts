/*
 * Ported by hand from androidx/compose/material3 internal/ShapeUtil.kt
 * (RoundedPolygon.toPath, Morph.toPath, pathFromCubics, transformed(Matrix)).
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose builds an Android Path; on the web the result is SVG path data,
 * usable in <path d>, clip-path: path() and Path2D.
 */

import type {Cubic} from './cubic.js';
import type {Morph} from './morph.js';
import {f32, type PointTransformer} from './point.js';
import type {RoundedPolygon} from './rounded-polygon.js';

export interface PathOptions {
  /**
   * Rotate the path so it starts at this angle, in degrees (0 is 3 o'clock,
   * 270 is 12 o'clock in y-down coordinates). Defaults to 270. 0 leaves the
   * path as it is.
   */
  startAngle?: number;
  /** Draw the outline twice before closing (used by star progress indicators). */
  repeatPath?: boolean;
  /** Close the path. Defaults to true. */
  closePath?: boolean;
  /** Decimal places in the output. Defaults to 4; null writes every digit. */
  precision?: number | null;
}

/** SVG path data for a polygon, as Compose's `RoundedPolygon.toPath`. */
export function toPath(polygon: RoundedPolygon, options: PathOptions = {}): string {
  return pathFromCubics(polygon.cubics, polygon.centerX, polygon.centerY, options);
}

export interface MorphPathOptions extends PathOptions {
  /**
   * Pivot for measuring the start angle. Defaults to (0, 0), which fits
   * morphs between polygons centered at the origin; use (0.5, 0.5) for
   * normalized ones.
   */
  rotationPivotX?: number;
  rotationPivotY?: number;
}

/**
 * SVG path data for a morph at `progress`, as Compose's internal
 * `Morph.toPath` (start angle 270 by default, like `toPath`). Compose's public
 * `Morph.toPath(progress)` uses start angle 0.
 */
export function morphToPath(
  morph: Morph,
  progress: number,
  options: MorphPathOptions = {},
): string {
  const {rotationPivotX = 0, rotationPivotY = 0, ...rest} = options;
  return pathFromCubics(morph.asCubics(progress), rotationPivotX, rotationPivotY, rest);
}

/**
 * SVG path data for a list of closed-loop cubics.
 *
 * As in Compose, the start angle is measured from the pivot, but the
 * rotation itself turns around (0, 0).
 */
export function pathFromCubics(
  cubics: readonly Cubic[],
  rotationPivotX = 0,
  rotationPivotY = 0,
  options: PathOptions = {},
): string {
  const {startAngle = 270, repeatPath = false, closePath = true, precision = 4} = options;
  if (cubics.length === 0) return '';

  let rotate: PointTransformer = (x, y) => [x, y];
  if (startAngle !== 0) {
    // Float math as in Compose: atan2 on Floats, then radiansToDegrees in
    // double, rounded to Float.
    const radians = f32(
      Math.atan2(
        f32(cubics[0].anchor0Y - f32(rotationPivotY)),
        f32(cubics[0].anchor0X - f32(rotationPivotX)),
      ),
    );
    const angleToFirstCubic = f32((radians * 180.0) / Math.PI);
    // Rotate the path so it starts from the given angle.
    rotate = rotateZTransformer(f32(-angleToFirstCubic + startAngle));
  }

  const factor = precision === null ? 0 : 10 ** precision;
  const n = (v: number) => {
    const r = precision === null ? v : Math.round(v * factor) / factor;
    return Object.is(r, -0) ? '0' : String(r);
  };
  const pt = (x: number, y: number) => {
    const [px, py] = rotate(x, y);
    return `${n(px)} ${n(py)}`;
  };
  const curve = (c: Cubic) =>
    `C${pt(c.control0X, c.control0Y)} ${pt(c.control1X, c.control1Y)} ${pt(c.anchor1X, c.anchor1Y)}`;

  const parts = [`M${pt(cubics[0].anchor0X, cubics[0].anchor0Y)}`, ...cubics.map(curve)];
  if (repeatPath) {
    parts.push(`L${pt(cubics[0].anchor0X, cubics[0].anchor0Y)}`, ...cubics.map(curve));
  }
  if (closePath) parts.push('Z');
  return parts.join('');
}

/**
 * A point transformer for a 2D affine matrix in DOMMatrix order (a, b, c, d,
 * e, f): x' = a*x + c*y + e, y' = b*x + d*y + f. Accepts a DOMMatrix too.
 */
export function matrixTransformer(m: {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}): PointTransformer {
  // Compose's Matrix.map, in Float math.
  const [a, b, c, d, e, f] = [m.a, m.b, m.c, m.d, m.e, m.f].map(f32);
  return (x, y) => [f32(f32(f32(a * x) + f32(c * y)) + e), f32(f32(f32(b * x) + f32(d * y)) + f)];
}

/**
 * Compose's `Matrix().apply { rotateZ(degrees) }` as a point transformer:
 * x' = c*x - s*y, y' = s*x + c*y, with c and s computed in double precision
 * and rounded to Float, as Compose does.
 */
export function rotateZTransformer(degrees: number): PointTransformer {
  const r = f32(degrees) * (Math.PI / 180);
  const s = f32(Math.sin(r));
  const c = f32(Math.cos(r));
  return (x, y) => [f32(f32(c * x) + f32(-s * y)), f32(f32(s * x) + f32(c * y))];
}

/** Compose's `Matrix().apply { scale(x, y) }` as a point transformer. */
export function scaleTransformer(sx: number, sy: number): PointTransformer {
  const fx = f32(sx);
  const fy = f32(sy);
  return (x, y) => [f32(fx * x), f32(fy * y)];
}

/** Compose's `RoundedPolygon.transformed(matrix)`. */
export function transformedByMatrix(
  polygon: RoundedPolygon,
  m: {a: number; b: number; c: number; d: number; e: number; f: number},
): RoundedPolygon {
  return polygon.transformed(matrixTransformer(m));
}
