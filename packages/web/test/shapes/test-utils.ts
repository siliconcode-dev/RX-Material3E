/*
 * Ported from androidx/graphics/graphics-shapes commonTest TestUtils.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {expect} from 'vitest';
import {
  Corner,
  type Cubic,
  type Feature,
  Point,
  type PointTransformer,
  type RoundedPolygon,
} from '../../src/shapes/graphics/index.js';

const Epsilon = 1e-4;

/** kotlin.test assertEquals(expected, actual, absoluteTolerance). */
function assertClose(expected: number, actual: number, tolerance: number, message?: string) {
  expect(Math.abs(expected - actual), message ?? `${expected} vs. ${actual}`).toBeLessThanOrEqual(
    tolerance,
  );
}

export function assertPointsEqualish(expected: Point, actual: Point) {
  const msg = `${expected} vs. ${actual}`;
  assertClose(expected.x, actual.x, Epsilon, msg);
  assertClose(expected.y, actual.y, Epsilon, msg);
}

/** Exact point equality (Kotlin data-class equals). */
export function assertPointsEqual(expected: Point, actual: Point) {
  expect([actual.x, actual.y]).toEqual([expected.x, expected.y]);
}

export function equalish(f0: number, f1: number, epsilon: number): boolean {
  return Math.abs(f0 - f1) < epsilon;
}

export function pointsEqualish(p0: Point, p1: Point): boolean {
  return equalish(p0.x, p1.x, Epsilon) && equalish(p0.y, p1.y, Epsilon);
}

export function cubicsEqualish(c0: Cubic, c1: Cubic): boolean {
  return (
    pointsEqualish(new Point(c0.anchor0X, c0.anchor0Y), new Point(c1.anchor0X, c1.anchor0Y)) &&
    pointsEqualish(new Point(c0.anchor1X, c0.anchor1Y), new Point(c1.anchor1X, c1.anchor1Y)) &&
    pointsEqualish(new Point(c0.control0X, c0.control0Y), new Point(c1.control0X, c1.control0Y)) &&
    pointsEqualish(new Point(c0.control1X, c0.control1Y), new Point(c1.control1X, c1.control1Y))
  );
}

export function assertCubicsEqualish(expected: Cubic, actual: Cubic) {
  assertPointsEqualish(
    new Point(expected.anchor0X, expected.anchor0Y),
    new Point(actual.anchor0X, actual.anchor0Y),
  );
  assertPointsEqualish(
    new Point(expected.control0X, expected.control0Y),
    new Point(actual.control0X, actual.control0Y),
  );
  assertPointsEqualish(
    new Point(expected.control1X, expected.control1Y),
    new Point(actual.control1X, actual.control1Y),
  );
  assertPointsEqualish(
    new Point(expected.anchor1X, expected.anchor1Y),
    new Point(actual.anchor1X, actual.anchor1Y),
  );
}

export function assertCubicListsEqualish(expected: readonly Cubic[], actual: readonly Cubic[]) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) assertCubicsEqualish(expected[i], actual[i]);
}

export function assertFeaturesEqualish(expected: Feature, actual: Feature) {
  assertCubicListsEqualish(expected.cubics, actual.cubics);
  expect(actual.constructor).toBe(expected.constructor);
  if (expected instanceof Corner && actual instanceof Corner) {
    expect(actual.convex).toBe(expected.convex);
  }
}

export function assertPolygonsEqualish(expected: RoundedPolygon, actual: RoundedPolygon) {
  assertCubicListsEqualish(expected.cubics, actual.cubics);
  expect(actual.features.length).toBe(expected.features.length);
  for (let i = 0; i < expected.features.length; i++) {
    assertFeaturesEqualish(expected.features[i], actual.features[i]);
  }
}

export function assertPointGreaterish(expected: Point, actual: Point) {
  expect(actual.x >= expected.x - Epsilon).toBe(true);
  expect(actual.y >= expected.y - Epsilon).toBe(true);
}

export function assertPointLessish(expected: Point, actual: Point) {
  expect(actual.x <= expected.x + Epsilon).toBe(true);
  expect(actual.y <= expected.y + Epsilon).toBe(true);
}

export function assertEqualish(expected: number, actual: number, message?: string) {
  assertClose(expected, actual, Epsilon, message);
}

export function assertInBounds(shape: readonly Cubic[], minPoint: Point, maxPoint: Point) {
  for (const cubic of shape) {
    for (const [x, y] of [
      [cubic.anchor0X, cubic.anchor0Y],
      [cubic.control0X, cubic.control0Y],
      [cubic.control1X, cubic.control1Y],
      [cubic.anchor1X, cubic.anchor1Y],
    ]) {
      assertPointGreaterish(minPoint, new Point(x, y));
      assertPointLessish(maxPoint, new Point(x, y));
    }
  }
}

export const identityTransform = (): PointTransformer => (x, y) => [x, y];
export const scaleTransform =
  (sx: number, sy: number): PointTransformer =>
  (x, y) => [x * sx, y * sy];
export const translateTransform =
  (dx: number, dy: number): PointTransformer =>
  (x, y) => [x + dx, y + dy];
