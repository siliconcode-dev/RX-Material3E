/*
 * Ported from androidx/graphics/graphics-shapes commonTest PolygonTest.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {describe, expect, it} from 'vitest';
import {
  CornerRounding,
  type Cubic,
  Point,
  RoundedPolygon,
} from '../../src/shapes/graphics/index.js';
import {
  assertCubicListsEqualish,
  assertCubicsEqualish,
  assertEqualish,
  assertInBounds,
  assertPointsEqualish,
  identityTransform,
  scaleTransform,
  translateTransform,
} from './test-utils.js';

describe('RoundedPolygon (PolygonTest.kt)', () => {
  const square = RoundedPolygon.fromNumVertices(4);
  const roundedSquare = RoundedPolygon.fromNumVertices(4, {rounding: new CornerRounding(0.2)});
  const pentagon = RoundedPolygon.fromNumVertices(5);

  it('constructionTest', () => {
    // We can't be specific about how the square is built, but every point
    // should be inside the unit square.
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(square.cubics, min, max);

    const doubleSquare = RoundedPolygon.fromNumVertices(4, {radius: 2});
    min = min.times(2);
    max = max.times(2);
    assertInBounds(doubleSquare.cubics, min, max);

    const offsetSquare = RoundedPolygon.fromNumVertices(4, {centerX: 1, centerY: 2});
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(offsetSquare.cubics, min, max);

    const squareCopy = RoundedPolygon.copy(square);
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(squareCopy.cubics, min, max);

    const p0 = new Point(1, 0);
    const p1 = new Point(0, 1);
    const p2 = new Point(-1, 0);
    const p3 = new Point(0, -1);
    const manualSquare = RoundedPolygon.fromVertices([
      p0.x,
      p0.y,
      p1.x,
      p1.y,
      p2.x,
      p2.y,
      p3.x,
      p3.y,
    ]);
    assertInBounds(manualSquare.cubics, min, max);

    const offset = new Point(1, 2);
    const shifted = [p0, p1, p2, p3].map((p) => p.plus(offset));
    const manualSquareOffset = RoundedPolygon.fromVertices(
      shifted.flatMap((p) => [p.x, p.y]),
      {centerX: offset.x, centerY: offset.y},
    );
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(manualSquareOffset.cubics, min, max);
  });

  it('boundsTest', () => {
    let bounds = square.calculateBounds();
    assertEqualish(-1, bounds[0]); // Left
    assertEqualish(-1, bounds[1]); // Top
    assertEqualish(1, bounds[2]); // Right
    assertEqualish(1, bounds[3]); // Bottom

    let betterBounds = square.calculateBounds(undefined, false);
    assertEqualish(-1, betterBounds[0]);
    assertEqualish(-1, betterBounds[1]);
    assertEqualish(1, betterBounds[2]);
    assertEqualish(1, betterBounds[3]);

    // The rounded square's approximate bounds are larger because of its control points.
    bounds = roundedSquare.calculateBounds();
    betterBounds = roundedSquare.calculateBounds(undefined, false);
    expect(
      betterBounds[2] - betterBounds[0] < bounds[2] - bounds[0],
      `bounds ${bounds}, betterBounds = ${betterBounds}`,
    ).toBe(true);

    bounds = pentagon.calculateBounds();
    const maxBounds = pentagon.calculateMaxBounds();
    expect(maxBounds[2] - maxBounds[0] > bounds[2] - bounds[0]).toBe(true);
  });

  it('centerTest', () => {
    assertPointsEqualish(new Point(0, 0), new Point(square.centerX, square.centerY));
  });

  it('transformTest', () => {
    // The identity transform changes nothing.
    const squareCopy = square.transformed(identityTransform());
    const n = square.cubics.length;
    expect(squareCopy.cubics.length).toBe(n);
    for (let i = 0; i < n; i++) assertCubicsEqualish(square.cubics[i], squareCopy.cubics[i]);

    // Translating by (1, 2) moves every point by (1, 2).
    const offset = new Point(1, 2);
    const squareCubics = square.cubics;
    const translatedSquareCubics = square.transformed(
      translateTransform(offset.x, offset.y),
    ).cubics;
    for (let i = 0; i < squareCubics.length; i++) {
      const a = squareCubics[i];
      const b = translatedSquareCubics[i];
      assertPointsEqualish(
        new Point(a.anchor0X, a.anchor0Y).plus(offset),
        new Point(b.anchor0X, b.anchor0Y),
      );
      assertPointsEqualish(
        new Point(a.control0X, a.control0Y).plus(offset),
        new Point(b.control0X, b.control0Y),
      );
      assertPointsEqualish(
        new Point(a.control1X, a.control1Y).plus(offset),
        new Point(b.control1X, b.control1Y),
      );
      assertPointsEqualish(
        new Point(a.anchor1X, a.anchor1Y).plus(offset),
        new Point(b.anchor1X, b.anchor1Y),
      );
    }
  });

  const nonzeroCubics = (original: readonly Cubic[]) => original.filter((c) => !c.zeroLength());

  it('featuresTest', () => {
    // The polygon's cubics equal the non-zero cubics of its features (equalish,
    // since some points are adjusted when the feature cubics are flattened).
    let nonzero = nonzeroCubics(square.features.flatMap((f) => f.cubics));
    assertCubicListsEqualish(square.cubics, nonzero);

    const squareCopy = RoundedPolygon.copy(square);
    nonzero = nonzeroCubics(squareCopy.features.flatMap((f) => f.cubics));
    assertCubicListsEqualish(squareCopy.cubics, nonzero);
  });

  it('emptyPolygonTest', () => {
    const poly = RoundedPolygon.fromNumVertices(6, {radius: 0, rounding: new CornerRounding(0.1)});
    expect(poly.cubics.length).toBe(1);
    const stillEmpty = poly.transformed(scaleTransform(10, 20));
    expect(stillEmpty.cubics.length).toBe(1);
    expect(stillEmpty.cubics[0].zeroLength()).toBe(true);
  });

  it('emptySideTest', () => {
    // A triangle with one point repeated equals the plain triangle.
    const poly1 = RoundedPolygon.fromVertices([0, 0, 1, 0, 1, 0, 0, 1]);
    const poly2 = RoundedPolygon.fromVertices([0, 0, 1, 0, 0, 1]);
    assertCubicListsEqualish(poly1.cubics, poly2.cubics);
  });
});
