/*
 * Ported by hand from androidx/graphics/graphics-shapes RoundedPolygon.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Kotlin's overloaded RoundedPolygon(...) factory functions are the static
 * methods fromNumVertices, fromVertices, fromFeatures and copy.
 */

import {CornerRounding} from './corner-rounding.js';
import {Cubic} from './cubic.js';
import {Corner, Edge, type Feature} from './features.js';
import {interpolatePoint, Point, type PointTransformer} from './point.js';
import {
  convex,
  directionVector,
  distance,
  distanceSquared,
  DistanceEpsilon,
  FloatPi,
  radialToCartesian,
  square,
} from './utils.js';

// Kotlin's Float.MIN_VALUE is the smallest *positive* float, not the most
// negative one. RoundedPolygon uses it as a "no center given" marker and as
// the starting max in calculateBounds; Number.MIN_VALUE behaves the same way.
const MIN_VALUE = Number.MIN_VALUE;
const MAX_VALUE = Number.MAX_VALUE;

export interface NumVerticesOptions {
  /** Distance of each vertex from the center. Defaults to 1. */
  radius?: number;
  centerX?: number;
  centerY?: number;
  /** Rounding for every vertex. Defaults to unrounded. */
  rounding?: CornerRounding;
  /** Rounding per vertex; overrides `rounding`. Must have one entry per vertex. */
  perVertexRounding?: readonly CornerRounding[] | null;
}

export interface VerticesOptions {
  rounding?: CornerRounding;
  perVertexRounding?: readonly CornerRounding[] | null;
  /** Center; estimated from the vertices when left out. */
  centerX?: number;
  centerY?: number;
}

/**
 * A polygon with optionally rounded corners, built from a vertex count or an
 * ordered list of vertices. Its outline is a closed loop of cubic curves,
 * grouped into features (edges and corners).
 */
export class RoundedPolygon {
  /** A flattened version of the features. */
  readonly cubics: readonly Cubic[];

  constructor(
    readonly features: readonly Feature[],
    readonly center: Point,
  ) {
    this.cubics = flattenFeatures(features, center);

    let prevCubic = this.cubics[this.cubics.length - 1];
    for (const cubic of this.cubics) {
      if (
        Math.abs(cubic.anchor0X - prevCubic.anchor1X) > DistanceEpsilon ||
        Math.abs(cubic.anchor0Y - prevCubic.anchor1Y) > DistanceEpsilon
      ) {
        throw new Error(
          'RoundedPolygon must be contiguous, with the anchor points of all curves ' +
            'matching the anchor points of the preceding and succeeding cubics',
        );
      }
      prevCubic = cubic;
    }
  }

  get centerX(): number {
    return this.center.x;
  }

  get centerY(): number {
    return this.center.y;
  }

  /**
   * A regular polygon with `numVertices` vertices equally spaced on a circle of
   * `radius` (default 1, so the shape is 2 wide) around the center (default
   * 0,0). Rescale it with {@link transformed} for display.
   *
   * @throws if numVertices is under 3, or perVertexRounding has the wrong length.
   */
  static fromNumVertices(numVertices: number, options: NumVerticesOptions = {}): RoundedPolygon {
    const {
      radius = 1,
      centerX = 0,
      centerY = 0,
      rounding = CornerRounding.Unrounded,
      perVertexRounding = null,
    } = options;
    return RoundedPolygon.fromVertices(
      verticesFromNumVerts(numVertices, radius, centerX, centerY),
      {
        rounding,
        perVertexRounding,
        centerX,
        centerY,
      },
    );
  }

