/*
 * Ported by hand from androidx/graphics/graphics-shapes Morph.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {Cubic, MutableCubic} from './cubic.js';
import {featureMapper} from './feature-mapping.js';
import {LengthMeasurer, MeasuredPolygon, type MeasuredCubic} from './polygon-measure.js';
import type {RoundedPolygon} from './rounded-polygon.js';
import {AngleEpsilon, f32, interpolate, positiveModulo} from './utils.js';

// Kotlin Float math throughout: see point.ts.

/**
 * Animates between a start and an end polygon.
 *
 * Morphing between arbitrary shapes is hard because it is not clear how
 * the points of one map to the points of the other. Morph only works on
 * RoundedPolygons, which are one contiguous outline made of cubics, so two
 * shapes only differ in the number and placement of their curves. It maps
 * the curves of the two shapes to each other (by proximity, distance to the
 * vertices and concavity), splitting curves where the counts or the
 * placement differ.
 */
export class Morph {
  /**
   * Every cubic needed for both shapes (the originals may be cut to line
   * them up), matched one to one: the first of each pair belongs to the
   * start shape, the second to the end shape.
   */
  readonly morphMatch: ReadonlyArray<readonly [Cubic, Cubic]>;

  constructor(
    private readonly start: RoundedPolygon,
    private readonly end: RoundedPolygon,
  ) {
    this.morphMatch = Morph.match(start, end);
  }

  /**
   * The axis-aligned bounds of both shapes together, as [left, top, right,
   * bottom]. `approximate` (default true) uses all anchor and control points,
   * which is faster.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    this.start.calculateBounds(bounds, approximate);
    const [minX, minY, maxX, maxY] = bounds;
    this.end.calculateBounds(bounds, approximate);
    bounds[0] = Math.min(minX, bounds[0]);
    bounds[1] = Math.min(minY, bounds[1]);
    bounds[2] = Math.max(maxX, bounds[2]);
    bounds[3] = Math.max(maxY, bounds[3]);
    return bounds;
  }

  /**
   * A square that holds both shapes in any rotation (from the distance
   * between the center and each curve's start and midpoint).
   */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    this.start.calculateMaxBounds(bounds);
    const [minX, minY, maxX, maxY] = bounds;
    this.end.calculateMaxBounds(bounds);
    bounds[0] = Math.min(minX, bounds[0]);
    bounds[1] = Math.min(minY, bounds[1]);
    bounds[2] = Math.max(maxX, bounds[2]);
    bounds[3] = Math.max(maxY, bounds[3]);
    return bounds;
  }

  /**
   * The morph at `progress` as a new list of cubics. 0 is the start shape,
   * 1 the end shape, values in between interpolate linearly. Values a little
   * outside 0..1 exaggerate the shape (for overshoot animations).
   */
  asCubics(progress: number): Cubic[] {
    const result: Cubic[] = [];
    // The first/last handling makes the final anchor point exactly match the
    // first one; points that are slightly off, even by far less than a
    // pixel, can leave rendering artifacts.
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    for (const [c1, c2] of this.morphMatch) {
      const points = new Array<number>(8);
      for (let it = 0; it < 8; it++) {
        points[it] = interpolate(c1.points[it], c2.points[it], progress);
      }
      const cubic = new Cubic(points);
      if (firstCubic === null) firstCubic = cubic;
      if (lastCubic !== null) result.push(lastCubic);
      lastCubic = cubic;
    }
    if (lastCubic !== null && firstCubic !== null) {
      result.push(
        Cubic.of(
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ),
      );
    }
    return result;
  }

  /**
   * Like asCubics, but calls `callback` for each cubic, reusing one
   * MutableCubic instead of creating new cubics.
   */
  forEachCubic(
    progress: number,
    callback: (cubic: MutableCubic) => void,
    mutableCubic: MutableCubic = new MutableCubic(),
  ) {
    for (const [c1, c2] of this.morphMatch) {
      mutableCubic.interpolate(c1, c2, progress);
      callback(mutableCubic);
    }
  }

  /**
   * Builds the matched cubic pairs. Both polygons are measured along their
   * outline, featureMapper decides which corners map to each other, and the
   * curves are then walked together, cutting one wherever the other ends
   * first.
   */
  static match(p1: RoundedPolygon, p2: RoundedPolygon): Array<readonly [Cubic, Cubic]> {
    // Measure the polygons: the measured cubics of each are what gets matched.
    const measuredPolygon1 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p1);
    const measuredPolygon2 = MeasuredPolygon.measurePolygon(new LengthMeasurer(), p2);

    // The corners of each polygon (their inner circular curve) with the
    // progress at their middle.
    const features1 = measuredPolygon1.features;
    const features2 = measuredPolygon2.features;

    // Map each feature to the closest one in the other shape. The mapper
    // turns a progress on one shape into the matching progress on the other,
    // both ways.
    const doubleMapper = featureMapper(features1, features2);

    // The cut point on polygon 2 is where progress 0 of polygon 1 maps to.
    const polygon2CutPoint = doubleMapper.map(0);

    // Cut polygon 2 there and rotate it so both start at the matching
    // point; bs1/bs2 run from outline progress 0 to 1.
    const bs1 = measuredPolygon1;
    const bs2 = measuredPolygon2.cutAndShift(polygon2CutPoint);

    // Walk both lists of measured cubics and pair them up.
    const ret: Array<readonly [Cubic, Cubic]> = [];
    // i1/i2: index of the current cubic on the start (1) and end (2) shape.
    let i1 = 0;
    let i2 = 0;
    // b1, b2: the current measured cubic of each polygon.
    let b1: MeasuredCubic | null = bs1.getOrNull(i1++);
    let b2: MeasuredCubic | null = bs2.getOrNull(i2++);
    // Until every curve is matched.
    while (b1 !== null && b2 !== null) {
      // Progress values from shape 1's point of view: b1a, b2a are where the
      // current measured cubics end, in [0, 1].
      const b1a = i1 === bs1.size ? 1 : b1.endOutlineProgress;
      const b2a =
        i2 === bs2.size
          ? 1
          : doubleMapper.mapBack(positiveModulo(f32(b2.endOutlineProgress + polygon2CutPoint), 1));
      const minb = Math.min(b1a, b2a);
      // minb is where the curve that ends first ends. If both end about
      // there, they match as they are; otherwise cut the longer one.
      let seg1: MeasuredCubic;
      let newb1: MeasuredCubic | null;
      if (b1a > f32(minb + AngleEpsilon)) {
        [seg1, newb1] = b1.cutAtProgress(minb);
      } else {
        seg1 = b1;
        newb1 = bs1.getOrNull(i1++);
      }
      let seg2: MeasuredCubic;
      let newb2: MeasuredCubic | null;
      if (b2a > f32(minb + AngleEpsilon)) {
        [seg2, newb2] = b2.cutAtProgress(
          positiveModulo(f32(doubleMapper.map(minb) - polygon2CutPoint), 1),
        );
      } else {
        seg2 = b2;
        newb2 = bs2.getOrNull(i2++);
      }
      ret.push([seg1.cubic, seg2.cubic]);
      b1 = newb1;
      b2 = newb2;
    }
    if (b1 !== null || b2 !== null) {
      throw new Error("Expected both Polygon's Cubic to be fully matched");
    }
    return ret;
  }
}
