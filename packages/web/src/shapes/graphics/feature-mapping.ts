/*
 * Ported by hand from androidx/graphics/graphics-shapes FeatureMapping.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {Corner, type Feature} from './features.js';
import {DoubleMapper, progressDistance, progressInRange} from './float-mapping.js';
import {Point} from './point.js';
import type {ProgressableFeature} from './polygon-measure.js';
import {DistanceEpsilon, f32} from './utils.js';

// Kotlin Float math throughout: see point.ts.

/** Kotlin's Float.MAX_VALUE, used upstream as an "infinite" distance. */
export const FloatMaxValue = 3.4028234663852886e38;

/** Creates a mapping between the features (rounded corners) of two shapes. */
export function featureMapper(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): DoubleMapper {
  // Only corners are used for the mapping.
  const filteredFeatures1 = features1.filter((f) => f.feature instanceof Corner);
  const filteredFeatures2 = features2.filter((f) => f.feature instanceof Corner);

  const featureProgressMapping = doMapping(filteredFeatures1, filteredFeatures2);
  return new DoubleMapper(...featureProgressMapping);
}

interface DistanceVertex {
  readonly distance: number;
  readonly f1: ProgressableFeature;
  readonly f2: ProgressableFeature;
}

const IdentityMapping: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.5, 0.5],
];

/**
 * Maps features1 to features2. Returns pairs of (progress of a feature in
 * features1, progress of the feature in features2 it maps to), sorted by the
 * first element. To do this:
 * 1. Compute the distance for every pair in features1 x features2.
 * 2. Sort them by that distance, ascending (a stable sort, as Kotlin's).
 * 3. Add them from the smallest distance up, making sure that (a) neither
 *    feature has been mapped yet and (b) the mapping gets no crossing: the
 *    second elements must increase monotonically, except maybe once
 *    (counting all consecutive pairs and the last to the first).
 */
export function doMapping(
  features1: readonly ProgressableFeature[],
  features2: readonly ProgressableFeature[],
): Array<readonly [number, number]> {
  const distanceVertexList: DistanceVertex[] = [];
  for (const f1 of features1) {
    for (const f2 of features2) {
      const d = featureDistSquared(f1.feature, f2.feature);
      if (d !== FloatMaxValue) distanceVertexList.push({distance: d, f1, f2});
    }
  }
  distanceVertexList.sort((a, b) => compareFloats(a.distance, b.distance));

  // Special cases.
  if (distanceVertexList.length === 0) return IdentityMapping.slice();
  if (distanceVertexList.length === 1) {
    const f1 = distanceVertexList[0].f1.progress;
    const f2 = distanceVertexList[0].f2.progress;
    return [
      [f1, f2],
      [f32(f32(f1 + 0.5) % 1), f32(f32(f2 + 0.5) % 1)],
    ];
  }

  const helper = new MappingHelper();
  for (const it of distanceVertexList) helper.addMapping(it.f1, it.f2);
  return helper.mapping;
}

/** Kotlin's Float.compareTo: -0 before 0, NaN after everything. */
function compareFloats(a: number, b: number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  if (a === b) {
    if (a !== 0) return 0;
    return (Object.is(a, -0) ? -1 : 0) - (Object.is(b, -0) ? -1 : 0);
  }
  return (Number.isNaN(a) ? 1 : 0) - (Number.isNaN(b) ? 1 : 0);
}

/** Kotlin's List.binarySearchBy over the first element of each pair. */
function binarySearchByFirst(list: ReadonlyArray<readonly [number, number]>, key: number): number {
  let low = 0;
  let high = list.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const cmp = compareFloats(list[mid][0], key);
    if (cmp < 0) low = mid + 1;
    else if (cmp > 0) high = mid - 1;
    else return mid;
  }
  return -(low + 1);
}

class MappingHelper {
  // Mappings from progress in the start shape to progress in the end shape,
  // kept sorted by the first element.
  readonly mapping: Array<readonly [number, number]> = [];

  // The features used so far in the start and end shape.
  private readonly usedF1 = new Set<ProgressableFeature>();
  private readonly usedF2 = new Set<ProgressableFeature>();

  addMapping(f1: ProgressableFeature, f2: ProgressableFeature) {
    // Don't map the same feature twice.
    if (this.usedF1.has(f1) || this.usedF2.has(f2)) return;

    // The mapping is sorted; find where this one goes.
    const index = binarySearchByFirst(this.mapping, f1.progress);
    if (index >= 0) throw new Error("There can't be two features with the same progress");

    const insertionIndex = -index - 1;
    const n = this.mapping.length;

    // The first element can always be added.
    if (n >= 1) {
      const [before1, before2] = this.mapping[(insertionIndex + n - 1) % n];
      const [after1, after2] = this.mapping[insertionIndex % n];

      // Features too close to each other make the DoubleMapper unstable.
      if (
        progressDistance(f1.progress, before1) < DistanceEpsilon ||
        progressDistance(f1.progress, after1) < DistanceEpsilon ||
        progressDistance(f2.progress, before2) < DistanceEpsilon ||
        progressDistance(f2.progress, after2) < DistanceEpsilon
      ) {
        return;
      }

      // With 2 or more elements, make sure this adds no crossing.
      if (n > 1 && !progressInRange(f2.progress, before2, after2)) return;
    }

    // All good, add the mapping.
    this.mapping.splice(insertionIndex, 0, [f1.progress, f2.progress]);
    this.usedF1.add(f1);
    this.usedF2.add(f2);
  }
}

/**
 * Squared distance between the representative points of two features on
 * different shapes. Morph uses it to decide which features (and so which
 * curves) map to each other.
 */
export function featureDistSquared(f1: Feature, f2: Feature): number {
  // Upstream TODO: concave-convex matching might be wanted in some cases;
  // this approach would not work for it.
  if (f1 instanceof Corner && f2 instanceof Corner && f1.convex !== f2.convex) {
    // Only map features of the same concavity, by making the distance
    // between different ones "infinite".
    return FloatMaxValue;
  }
  return featureRepresentativePoint(f1).minus(featureRepresentativePoint(f2)).getDistanceSquared();
}

export function featureRepresentativePoint(feature: Feature): Point {
  const first = feature.cubics[0];
  const last = feature.cubics[feature.cubics.length - 1];
  const x = f32(f32(first.anchor0X + last.anchor1X) / 2);
  const y = f32(f32(first.anchor0Y + last.anchor1Y) / 2);
  return new Point(x, y);
}