  /**
   * A polygon through `vertices` (x, y pairs, in outline order), with each
   * vertex rounded as specified.
   *
   * @throws for fewer than 3 vertices, an odd-length array, or a
   *   perVertexRounding list of the wrong length.
   */
  static fromVertices(vertices: ArrayLike<number>, options: VerticesOptions = {}): RoundedPolygon {
    const {
      rounding = CornerRounding.Unrounded,
      perVertexRounding = null,
      centerX = MIN_VALUE,
      centerY = MIN_VALUE,
    } = options;
    if (vertices.length < 6) {
      throw new Error('Polygons must have at least 3 vertices');
    }
    if (vertices.length % 2 === 1) {
      throw new Error('The vertices array should have even size');
    }
    if (perVertexRounding != null && perVertexRounding.length * 2 !== vertices.length) {
      throw new Error(
        'perVertexRounding list should be either null or ' +
          'the same size as the number of vertices (vertices.size / 2)',
      );
    }
    const corners: Cubic[][] = [];
    const n = vertices.length / 2;
    const roundedCorners: RoundedCorner[] = [];
    for (let i = 0; i < n; i++) {
      const vtxRounding = perVertexRounding?.[i] ?? rounding;
      const prevIndex = ((i + n - 1) % n) * 2;
      const nextIndex = ((i + 1) % n) * 2;
      roundedCorners.push(
        new RoundedCorner(
          new Point(vertices[prevIndex], vertices[prevIndex + 1]),
          new Point(vertices[i * 2], vertices[i * 2 + 1]),
          new Point(vertices[nextIndex], vertices[nextIndex + 1]),
          vtxRounding,
        ),
      );
    }

    // For each side (from corner i to corner i+1), check there is room for the
    // cuts both corners want. If not, split the space: first for the round
    // cuts, then for smoothing if any is left. Each entry is [how much of
    // expectedRoundCut we can use, how much of expectedCut].
    const cutAdjusts: [number, number][] = [];
    for (let ix = 0; ix < n; ix++) {
      const expectedRoundCut =
        roundedCorners[ix].expectedRoundCut + roundedCorners[(ix + 1) % n].expectedRoundCut;
      const expectedCut = roundedCorners[ix].expectedCut + roundedCorners[(ix + 1) % n].expectedCut;
      const vtxX = vertices[ix * 2];
      const vtxY = vertices[ix * 2 + 1];
      const nextVtxX = vertices[((ix + 1) % n) * 2];
      const nextVtxY = vertices[((ix + 1) % n) * 2 + 1];
      const sideSize = distance(vtxX - nextVtxX, vtxY - nextVtxY);

      // Rounding for both corners comes before any space for smoothing.
      if (expectedRoundCut > sideSize) {
        // Not enough room for full rounding: see how much we can do.
        cutAdjusts.push([sideSize / expectedRoundCut, 0]);
      } else if (expectedCut > sideSize) {
        // Full rounding, but not full smoothing.
        cutAdjusts.push([1, (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut)]);
      } else {
        // Room for rounding and smoothing.
        cutAdjusts.push([1, 1]);
      }
    }

    // The curves for each (possibly) rounded corner.
    for (let i = 0; i < n; i++) {
      // allowedCuts[0] is for the side from the previous corner to this one,
      // allowedCuts[1] for the side from this corner to the next.
      const allowedCuts: number[] = [];
      for (let delta = 0; delta <= 1; delta++) {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n];
        allowedCuts.push(
          roundedCorners[i].expectedRoundCut * roundCutRatio +
            (roundedCorners[i].expectedCut - roundedCorners[i].expectedRoundCut) * cutRatio,
        );
      }
      corners.push(roundedCorners[i].getCubics(allowedCuts[0], allowedCuts[1]));
    }

    // The rounded corners, with straight edges between them.
    const tempFeatures: Feature[] = [];
    for (let i = 0; i < n; i++) {
      const prevVtxIndex = (i + n - 1) % n;
      const nextVtxIndex = (i + 1) % n;
      const currVertex = new Point(vertices[i * 2], vertices[i * 2 + 1]);
      const prevVertex = new Point(vertices[prevVtxIndex * 2], vertices[prevVtxIndex * 2 + 1]);
      const nextVertex = new Point(vertices[nextVtxIndex * 2], vertices[nextVtxIndex * 2 + 1]);
      const isConvex = convex(prevVertex, currVertex, nextVertex);
      tempFeatures.push(new Corner(corners[i], isConvex));
      const last = corners[i][corners[i].length - 1];
      const next = corners[(i + 1) % n][0];
      tempFeatures.push(
        new Edge([Cubic.straightLine(last.anchor1X, last.anchor1Y, next.anchor0X, next.anchor0Y)]),
      );
    }

