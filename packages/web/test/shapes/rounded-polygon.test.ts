/*
 * Ported from androidx/graphics/graphics-shapes commonTest RoundedPolygonTest.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {describe, expect, it} from 'vitest';
import {
  circle,
  Corner,
  CornerRounding,
  Cubic,
  Edge,
  Feature,
  pill,
  pillStar,
  Point,
  rectangle,
  RoundedPolygon,
  star,
} from '../../src/shapes/graphics/index.js';
import {assertEqualish, assertInBounds, assertPolygonsEqualish} from './test-utils.js';

describe('RoundedPolygon (RoundedPolygonTest.kt)', () => {
  const rounding = new CornerRounding(0.1);
  const perVtxRounded = [rounding, rounding, rounding, rounding];

  it('numVertsConstructorTest', () => {
    expect(() => RoundedPolygon.fromNumVertices(2)).toThrow();

    const square = RoundedPolygon.fromNumVertices(4);
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(square.cubics, min, max);

    const doubleSquare = RoundedPolygon.fromNumVertices(4, {radius: 2});
    min = min.times(2);
    max = max.times(2);
    assertInBounds(doubleSquare.cubics, min, max);

    const squareRounded = RoundedPolygon.fromNumVertices(4, {rounding});
    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(squareRounded.cubics, min, max);

    const squarePVRounded = RoundedPolygon.fromNumVertices(4, {perVertexRounding: perVtxRounded});
    assertInBounds(squarePVRounded.cubics, min, max);
  });

  it('verticesConstructorTest', () => {
    const p0 = new Point(1, 0);
    const p1 = new Point(0, 1);
    const p2 = new Point(-1, 0);
    const p3 = new Point(0, -1);
    const verts = [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y];

    expect(() => RoundedPolygon.fromVertices([p0.x, p0.y, p1.x, p1.y])).toThrow();

    const manualSquare = RoundedPolygon.fromVertices(verts);
    let min = new Point(-1, -1);
    let max = new Point(1, 1);
    assertInBounds(manualSquare.cubics, min, max);

    const offset = new Point(1, 2);
    const offsetVerts = verts.map((v, i) => v + (i % 2 === 0 ? offset.x : offset.y));
    const manualSquareOffset = RoundedPolygon.fromVertices(offsetVerts, {
      centerX: offset.x,
      centerY: offset.y,
    });
    min = new Point(0, 1);
    max = new Point(2, 3);
    assertInBounds(manualSquareOffset.cubics, min, max);

    min = new Point(-1, -1);
    max = new Point(1, 1);
    assertInBounds(RoundedPolygon.fromVertices(verts, {rounding}).cubics, min, max);
    assertInBounds(
      RoundedPolygon.fromVertices(verts, {perVertexRounding: perVtxRounded}).cubics,
      min,
      max,
    );
  });

  it('featuresConstructorThrowsForTooFewFeatures', () => {
    expect(() => RoundedPolygon.fromFeatures([])).toThrow();
    const corner = new Corner([Cubic.empty(0, 0)]);
    expect(() => RoundedPolygon.fromFeatures([corner])).toThrow();
  });

  it('featuresConstructorThrowsForNonContinuousFeatures', () => {
    const cubic1 = Cubic.straightLine(0, 0, 1, 0);
    const cubic2 = Cubic.straightLine(10, 10, 20, 20);
    expect(() =>
      RoundedPolygon.fromFeatures([Feature.buildEdge(cubic1), Feature.buildEdge(cubic2)]),
    ).toThrow();
  });

  it('featuresConstructorReconstructsSquare', () => {
    const base = rectangle();
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
  });

  it('featuresConstructorReconstructsRoundedSquare', () => {
    const base = rectangle({rounding: new CornerRounding(0.5, 0.2)});
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
  });

  it('featuresConstructorReconstructsCircles', () => {
    for (let i = 3; i <= 20; i++) {
      const base = circle({numVertices: i});
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
    }
  });

  it('featuresConstructorReconstructsStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i);
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
    }
  });

  it('featuresConstructorReconstructsRoundedStars', () => {
    for (let i = 3; i <= 20; i++) {
      const base = star(i, {rounding: new CornerRounding(0.5, 0.2)});
      assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
    }
  });

  it('featuresConstructorReconstructsPill', () => {
    const base = pill();
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
  });

  it('featuresConstructorReconstructsPillStar', () => {
    const base = pillStar({rounding: new CornerRounding(0.5, 0.2)});
    assertPolygonsEqualish(base, RoundedPolygon.fromFeatures(base.features));
  });

  it('computeCenterTest', () => {
    const polygon = RoundedPolygon.fromVertices([0, 0, 1, 0, 0, 1, 1, 1]);
    expect(Math.abs(polygon.centerX - 0.5)).toBeLessThanOrEqual(1e-4);
    expect(Math.abs(polygon.centerY - 0.5)).toBeLessThanOrEqual(1e-4);
  });

  const pointsToFloats = (points: Point[]) => points.flatMap((p) => [p.x, p.y]);

  it('roundingSpaceUsageTest', () => {
    const p0 = new Point(0, 0);
    const p1 = new Point(1, 0);
    const p2 = new Point(0.5, 1);
    const pvRounding = [
      new CornerRounding(1, 0),
      new CornerRounding(1, 1),
      CornerRounding.Unrounded,
    ];
    const polygon = RoundedPolygon.fromVertices(pointsToFloats([p0, p1, p2]), {
      perVertexRounding: pvRounding,
    });

    // Not enough room on the p0 -> p1 side even for the roundings, so smoothing
    // is ignored and both corners end in the middle.
    const lowerEdgeFeature = polygon.features.find((f) => f instanceof Edge)!;
    expect(lowerEdgeFeature.cubics.length).toBe(1);
    const lowerEdge = lowerEdgeFeature.cubics[0];
    assertEqualish(0.5, lowerEdge.anchor0X);
    assertEqualish(0.0, lowerEdge.anchor0Y);
    assertEqualish(0.5, lowerEdge.anchor1X);
    assertEqualish(0.0, lowerEdge.anchor1Y);
  });

  /*
   * The following tests check how much is cut for the top left (vertex 0) and
   * bottom left (vertex 3) corners, which compete for space on the left side.
   *
   *   Vertex 0            Vertex 1
   *      *---------------------*
   *      |                     |
   *      *---------------------*
   *   Vertex 3            Vertex 2
   */
  const points = 20;
  const show = (cr: CornerRounding) => `(r=${cr.radius}, s=${cr.smoothing})`;

  function doUnevenSmoothTest(
    // Rounding for vertex 0 (top left)
    rounding0: CornerRounding,
    expectedV0SX: number, // Expected total cut from vertex 0 towards vertex 1
    expectedV0SY: number, // Expected total cut from vertex 0 towards vertex 3
    expectedV3SY: number, // Expected total cut from vertex 3 towards vertex 0
    // Rounding for vertex 3 (bottom left)
    rounding3: CornerRounding = new CornerRounding(0.5),
  ) {
    const p0 = new Point(0, 0);
    const p1 = new Point(5, 0);
    const p2 = new Point(5, 1);
    const p3 = new Point(0, 1);
    const pvRounding = [rounding0, CornerRounding.Unrounded, CornerRounding.Unrounded, rounding3];
    const polygon = RoundedPolygon.fromVertices(pointsToFloats([p0, p1, p2, p3]), {
      perVertexRounding: pvRounding,
    });
    const edges = polygon.features.filter((f) => f instanceof Edge);
    const e01 = edges[0];
    const e30 = edges[3];
    const msg = `r0 = ${show(rounding0)}, r3 = ${show(rounding3)}`;
    assertEqualish(expectedV0SX, e01.cubics[0].anchor0X, msg);
    assertEqualish(expectedV0SY, e30.cubics[0].anchor1Y, msg);
    assertEqualish(expectedV3SY, 1 - e30.cubics[0].anchor0Y, msg);
  }

  it('unevenSmoothingTest', () => {
    // Vertex 3 has the default 0.5 radius and no smoothing.
    // Vertex 0 has 0.4 radius, with smoothing from 0 to 1.
    for (let i = 0; i <= points; i++) {
      const smooth = i / points;
      doUnevenSmoothTest(
        new CornerRounding(0.4, smooth),
        0.4 * (1 + smooth),
        Math.min(0.4 * (1 + smooth), 0.5),
        0.5,
      );
    }
  });

  it('unevenSmoothingTest2', () => {
    // Vertex 3 has 0.2 radius and 0.2 smoothing, so it takes at most 0.4.
    // Vertex 0 has 0.4 radius with smoothing from 0 to 1; from 0.5 it competes
    // with vertex 3 for space.
    for (let i = 0; i <= points; i++) {
      const smooth = i / points;
      const smoothWantedV0 = 0.4 * smooth;
      const smoothWantedV3 = 0.2;
      // There is 0.4 of room for smoothing.
      const factor = Math.min(0.4 / (smoothWantedV0 + smoothWantedV3), 1);
      doUnevenSmoothTest(
        new CornerRounding(0.4, smooth),
        0.4 * (1 + smooth),
        0.4 + factor * smoothWantedV0,
        0.2 + factor * smoothWantedV3,
        new CornerRounding(0.2, 1),
      );
    }
  });

  it('unevenSmoothingTest3', () => {
    // Vertex 3 has 0.6 radius. Vertex 0 has 0.4 radius with smoothing from 0 to
    // 1. No room for smoothing between them, but vertex 0 still smooths along
    // the top side.
    for (let i = 0; i <= points; i++) {
      const smooth = i / points;
      doUnevenSmoothTest(
        new CornerRounding(0.4, smooth),
        0.4 * (1 + smooth),
        0.4,
        0.6,
        new CornerRounding(0.6),
      );
    }
  });

  it('creatingFullSizeTest', () => {
    const radius = 400;
    const innerRadiusFactor = 0.35;
    const innerRadius = radius * innerRadiusFactor;
    const roundingFactor = 0.32;
    const fullSizeShape = star(4, {
      radius,
      innerRadius,
      rounding: new CornerRounding(radius * roundingFactor),
      innerRounding: new CornerRounding(radius * roundingFactor),
      centerX: radius,
      centerY: radius,
    }).transformed((x, y) => [(x - radius) / radius, (y - radius) / radius]);
    const canonicalShape = star(4, {
      radius: 1,
      innerRadius: innerRadiusFactor,
      rounding: new CornerRounding(roundingFactor),
      innerRounding: new CornerRounding(roundingFactor),
    });
    const cubics = canonicalShape.cubics;
    const cubics1 = fullSizeShape.cubics;
    expect(cubics1.length).toBe(cubics.length);
    cubics.forEach((cubic, i) => {
      const cubic1 = cubics1[i];
      assertEqualish(cubic.anchor0X, cubic1.anchor0X);
      assertEqualish(cubic.anchor0Y, cubic1.anchor0Y);
      assertEqualish(cubic.anchor1X, cubic1.anchor1X);
      assertEqualish(cubic.anchor1Y, cubic1.anchor1Y);
      assertEqualish(cubic.control0X, cubic1.control0X);
      assertEqualish(cubic.control0Y, cubic1.control0Y);
      assertEqualish(cubic.control1X, cubic1.control1X);
      assertEqualish(cubic.control1Y, cubic1.control1Y);
    });
  });
});
