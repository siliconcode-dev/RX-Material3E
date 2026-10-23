/*
 * Ported from androidx/graphics/graphics-shapes commonTest CubicTest.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {describe, expect, it} from 'vitest';
import {Cubic, Point} from '../../src/shapes/graphics/index.js';
import {
  assertCubicsEqualish,
  assertPointsEqual,
  assertPointsEqualish,
  identityTransform,
  scaleTransform,
  translateTransform,
} from './test-utils.js';

describe('Cubic (CubicTest.kt)', () => {
  // These points make a roughly circular arc in the upper-right quadrant around (0,0).
  const zero = new Point(0, 0);
  const p0 = new Point(1, 0);
  const p1 = new Point(1, 0.5);
  const p2 = new Point(0.5, 1);
  const p3 = new Point(0, 1);
  const cubic = Cubic.fromPoints(p0, p1, p2, p3);

  const anchor0 = (c: Cubic) => new Point(c.anchor0X, c.anchor0Y);
  const control0 = (c: Cubic) => new Point(c.control0X, c.control0Y);
  const control1 = (c: Cubic) => new Point(c.control1X, c.control1Y);
  const anchor1 = (c: Cubic) => new Point(c.anchor1X, c.anchor1Y);

  it('constructionTest', () => {
    assertPointsEqual(p0, anchor0(cubic));
    assertPointsEqual(p1, control0(cubic));
    assertPointsEqual(p2, control1(cubic));
    assertPointsEqual(p3, anchor1(cubic));
  });

  it('circularArcTest', () => {
    const arcCubic = Cubic.circularArc(zero.x, zero.y, p0.x, p0.y, p3.x, p3.y);
    assertPointsEqual(p0, anchor0(arcCubic));
    assertPointsEqual(p3, anchor1(arcCubic));
  });

  it('divTest', () => {
    let divCubic = cubic.div(1);
    assertCubicsEqualish(cubic, divCubic);
    divCubic = cubic.div(2);
    assertPointsEqualish(p0.div(2), anchor0(divCubic));
    assertPointsEqualish(p1.div(2), control0(divCubic));
    assertPointsEqualish(p2.div(2), control1(divCubic));
    assertPointsEqualish(p3.div(2), anchor1(divCubic));
  });

  it('timesTest', () => {
    let timesCubic = cubic.times(1);
    assertPointsEqual(p0, anchor0(timesCubic));
    assertPointsEqual(p1, control0(timesCubic));
    assertPointsEqual(p2, control1(timesCubic));
    assertPointsEqual(p3, anchor1(timesCubic));
    timesCubic = cubic.times(2);
    assertPointsEqualish(p0.times(2), anchor0(timesCubic));
    assertPointsEqualish(p1.times(2), control0(timesCubic));
    assertPointsEqualish(p2.times(2), control1(timesCubic));
    assertPointsEqualish(p3.times(2), anchor1(timesCubic));
  });

  it('plusTest', () => {
    const offsetCubic = cubic.times(2);
    const plusCubic = cubic.plus(offsetCubic);
    assertPointsEqualish(p0.plus(anchor0(offsetCubic)), anchor0(plusCubic));
    assertPointsEqualish(p1.plus(control0(offsetCubic)), control0(plusCubic));
    assertPointsEqualish(p2.plus(control1(offsetCubic)), control1(plusCubic));
    assertPointsEqualish(p3.plus(anchor1(offsetCubic)), anchor1(plusCubic));
  });

  it('reverseTest', () => {
    const reverseCubic = cubic.reverse();
    assertPointsEqual(p3, anchor0(reverseCubic));
    assertPointsEqual(p2, control0(reverseCubic));
    assertPointsEqual(p1, control1(reverseCubic));
    assertPointsEqual(p0, anchor1(reverseCubic));
  });

  function assertBetween(end0: Point, end1: Point, actual: Point) {
    expect(Math.min(end0.x, end1.x) <= actual.x).toBe(true);
    expect(Math.min(end0.y, end1.y) <= actual.y).toBe(true);
    expect(Math.max(end0.x, end1.x) >= actual.x).toBe(true);
    expect(Math.max(end0.y, end1.y) >= actual.y).toBe(true);
  }

  it('straightLineTest', () => {
    const lineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y);
    assertPointsEqual(p0, anchor0(lineCubic));
    assertPointsEqual(p3, anchor1(lineCubic));
    assertBetween(p0, p3, control0(lineCubic));
    assertBetween(p0, p3, control1(lineCubic));
  });

  it('splitTest', () => {
    const [split0, split1] = cubic.split(0.5);
    assertPointsEqual(anchor0(cubic), anchor0(split0));
    assertPointsEqual(anchor1(cubic), anchor1(split1));
    assertBetween(anchor0(cubic), anchor1(cubic), anchor1(split0));
    assertBetween(anchor0(cubic), anchor1(cubic), anchor0(split1));
  });

  it('pointOnCurveTest', () => {
    let halfway = cubic.pointOnCurve(0.5);
    assertBetween(anchor0(cubic), anchor1(cubic), halfway);
    const straightLineCubic = Cubic.straightLine(p0.x, p0.y, p3.x, p3.y);
    halfway = straightLineCubic.pointOnCurve(0.5);
    const computedHalfway = new Point(p0.x + 0.5 * (p3.x - p0.x), p0.y + 0.5 * (p3.y - p0.y));
    assertPointsEqualish(computedHalfway, halfway);
  });

  it('transformTest', () => {
    let transformedCubic = cubic.transformed(identityTransform());
    assertCubicsEqualish(cubic, transformedCubic);

    transformedCubic = cubic.transformed(scaleTransform(3, 3));
    assertCubicsEqualish(cubic.times(3), transformedCubic);

    const tx = 200;
    const ty = 300;
    const translationVector = new Point(tx, ty);
    transformedCubic = cubic.transformed(translateTransform(tx, ty));
    assertPointsEqualish(anchor0(cubic).plus(translationVector), anchor0(transformedCubic));
    assertPointsEqualish(control0(cubic).plus(translationVector), control0(transformedCubic));
    assertPointsEqualish(control1(cubic).plus(translationVector), control1(transformedCubic));
    assertPointsEqualish(anchor1(cubic).plus(translationVector), anchor1(transformedCubic));
  });

  it('emptyCubicHasZeroLength', () => {
    expect(Cubic.empty(10, 10).zeroLength()).toBe(true);
  });
});
