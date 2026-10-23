/*
 * Ported by hand from androidx/graphics/graphics-shapes FloatMapping.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {DistanceEpsilon, f32, positiveModulo} from './utils.js';

// Kotlin Float math throughout: see point.ts.

/**
 * Checks if the given progress is in the given progress range. Progress is in
 * the [0..1) interval and wraps, so there is a special case when progressTo <
 * progressFrom: for the range 0.7 to 0.2, both 0.8 and 0.1 are inside and 0.5
 * is outside.
 */
export function progressInRange(progress: number, progressFrom: number, progressTo: number) {
  return progressTo >= progressFrom
    ? progress >= progressFrom && progress <= progressTo
    : progress >= progressFrom || progress <= progressTo;
}

/**
 * Maps from one set of progress values to another. DoubleMapper uses it to
 * find the value on one shape that maps to the matching value on the other.
 */
export function linearMap(
  xValues: readonly number[],
  yValues: readonly number[],
  x: number,
): number {
  x = f32(x);
  if (!(x >= 0 && x <= 1)) throw new Error(`Invalid progress: ${x}`);
  const segmentStartIndex = xValues.findIndex((_, it) =>
    progressInRange(x, xValues[it], xValues[(it + 1) % xValues.length]),
  );
  // Kotlin's first {} throws when nothing matches.
  if (segmentStartIndex < 0)
    throw new Error('Collection contains no element matching the predicate.');
  const segmentEndIndex = (segmentStartIndex + 1) % xValues.length;
  const segmentSizeX = positiveModulo(
    f32(xValues[segmentEndIndex] - xValues[segmentStartIndex]),
    1,
  );
  const segmentSizeY = positiveModulo(
    f32(yValues[segmentEndIndex] - yValues[segmentStartIndex]),
    1,
  );
  const positionInSegment =
    segmentSizeX < f32(0.001)
      ? 0.5
      : f32(positiveModulo(f32(x - xValues[segmentStartIndex]), 1) / segmentSizeX);
  return positiveModulo(f32(yValues[segmentStartIndex] + f32(segmentSizeY * positionInSegment)), 1);
}

/**
 * Maps values in the [0..1) source space to the [0..1) target space and back.
 * The mapping comes from a finite list of representative pairs, extended to
 * the whole interval by linear interpolation, wrapping around. With mappings
 * 0.2 to 0.5 and 0.4 to 0.6, 0.3 maps to 0.55 and 0.21 to 0.505.
 *
 * Morph uses it to map progress between the start and end shape, which
 * decides where curves are cut and matched.
 */
export class DoubleMapper {
  private readonly sourceValues: number[] = [];
  private readonly targetValues: number[] = [];

  constructor(...mappings: ReadonlyArray<readonly [number, number]>) {
    for (const [source, target] of mappings) {
      this.sourceValues.push(f32(source));
      this.targetValues.push(f32(target));
    }
    // Both source and target values should increase monotonically, except
    // maybe once (since progress wraps around).
    validateProgress(this.sourceValues);
    validateProgress(this.targetValues);
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x);
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x);
  }

  // Any 2 points on the (x, x) diagonal with x in [0, 1); spread as much as
  // possible to minimize float errors.
  static readonly Identity = new DoubleMapper([0, 0], [0.5, 0.5]);
}

/**
 * Checks that progress values are all in [0, 1) and increase monotonically,
 * except maybe once where they wrap around. All consecutive pairs count, plus
 * the last-to-first pair: (0, 0.3, 0.6), (0.3, 0.6, 0) and (0.6, 0.3, 0) are
 * valid; (0.5, 0, 0.7) is not, since it goes down twice.
 */
export function validateProgress(p: readonly number[]) {
  if (p.length === 0) throw new Error('List is empty.');
  let prev = p[p.length - 1];
  let wraps = 0;
  for (const curr of p) {
    if (!(curr >= 0 && curr < 1)) {
      throw new Error('FloatMapping - Progress outside of range: ' + p.join(', '));
    }
    if (!(progressDistance(curr, prev) > DistanceEpsilon)) {
      throw new Error('FloatMapping - Progress repeats a value: ' + p.join(', '));
    }
    if (curr < prev) {
      wraps++;
      if (wraps > 1) {
        throw new Error('FloatMapping - Progress wraps more than once: ' + p.join(', '));
      }
    }
    prev = curr;
  }
}

/** Distance between two progress values; progress wraps, so 0.99 apart is 0.01. */
export function progressDistance(p1: number, p2: number): number {
  const it = Math.abs(f32(p1 - p2));
  return Math.min(it, f32(1 - it));
}