    const c =
      centerX === MIN_VALUE || centerY === MIN_VALUE
        ? calculateCenter(vertices)
        : new Point(centerX, centerY);
    return RoundedPolygon.fromFeatures(tempFeatures, {centerX: c.x, centerY: c.y});
  }

  /**
   * A polygon from its features, for precise control over how its cubics are
   * grouped. That grouping drives Morph's default mapping, which matches
   * convex to convex and concave to concave. The center is the average of all
   * anchor points unless given.
   *
   * @throws for fewer than 2 features, or features that don't form a closed shape.
   */
  static fromFeatures(
    features: readonly Feature[],
    options: {centerX?: number; centerY?: number} = {},
  ): RoundedPolygon {
    const {centerX = NaN, centerY = NaN} = options;
    if (features.length < 2) throw new Error('Polygons must have at least 2 features');
    const vertices: number[] = [];
    for (const feature of features) {
      for (const cubic of feature.cubics) {
        vertices.push(cubic.anchor0X, cubic.anchor0Y);
      }
    }
    const cX = Number.isNaN(centerX) ? calculateCenter(vertices).x : centerX;
    const cY = Number.isNaN(centerY) ? calculateCenter(vertices).y : centerY;
    return new RoundedPolygon(features, new Point(cX, cY));
  }

  /** A copy of `source`. */
  static copy(source: RoundedPolygon): RoundedPolygon {
    return new RoundedPolygon(source.features, source.center);
  }

  /**
   * A copy with every point (and the center) passed through `f`, e.g. to
   * scale, rotate or move it.
   */
  transformed(f: PointTransformer): RoundedPolygon {
    const center = this.center.transformed(f);
    return new RoundedPolygon(
      this.features.map((feature) => feature.transformed(f)),
      center,
    );
  }

  /**
   * A copy moved and resized to fit inside the (0, 0) to (1, 1) square,
   * centered along the shorter side.
   */
  normalized(): RoundedPolygon {
    const bounds = this.calculateBounds();
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    const side = Math.max(width, height);
    // Center the shape if the bounds are not square.
    const offsetX = (side - width) / 2 - bounds[0]; /* left */
    const offsetY = (side - height) / 2 - bounds[1]; /* top */
    return this.transformed((x, y) => [(x + offsetX) / side, (y + offsetY) / side]);
  }

  /**
   * A square around the center big enough to hold the shape at any rotation,
   * from the distance of each curve's start and midpoint to the center.
   * Returns left, top, right, bottom.
   */
  calculateMaxBounds(bounds: number[] = [0, 0, 0, 0]): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4');
    let maxDistSquared = 0;
    for (const cubic of this.cubics) {
      const anchorDistance = distanceSquared(
        cubic.anchor0X - this.centerX,
        cubic.anchor0Y - this.centerY,
      );
      const middlePoint = cubic.pointOnCurve(0.5);
      const middleDistance = distanceSquared(
        middlePoint.x - this.centerX,
        middlePoint.y - this.centerY,
      );
      maxDistSquared = Math.max(maxDistSquared, Math.max(anchorDistance, middleDistance));
    }
    const d = Math.sqrt(maxDistSquared);
    bounds[0] = this.centerX - d;
    bounds[1] = this.centerY - d;
    bounds[2] = this.centerX + d;
    bounds[3] = this.centerY + d;
    return bounds;
  }

  /**
   * The axis-aligned bounds: left, top, right, bottom. `approximate` (the
   * default) uses the faster box around all anchor and control points.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = true): number[] {
    if (bounds.length < 4) throw new Error('Required bounds size of 4');
    let minX = MAX_VALUE;
    let minY = MAX_VALUE;
    let maxX = MIN_VALUE;
    let maxY = MIN_VALUE;
    for (const cubic of this.cubics) {
      cubic.calculateBounds(bounds, approximate);
      minX = Math.min(minX, bounds[0]);
      minY = Math.min(minY, bounds[1]);
      maxX = Math.max(maxX, bounds[2]);
      maxY = Math.max(maxY, bounds[3]);
    }
    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
    return bounds;
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof RoundedPolygon)) return false;
    return (
      this.features.length === other.features.length &&
      this.features.every((f, i) => f === other.features[i])
    );
  }

  toString(): string {
    return (
      '[RoundedPolygon. Cubics = ' +
      this.cubics.join(', ') +
      ' || Features = ' +
      this.features.join(', ') +
      ` || Center = (${this.centerX}, ${this.centerY})]`
    );
  }
}

/**
 * Flattens features into one closed list of cubics. The first and last
 * cubics are tied so the final anchor exactly matches the first one; being
 * off by even a fraction of a pixel can show as a rendering artifact.
 */
