/*
 * Ported by hand from androidx/graphics/graphics-shapes PolygonMeasure.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import type {Cubic} from './cubic.js';
import {Corner, type Feature} from './features.js';
import {Point} from './point.js';
import type {RoundedPolygon} from './rounded-polygon.js';
import {DistanceEpsilon, f32, positiveModulo} from './utils.js';

// Kotlin Float math throughout: see point.ts.

/** A feature and its outline progress, in [0..1). */
export interface ProgressableFeature {
  readonly progress: number;
  readonly feature: Feature;
}

/**
 * Measures a cubic. Implementations can use any measure (angle, length...)
 * as long as it is never negative.
 */
export interface Measurer {
  /** Size of the cubic; greater or equal to 0. */
  measureCubic(c: Cubic): number;
  /**
   * The parameter t of the cubic at which the measure `m` (between 0 and
   * measureCubic(c), capped otherwise) is reached.
   */
  findCubicCutPoint(c: Cubic, m: number): number;
}

/**
 * Approximates the arc length of a cubic by splitting it into segments and
 * adding their lengths. Three segments give at least 98.5% accuracy on a
 * circular arc, the worst case for the standard shapes.
 */
export class LengthMeasurer implements Measurer {
  // The minimum needed for 98.5% accuracy; see PolygonMeasureTest.measureCircle.
  private readonly segments = 3;

  measureCubic(c: Cubic): number {
    return this.closestProgressTo(c, Number.POSITIVE_INFINITY)[1];
  }

  findCubicCutPoint(c: Cubic, m: number): number {
    return this.closestProgressTo(c, m)[0];
  }

  private closestProgressTo(cubic: Cubic, threshold: number): [number, number] {
    let total = 0;
    let remainder = threshold;
    let prev = new Point(cubic.anchor0X, cubic.anchor0Y);

    for (let i = 1; i <= this.segments; i++) {
      const progress = f32(i / this.segments);
      const point = cubic.pointOnCurve(progress);
      const segment = point.minus(prev).getDistance();

      if (segment >= remainder) {
        return [f32(progress - f32(f32(1 - f32(remainder / segment)) / this.segments)), threshold];
      }

      remainder = f32(remainder - segment);
      total = f32(total + segment);
      prev = point;
    }

    return [1, total];
  }
}

/**
 * A cubic, its measured size and its outline progress range. Morph matches
 * cubics of two shapes that sit at similar outline progress (after mapping
 * features and shifting). Outline progress, in [0..1), is the distance
 * travelled along the whole outline.
 */
export class MeasuredCubic {
  readonly measuredSize: number;
  private _startOutlineProgress: number;
  private _endOutlineProgress: number;

