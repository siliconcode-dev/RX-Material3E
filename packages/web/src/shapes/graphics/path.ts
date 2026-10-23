/*
 * Ported by hand from androidx/compose/material3 internal/ShapeUtil.kt
 * (RoundedPolygon.toPath, pathFromCubics, transformed(Matrix)).
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose builds an Android Path; on the web the result is SVG path data,
 * usable in <path d>, clip-path: path() and Path2D.
 */

import type {Cubic} from './cubic.js';
import type {PointTransformer} from './point.js';
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
  /** Decimal places in the output. Defaults to 4. */
  precision?: number;
}

/** SVG path data for a polygon, as Compose's `RoundedPolygon.toPath`. */
export function toPath(polygon: RoundedPolygon, options: PathOptions = {}): string {
  return pathFromCubics(polygon.cubics, polygon.centerX, polygon.centerY, options);
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
    const angleToFirstCubic =
      (Math.atan2(cubics[0].anchor0Y - rotationPivotY, cubics[0].anchor0X - rotationPivotX) * 180) /
      Math.PI;
    // Rotate the path so it starts from the given angle.
    const radians = ((-angleToFirstCubic + startAngle) * Math.PI) / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    rotate = (x, y) => [c * x - s * y, s * x + c * y];
  }

  const factor = 10 ** precision;
  const n = (v: number) => {
    const r = Math.round(v * factor) / factor;
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
  return (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

/** Compose's `RoundedPolygon.transformed(matrix)`. */
export function transformedByMatrix(
  polygon: RoundedPolygon,
  m: {a: number; b: number; c: number; d: number; e: number; f: number},
): RoundedPolygon {
  return polygon.transformed(matrixTransformer(m));
}
