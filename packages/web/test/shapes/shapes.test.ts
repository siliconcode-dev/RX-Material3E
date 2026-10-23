/*
 * Ported from androidx/graphics/graphics-shapes commonTest ShapesTest.kt and
 * CornerRoundingTest.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {describe, expect, it} from 'vitest';
import {circle, CornerRounding, type Cubic, Point, star} from '../../src/shapes/graphics/index.js';
import {assertInBounds} from './test-utils.js';

describe('shape builders (ShapesTest.kt)', () => {
  const Zero = new Point(0, 0);
  const Epsilon = 0.01;

  const distance = (start: Point, end: Point) => end.minus(start).getDistance();

  /** The point is `radius1` (or, for stars, `radius2`) away from the center. */
  function assertPointOnRadii(point: Point, radius1: number, radius2 = radius1, center = Zero) {
    const dist = distance(center, point);
    const onEither = Math.abs(radius1 - dist) <= Epsilon || Math.abs(radius2 - dist) <= Epsilon;
    expect(onEither, `${point} is ${dist} from ${center}, not ${radius1} or ${radius2}`).toBe(true);
  }

  function assertCubicOnRadii(cubic: Cubic, radius1: number, radius2 = radius1, center = Zero) {
    assertPointOnRadii(new Point(cubic.anchor0X, cubic.anchor0Y), radius1, radius2, center);
    assertPointOnRadii(new Point(cubic.anchor1X, cubic.anchor1Y), radius1, radius2, center);
  }

  /**
   * Points along the curve are `radius` from the center, leniently, since the
   * shape only approximates a circle with cubics.
   */
  function assertCircularCubic(cubic: Cubic, radius: number, center: Point) {
    for (let t = 0; t <= 1; t += 0.1) {
      const distanceToPoint = distance(center, cubic.pointOnCurve(t));
      expect(Math.abs(radius - distanceToPoint)).toBeLessThanOrEqual(Epsilon);
    }
  }

  function assertCircleShape(shape: readonly Cubic[], radius = 1, center = Zero) {
    for (const cubic of shape) assertCircularCubic(cubic, radius, center);
  }

  it('circleTest', () => {
    expect(() => circle({numVertices: 2})).toThrow();
    assertCircleShape(circle().cubics);
    assertCircleShape(circle({numVertices: 3}).cubics);
    assertCircleShape(circle({numVertices: 20}).cubics);
    assertCircleShape(circle({radius: 3}).cubics, 3);
    const center = new Point(1, 2);
    assertCircleShape(circle({centerX: center.x, centerY: center.y}).cubics, 1, center);
  });

  /**
   * Unrounded stars: every vertex is on one of the two radii. Rounded stars
   * only get a bounds check.
   */
  it('starTest', () => {
    let radius = 1;
    let innerRadius = 0.5;
    for (const cubic of star(4, {innerRadius: 0.5}).cubics) {
      assertCubicOnRadii(cubic, radius, innerRadius);
    }

    const center = new Point(1, 2);
    for (const cubic of star(4, {innerRadius, centerX: center.x, centerY: center.y}).cubics) {
      assertCubicOnRadii(cubic, radius, innerRadius, center);
    }

    radius = 4;
    innerRadius = 2;
    for (const cubic of star(4, {radius, innerRadius}).cubics) {
      assertCubicOnRadii(cubic, radius, innerRadius);
    }
  });

  it('roundedStarTest', () => {
    const rounding = new CornerRounding(0.1);
    const innerRounding = new CornerRounding(0.2);
    const perVtxRounded = [
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
      rounding,
      innerRounding,
    ];
    const min = new Point(-1, -1);
    const max = new Point(1, 1);

    assertInBounds(star(4, {innerRadius: 0.5, rounding}).cubics, min, max);
    assertInBounds(star(4, {innerRadius: 0.5, innerRounding}).cubics, min, max);
    assertInBounds(star(4, {innerRadius: 0.5, rounding, innerRounding}).cubics, min, max);
    assertInBounds(star(4, {innerRadius: 0.5, perVertexRounding: perVtxRounded}).cubics, min, max);

    expect(() => star(6, {innerRadius: 0.5, perVertexRounding: perVtxRounded})).toThrow();
  });
});

describe('CornerRounding (CornerRoundingTest.kt)', () => {
  it('cornerRoundingTest', () => {
    const defaultCorner = new CornerRounding();
    expect([defaultCorner.radius, defaultCorner.smoothing]).toEqual([0, 0]);

    const unrounded = CornerRounding.Unrounded;
    expect([unrounded.radius, unrounded.smoothing]).toEqual([0, 0]);

    const rounded = new CornerRounding(5);
    expect([rounded.radius, rounded.smoothing]).toEqual([5, 0]);

    const smoothed = new CornerRounding(undefined, 0.5);
    expect([smoothed.radius, smoothed.smoothing]).toEqual([0, 0.5]);

    const roundedAndSmoothed = new CornerRounding(5, 0.5);
    expect([roundedAndSmoothed.radius, roundedAndSmoothed.smoothing]).toEqual([5, 0.5]);
  });
});
