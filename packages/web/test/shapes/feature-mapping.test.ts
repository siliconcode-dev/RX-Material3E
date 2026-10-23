/*
 * Ported from androidx/graphics/graphics-shapes FeatureMappingTest.kt
 * (commonTest) and AndroidFeatureMappingTest.kt (androidDeviceTest).
 * Copyright 2023-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Upstream skips featureMappingDoesNotCrash on its JS target ("There can't
 * be two features with the same progress", from float rounding). This port
 * does Kotlin's 32-bit Float math, so it runs here.
 */
import {describe, expect, it} from 'vitest';
import {
  CornerRounding,
  doMapping,
  featureDistSquared,
  LengthMeasurer,
  MeasuredPolygon,
  RoundedPolygon,
  rotateZTransformer,
  star,
} from '../../src/shapes/graphics/index.js';
import {assertEqualish} from './test-utils.js';

const triangleWithRoundings = RoundedPolygon.fromNumVertices(3, {
  rounding: new CornerRounding(0.2),
});
const triangle = RoundedPolygon.fromNumVertices(3);
const square = RoundedPolygon.fromNumVertices(4);
// Upstream rotates with an android.graphics.Matrix; Compose's rotateZ is the same rotation.
const squareRotated = RoundedPolygon.fromNumVertices(4).transformed(rotateZTransformer(45));

function verifyMapping(
  p1: RoundedPolygon,
  p2: RoundedPolygon,
  validator: (distances: number[]) => void,
) {
  const f1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1).features;
  const f2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2).features;

  // Maps progress in p1 to progress in p2.
  const map = doMapping(f1, f2);

  // Which features were actually mapped, and the distance between their
  // representative points.
  const distances = map.map(([progress1, progress2]) => {
    const feature1 = f1.find((it) => it.progress === progress1)!;
    const feature2 = f2.find((it) => it.progress === progress2)!;
    return featureDistSquared(feature1.feature, feature2.feature);
  });

  validator(distances.sort((a, b) => b - a));
}

describe('FeatureMapping', () => {
  it('featureMappingTriangles', () =>
    verifyMapping(triangleWithRoundings, triangle, (distances) => {
      for (const d of distances) expect(d).toBeLessThan(0.1);
    }));

  it('featureMappingTriangleToSquare', () =>
    verifyMapping(triangle, square, (distances) => {
      // One exact match (both have points at 0 degrees), and 2 close ones.
      expect(distances).toHaveLength(3);
      assertEqualish(distances[0], distances[1]);
      expect(distances[0]).toBeLessThan(0.3);
      expect(distances[2]).toBeLessThan(1e-6);
    }));

  it('featureMappingSquareToTriangle', () =>
    verifyMapping(square, triangle, (distances) => {
      // One exact match (both have points at 0 degrees), and 2 close ones.
      expect(distances).toHaveLength(3);
      assertEqualish(distances[0], distances[1]);
      expect(distances[0]).toBeLessThan(0.3);
      expect(distances[2]).toBeLessThan(1e-6);
    }));

  it('featureMappingDoesNotCrash', () => {
    // Complicated shapes can be matched (this used to crash).
    const checkmark = RoundedPolygon.fromVertices([
      400, -304, 240, -464, 296, -520, 400, -416, 664, -680, 720, -624, 400, -304,
    ]).normalized();
    const verySunny = star(8, {
      innerRadius: 0.65,
      rounding: new CornerRounding(0.15),
    }).normalized();
    verifyMapping(checkmark, verySunny, (distances) => {
      // Most vertices on the checkmark map to a feature in the second shape.
      expect(distances.length).toBeGreaterThanOrEqual(6);
      // And they are close enough.
      expect(distances[0]).toBeLessThan(0.15);
    });
  });

  it('featureMappingSquareRotatedToTriangle (AndroidFeatureMappingTest)', () =>
    verifyMapping(squareRotated, triangle, (distances) => {
      // A very bad mapping (the triangle vertex right in the middle of one of
      // the square's sides) and 2 decent ones.
      expect(distances).toHaveLength(3);
      expect(distances[0]).toBeGreaterThan(0.5);
      assertEqualish(distances[1], distances[2]);
      expect(distances[2]).toBeLessThan(0.1);
    }));
});