function flattenFeatures(features: readonly Feature[], center: Point): Cubic[] {
  const result: Cubic[] = [];
  let firstCubic: Cubic | null = null;
  let lastCubic: Cubic | null = null;
  let firstFeatureSplitStart: Cubic[] | null = null;
  let firstFeatureSplitEnd: Cubic[] | null = null;
  if (features.length > 0 && features[0].cubics.length === 3) {
    const centerCubic = features[0].cubics[1];
    const [start, end] = centerCubic.split(0.5);
    firstFeatureSplitStart = [features[0].cubics[0], start];
    firstFeatureSplitEnd = [end, features[0].cubics[2]];
  }
  // Going one past the end lets the split first corner close the loop.
  for (let i = 0; i <= features.length; i++) {
    let featureCubics: readonly Cubic[];
    if (i === 0 && firstFeatureSplitEnd !== null) {
      featureCubics = firstFeatureSplitEnd;
    } else if (i === features.length) {
      if (firstFeatureSplitStart !== null) featureCubics = firstFeatureSplitStart;
      else break;
    } else {
      featureCubics = features[i].cubics;
    }
    for (const cubic of featureCubics) {
      // Skip zero-length curves: they add nothing and can cause rendering artifacts.
      if (!cubic.zeroLength()) {
        if (lastCubic !== null) result.push(lastCubic);
        lastCubic = cubic;
        if (firstCubic === null) firstCubic = cubic;
      } else if (lastCubic !== null) {
        // Dropping several near-zero curves in a row can add up to a gap that
        // fails the continuity check, so the last cubic always takes the latest
        // anchor point. Copy before changing it.
        lastCubic = new Cubic(lastCubic.points);
        lastCubic.points[6] = cubic.anchor1X;
        lastCubic.points[7] = cubic.anchor1Y;
      }
    }
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
  } else {
    // Empty or zero-sized polygon.
    result.push(
      Cubic.of(center.x, center.y, center.x, center.y, center.x, center.y, center.x, center.y),
    );
  }
  return result;
}

/**
 * Estimated center: the average of all vertices. Only used when no center is
 * given; the numVertices constructor knows its center exactly.
 */
export function calculateCenter(vertices: ArrayLike<number>): Point {
  let cumulativeX = 0;
  let cumulativeY = 0;
  let index = 0;
  while (index < vertices.length) {
    cumulativeX += vertices[index++];
    cumulativeY += vertices[index++];
  }
  return new Point(cumulativeX / (vertices.length / 2), cumulativeY / (vertices.length / 2));
}

/**
 * One corner of a polygon. Without rounding it is a single point at `p1`;
 * with rounding it is a circular arc, or with smoothing an arc between two
 * symmetric flanking curves.
 *
 * Work happens in two steps: first how much this corner wants to cut into its
 * sides, then (once the neighbours are known) how much it may actually cut.
 */
class RoundedCorner {
  readonly d1: Point;
  readonly d2: Point;
  readonly cornerRadius: number;
  readonly smoothing: number;
  readonly cosAngle: number;
  readonly sinAngle: number;
  readonly expectedRoundCut: number;

  /**
   * The center of the rounding circle (or of the middle curve when smoothing).
   * Same as p1 when there is no rounding.
   */
  center = new Point(0, 0);

  constructor(
    readonly p0: Point,
    readonly p1: Point,
    readonly p2: Point,
    readonly rounding: CornerRounding | null = null,
  ) {
    const v01 = p0.minus(p1);
    const v21 = p2.minus(p1);
    const d01 = v01.getDistance();
    const d21 = v21.getDistance();
    if (d01 > 0 && d21 > 0) {
      this.d1 = v01.div(d01);
      this.d2 = v21.div(d21);
      this.cornerRadius = rounding?.radius ?? 0;
      this.smoothing = rounding?.smoothing ?? 0;
      // Cosine of the angle at p1: dot product of the unit vectors to the other two vertices.
      this.cosAngle = this.d1.dotProduct(this.d2);
      // sin^2 + cos^2 = 1
      this.sinAngle = Math.sqrt(1 - square(this.cosAngle));
      // How far along each side to cut for the requested radius, from
      // tan(A/2) = sinA / (1 + cosA) and tan(A/2) = radius / cut.
      this.expectedRoundCut =
        this.sinAngle > 1e-3 ? (this.cornerRadius * (this.cosAngle + 1)) / this.sinAngle : 0;
    } else {
      // One or both sides are empty; not much to do.
      this.d1 = new Point(0, 0);
      this.d2 = new Point(0, 0);
      this.cornerRadius = 0;
      this.smoothing = 0;
      this.cosAngle = 0;
      this.sinAngle = 0;
      this.expectedRoundCut = 0;
    }
  }

  /** Smoothing lengthens the cut: 0 leaves expectedRoundCut, 1 doubles it. */
  get expectedCut(): number {
    return (1 + this.smoothing) * this.expectedRoundCut;
  }

