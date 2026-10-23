/*
 * Ported by hand from androidx/graphics/graphics-shapes Utils.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {f32, Point} from './point.js';

export {f32, interpolate} from './point.js';

// Kotlin Float math throughout: see point.ts.

export function distance(x: number, y: number): number {
  return f32(Math.sqrt(distanceSquared(x, y)));
}

export function distanceSquared(x: number, y: number): number {
  return f32(f32(x * x) + f32(y * y));
}

/** Unit vector representing the direction to (x, y) from (0, 0). */
export function directionVector(x: number, y: number): Point {
  const d = distance(x, y);
  if (!(d > 0)) throw new Error('Required distance greater than zero');
  return new Point(x / d, y / d);
}

/** Unit vector at an angle in radians. */
export function directionVectorAngle(angleRadians: number): Point {
  // kotlin.math.cos(Float) works in double and rounds the result.
  const a = f32(angleRadians);
  return new Point(Math.cos(a), Math.sin(a));
}

export function radialToCartesian(
  radius: number,
  angleRadians: number,
  center: Point = Zero,
): Point {
  return directionVectorAngle(angleRadians).times(radius).plus(center);
}

/**
 * Used to decide when two points are the same, within reasonable roundoff
 * error. The distance epsilon is smaller, so roundoff should not be larger
 * than a pixel on any reasonably sized display.
 */
export const DistanceEpsilon = f32(1e-4);
export const AngleEpsilon = f32(1e-6);

/**
 * People see e.g. collinearity much more loosely than it is mathematically,
 * especially on small displays. Use this for operations that allow higher
 * tolerances.
 */
export const RelaxedDistanceEpsilon = f32(5e-3);

export const Zero = new Point(0, 0);
export const FloatPi = f32(Math.PI);
export const TwoPi = f32(2 * FloatPi);

export function square(x: number): number {
  return f32(x * x);
}

/**
 * Like num % mod, but always positive: positiveModulo(4, 3) = 1 and
 * positiveModulo(-4, 3) = 2.
 */
export function positiveModulo(num: number, mod: number): number {
  return f32(f32(f32(num % mod) + mod) % mod);
}

/** Whether C is on the line through A and B. */
export function collinearIsh(
  aX: number,
  aY: number,
  bX: number,
  bY: number,
  cX: number,
  cY: number,
  tolerance: number = DistanceEpsilon,
): boolean {
  // The dot product of a perpendicular angle is 0. Rotating one of the vectors
  // saves converting the dot product to degrees afterwards.
  const ab = new Point(bX - aX, bY - aY).rotate90();
  const ac = new Point(cX - aX, cY - aY);
  const dotProduct = Math.abs(ab.dotProduct(ac));
  const relativeTolerance = f32(f32(tolerance * ab.getDistance()) * ac.getDistance());
  return dotProduct < tolerance || dotProduct < relativeTolerance;
}

/**
 * Approximates whether the corner at `current` is convex, from the
 * previous->current and current->next vectors.
 */
export function convex(previous: Point, current: Point, next: Point): boolean {
  // Upstream note (b/369320447): fast, but not a reliable calculation.
  //
  // This is a sign test, and for (nearly) collinear vertices the sign comes
  // down to rounding error, which is why the Float math must match Kotlin's.
  return current.minus(previous).clockwise(next.minus(current));
}

/**
 * Ternary search in [v0..v1] for the parameter that minimizes `f`. Stops when
 * the search space is smaller than `tolerance`.
 */
export function findMinimum(
  v0: number,
  v1: number,
  tolerance: number,
  f: (value: number) => number,
): number {
  let a = v0;
  let b = v1;
  while (f32(b - a) > tolerance) {
    const c1 = f32(f32(f32(2 * a) + b) / 3);
    const c2 = f32(f32(f32(2 * b) + a) / 3);
    if (f(c1) < f(c2)) {
      b = c2;
    } else {
      a = c1;
    }
  }
  return f32(f32(a + b) / 2);
}