  constructor(
    private readonly measurer: Measurer,
    readonly cubic: Cubic,
    startOutlineProgress: number,
    endOutlineProgress: number,
  ) {
    if (!(endOutlineProgress >= startOutlineProgress)) {
      throw new Error(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this.measuredSize = measurer.measureCubic(cubic);
    this._startOutlineProgress = f32(startOutlineProgress);
    this._endOutlineProgress = f32(endOutlineProgress);
  }

  get startOutlineProgress() {
    return this._startOutlineProgress;
  }

  get endOutlineProgress() {
    return this._endOutlineProgress;
  }

  updateProgressRange(
    startOutlineProgress = this._startOutlineProgress,
    endOutlineProgress = this._endOutlineProgress,
  ) {
    if (!(endOutlineProgress >= startOutlineProgress)) {
      throw new Error(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this._startOutlineProgress = f32(startOutlineProgress);
    this._endOutlineProgress = f32(endOutlineProgress);
  }

  /** Cuts this into two measured cubics at the given outline progress. */
  cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
    // Float errors further up can put the cut just outside this cubic's
    // range, so clamp it to avoid more errors later.
    const boundedCutOutlineProgress = Math.min(
      Math.max(f32(cutOutlineProgress), this._startOutlineProgress),
      this._endOutlineProgress,
    );
    const outlineProgressSize = f32(this._endOutlineProgress - this._startOutlineProgress);
    const progressFromStart = f32(boundedCutOutlineProgress - this._startOutlineProgress);

    // Empty measured cubics (size 0) exist earlier on, but are filtered out
    // before this is called.
    const relativeProgress = f32(progressFromStart / outlineProgressSize);
    const t = this.measurer.findCubicCutPoint(
      this.cubic,
      f32(relativeProgress * this.measuredSize),
    );
    if (!(t >= 0 && t <= 1)) throw new Error('Cubic cut point is expected to be between 0 and 1');

    const [c1, c2] = this.cubic.split(t);
    return [
      new MeasuredCubic(this.measurer, c1, this._startOutlineProgress, boundedCutOutlineProgress),
      new MeasuredCubic(this.measurer, c2, boundedCutOutlineProgress, this._endOutlineProgress),
    ];
  }

  toString(): string {
    return (
      `MeasuredCubic(outlineProgress=[${this._startOutlineProgress} .. ${this._endOutlineProgress}], ` +
      `size=${this.measuredSize}, cubic=${this.cubic})`
    );
  }
}

/** A polygon's cubics with their outline progress, and its corner features. */
export class MeasuredPolygon {
  private readonly cubics: MeasuredCubic[];

  private constructor(
    private readonly measurer: Measurer,
    readonly features: readonly ProgressableFeature[],
    cubics: readonly Cubic[],
    outlineProgress: readonly number[],
  ) {
    if (outlineProgress.length !== cubics.length + 1) {
      throw new Error('Outline progress size is expected to be the cubics size + 1');
    }
    if (outlineProgress[0] !== 0) {
      throw new Error('First outline progress value is expected to be zero');
    }
    if (outlineProgress[outlineProgress.length - 1] !== 1) {
      throw new Error('Last outline progress value is expected to be one');
    }

    const measuredCubics: MeasuredCubic[] = [];
    let startOutlineProgress = 0;
    for (let index = 0; index < cubics.length; index++) {
      // Filter out "empty" cubics.
      if (f32(outlineProgress[index + 1] - outlineProgress[index]) > DistanceEpsilon) {
        measuredCubics.push(
          new MeasuredCubic(
            measurer,
            cubics[index],
            startOutlineProgress,
            outlineProgress[index + 1],
          ),
        );
        // The next measured cubic starts exactly where this one ends.
        startOutlineProgress = outlineProgress[index + 1];
      }
    }
    if (measuredCubics.length === 0) throw new RangeError('Index -1 out of bounds for length 0');
    // Empty cubics at the end may have been removed. Make sure the last one ends at 1.
    measuredCubics[measuredCubics.length - 1].updateProgressRange(undefined, 1);
    this.cubics = measuredCubics;
  }

  get size() {
    return this.cubics.length;
  }

  get(index: number): MeasuredCubic {
    const c = this.cubics[index];
    if (!c) throw new RangeError(`Index ${index} out of bounds for length ${this.cubics.length}`);
    return c;
  }

  /** Kotlin's getOrNull. */
  getOrNull(index: number): MeasuredCubic | null {
    return this.cubics[index] ?? null;
  }

  [Symbol.iterator]() {
    return this.cubics[Symbol.iterator]();
  }

  /**
   * Finds the cubic that crosses the given outline progress and returns an
   * equivalent MeasuredPolygon that starts there, cutting that cubic unless
   * the cut falls on one of its ends.
   *
   * With cubics c1 [0 -> 0.2], c2 [0.2 -> 0.5], c3 [0.5 -> 1] and a cut at
   * 0.4, c2 is cut into c2a [0.2 -> 0.4] and c2b [0.4 -> 0.5], and the result
   * is c2b [0 -> 0.1], c3 [0.1 -> 0.6], c1 [0.6 -> 0.8], c2a [0.8 -> 1].
   */
  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    cuttingPoint = f32(cuttingPoint);
    if (!(cuttingPoint >= 0 && cuttingPoint <= 1)) {
      throw new Error('Cutting point is expected to be between 0 and 1');
    }
    if (cuttingPoint < DistanceEpsilon) return this;

    // Find the index of the cubic to cut.
    const targetIndex = this.cubics.findIndex(
      (it) => cuttingPoint >= it.startOutlineProgress && cuttingPoint <= it.endOutlineProgress,
    );
    const target = this.get(targetIndex);
    // b1, b2 are the two cubics after the cut.
    const [b1, b2] = target.cutAtProgress(cuttingPoint);

    // The cubics we need: the part of the target after the cut, every cubic
    // after the target round to the one before it, and the part of the
    // target before the cut.
    const n = this.cubics.length;
    const retCubics: Cubic[] = [b2.cubic];
    for (let i = 1; i < n; i++) {
      retCubics.push(this.cubics[(i + targetIndex) % n].cubic);
    }
    retCubics.push(b1.cubic);

    // The outline progress. With cubics [0 .. 0.3], [0.3 .. 0.8], [0.8 .. 1]
    // and a cut at 0.6 this is 0 (the cut), 0.8 - 0.6 = 0.2, 1 - 0.6 = 0.4,
    // 0.3 - 0.6 + 1 = 0.7, then 1 (the cut again).
    const retOutlineProgress: number[] = [];
    for (let index = 0; index < n + 2; index++) {
      if (index === 0) {
        retOutlineProgress.push(0);
      } else if (index === n + 1) {
        retOutlineProgress.push(1);
      } else {
        const cubicIndex = (targetIndex + index - 1) % n;
        retOutlineProgress.push(
          positiveModulo(f32(this.cubics[cubicIndex].endOutlineProgress - cuttingPoint), 1),
        );
      }
    }

    // Shift the features' outline progress too.
    const newFeatures: ProgressableFeature[] = this.features.map((f) => ({
      progress: positiveModulo(f32(f.progress - cuttingPoint), 1),
      feature: f.feature,
    }));

    // The constructor filters out empty cubics (start and end anchor (almost) the same).
    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
  }

  static measurePolygon(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = [];
    const featureToCubic: Array<[Feature, number]> = [];

    // Take the polygon's cubics and, for each corner, remember the
    // representative (middle) cubic.
    for (const feature of polygon.features) {
      for (let cubicIndex = 0; cubicIndex < feature.cubics.length; cubicIndex++) {
        if (feature instanceof Corner && cubicIndex === Math.trunc(feature.cubics.length / 2)) {
          featureToCubic.push([feature, cubics.length]);
        }
        cubics.push(feature.cubics[cubicIndex]);
      }
    }

    const measures: number[] = [0];
    for (const cubic of cubics) {
      const m = measurer.measureCubic(cubic);
      if (!(m >= 0)) throw new Error('Measured cubic is expected to be greater or equal to zero');
      measures.push(f32(measures[measures.length - 1] + m));
    }
    const totalMeasure = measures[measures.length - 1];
    const outlineProgress = measures.map((m) => f32(m / totalMeasure));

    const features: ProgressableFeature[] = featureToCubic.map(([feature, ix]) => ({
      progress: positiveModulo(f32(f32(outlineProgress[ix] + outlineProgress[ix + 1]) / 2), 1),
      feature,
    }));

    return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
  }
}