  getCubics(allowedCut0: number, allowedCut1: number = allowedCut0): Cubic[] {
    // The smaller cut sets the radius; extra room on one side goes to smoothing.
    const allowedCut = Math.min(allowedCut0, allowedCut1);
    // Nothing to round: just a point.
    if (
      this.expectedRoundCut < DistanceEpsilon ||
      allowedCut < DistanceEpsilon ||
      this.cornerRadius < DistanceEpsilon
    ) {
      this.center = this.p1;
      return [Cubic.straightLine(this.p1.x, this.p1.y, this.p1.x, this.p1.y)];
    }

    // How much of the cut the rounding needs.
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut);
    // One smoothing value per side. Space goes to rounding first, then to
    // smoothing if any is left and smoothing was requested.
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0);
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1);
    // Scale the radius if needed.
    const actualR = (this.cornerRadius * actualRoundCut) / this.expectedRoundCut;
    // Distance from the corner (p1) to the arc's center.
    const centerDistance = Math.sqrt(square(actualR) + square(actualRoundCut));
    this.center = this.p1.plus(this.d1.plus(this.d2).div(2).getDirection().times(centerDistance));
    const circleIntersection0 = this.p1.plus(this.d1.times(actualRoundCut));
    const circleIntersection2 = this.p1.plus(this.d2.times(actualRoundCut));
    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      this.center,
      actualR,
    );
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      this.center,
      actualR,
    ).reverse();
    return [
      flanking0,
      Cubic.circularArc(
        this.center.x,
        this.center.y,
        flanking0.anchor1X,
        flanking0.anchor1Y,
        flanking2.anchor0X,
        flanking2.anchor0Y,
      ),
      flanking2,
    ];
  }

  /**
   * When the allowed cut is more than the round cut, the extra room goes to
   * smoothing, up to the requested amount.
   */
  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) {
      return this.smoothing;
    } else if (allowedCut > this.expectedRoundCut) {
      return (
        (this.smoothing * (allowedCut - this.expectedRoundCut)) /
        (this.expectedCut - this.expectedRoundCut)
      );
    } else {
      return 0;
    }
  }

  /**
   * A curve joining the straight side (from `sideStart` toward `corner`) to the
   * circular arc around `circleCenter` with radius `actualR`. It starts on the
   * side and ends on the circle.
   *
   * @param actualRoundCut How much is cut off the corner for the arc, before smoothing.
   * @param actualSmoothingValues The smoothing, reduced if there is not enough room.
   * @param circleSegmentIntersection Where this side meets the circle.
   * @param otherCircleSegmentIntersection Where the other side meets the circle.
   */
  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValues: number,
    corner: Point,
    sideStart: Point,
    circleSegmentIntersection: Point,
    otherCircleSegmentIntersection: Point,
    circleCenter: Point,
    actualR: number,
  ): Cubic {
    const sideDirection = sideStart.minus(corner).getDirection();
    const curveStart = corner.plus(
      sideDirection.times(actualRoundCut * (1 + actualSmoothingValues)),
    );
    // Cut away part of the circle section in proportion to 1 - smoothing: all
    // of it at smoothing 0, none at 1. (Upstream notes this can misbehave near
    // 180 degrees.)
    const p = interpolatePoint(
      circleSegmentIntersection,
      circleSegmentIntersection.plus(otherCircleSegmentIntersection).div(2),
      actualSmoothingValues,
    );
    // The flanking curve ends on the circle.
    const curveEnd = circleCenter.plus(
      directionVector(p.x - circleCenter.x, p.y - circleCenter.y).times(actualR),
    );
    // The control point on the circle side is where the circle's tangent at
    // curveEnd meets the straight side.
    const circleTangent = curveEnd.minus(circleCenter).rotate90();
    const anchorEnd =
      lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ??
      circleSegmentIntersection;
    // The start control point sits 2/3 of the way to it (a ratio from design tools).
    const anchorStart = curveStart.plus(anchorEnd.times(2)).div(3);
    return Cubic.fromPoints(curveStart, anchorStart, anchorEnd, curveEnd);
  }
}

/**
 * Where the line through p0 in direction d0 meets the line through p1 in
 * direction d1, or null if they don't meet.
 */
function lineIntersection(p0: Point, d0: Point, p1: Point, d1: Point): Point | null {
  const rotatedD1 = d1.rotate90();
  const den = d0.dotProduct(rotatedD1);
  if (Math.abs(den) < DistanceEpsilon) return null;
  const num = p1.minus(p0).dotProduct(rotatedD1);
  // Same as abs(den / num) < DistanceEpsilon, without the division.
  if (Math.abs(den) < DistanceEpsilon * Math.abs(num)) return null;
  const k = num / den;
  return p0.plus(d0.times(k));
}

function verticesFromNumVerts(
  numVertices: number,
  radius: number,
  centerX: number,
  centerY: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < numVertices; i++) {
    const vertex = radialToCartesian(radius, (FloatPi / numVertices) * 2 * i).plus(
      new Point(centerX, centerY),
    );
    result.push(vertex.x, vertex.y);
  }
  return result;
}
