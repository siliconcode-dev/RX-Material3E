/*
 * Ported by hand from androidx/graphics/graphics-shapes Cubic.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {interpolate, Point, type PointTransformer} from './point.js';
import {convex, directionVector, distance, DistanceEpsilon} from './utils.js';

const inUnitRange = (t: number) => t >= 0 && t <= 1;

/**
 * One cubic Bézier curve: anchor points (anchor0X, anchor0Y) and
 * (anchor1X, anchor1Y) at either end, and control points (control0X,
 * control0Y) and (control1X, control1Y) shaping the curve between them.
 */
export class Cubic {
  /** anchor0, control0, control1, anchor1 as x, y pairs. */
  readonly points: number[];

  constructor(points: ArrayLike<number> = new Array<number>(8).fill(0)) {
    if (points.length !== 8) throw new Error('Points array size should be 8');
    this.points = Array.from(points);
  }

  static fromPoints(anchor0: Point, control0: Point, control1: Point, anchor1: Point): Cubic {
    return new Cubic([
      anchor0.x,
      anchor0.y,
      control0.x,
      control0.y,
      control1.x,
      control1.y,
      anchor1.x,
      anchor1.y,
    ]);
  }

  static of(
    anchor0X: number,
    anchor0Y: number,
    control0X: number,
    control0Y: number,
    control1X: number,
    control1Y: number,
    anchor1X: number,
    anchor1Y: number,
  ): Cubic {
    return new Cubic([
      anchor0X,
      anchor0Y,
      control0X,
      control0Y,
      control1X,
      control1Y,
      anchor1X,
      anchor1Y,
    ]);
  }

  get anchor0X() {
    return this.points[0];
  }
  get anchor0Y() {
    return this.points[1];
  }
  get control0X() {
    return this.points[2];
  }
  get control0Y() {
    return this.points[3];
  }
  get control1X() {
    return this.points[4];
  }
  get control1Y() {
    return this.points[5];
  }
  get anchor1X() {
    return this.points[6];
  }
  get anchor1Y() {
    return this.points[7];
  }

  /**
   * The point at parameter `t` along the curve: 0 is anchor0, 1 is anchor1.
   */
  pointOnCurve(t: number): Point {
    const u = 1 - t;
    return new Point(
      this.anchor0X * (u * u * u) +
        this.control0X * (3 * t * u * u) +
        this.control1X * (3 * t * t * u) +
        this.anchor1X * (t * t * t),
      this.anchor0Y * (u * u * u) +
        this.control0Y * (3 * t * u * u) +
        this.control1Y * (3 * t * t * u) +
        this.anchor1Y * (t * t * t),
    );
  }

  zeroLength(): boolean {
    return (
      Math.abs(this.anchor0X - this.anchor1X) < DistanceEpsilon &&
      Math.abs(this.anchor0Y - this.anchor1Y) < DistanceEpsilon
    );
  }

  convexTo(next: Cubic): boolean {
    const prevVertex = new Point(this.anchor0X, this.anchor0Y);
    const currVertex = new Point(this.anchor1X, this.anchor1Y);
    const nextVertex = new Point(next.anchor1X, next.anchor1Y);
    return convex(prevVertex, currVertex, nextVertex);
  }

  private zeroIsh(value: number) {
    return Math.abs(value) < DistanceEpsilon;
  }

  /**
   * Fills `bounds` with the curve's axis-aligned bounding box: left, top,
   * right, bottom. With `approximate`, uses the box around all anchor and
   * control points instead of the true extremes.
   */
  calculateBounds(bounds: number[] = [0, 0, 0, 0], approximate = false): number[] {
    // A curve might be of zero length, with both anchors at the same place.
    if (this.zeroLength()) {
      bounds[0] = this.anchor0X;
      bounds[1] = this.anchor0Y;
      bounds[2] = this.anchor0X;
      bounds[3] = this.anchor0Y;
      return bounds;
    }

    let minX = Math.min(this.anchor0X, this.anchor1X);
    let minY = Math.min(this.anchor0Y, this.anchor1Y);
    let maxX = Math.max(this.anchor0X, this.anchor1X);
    let maxY = Math.max(this.anchor0Y, this.anchor1Y);

    if (approximate) {
      bounds[0] = Math.min(minX, Math.min(this.control0X, this.control1X));
      bounds[1] = Math.min(minY, Math.min(this.control0Y, this.control1Y));
      bounds[2] = Math.max(maxX, Math.max(this.control0X, this.control1X));
      bounds[3] = Math.max(maxY, Math.max(this.control0Y, this.control1Y));
      return bounds;
    }

    // The derivative is a quadratic Bézier; solve it for t with the quadratic formula.
    const xa = -this.anchor0X + 3 * this.control0X - 3 * this.control1X + this.anchor1X;
    const xb = 2 * this.anchor0X - 4 * this.control0X + 2 * this.control1X;
    const xc = -this.anchor0X + this.control0X;

    const includeX = (t: number) => {
      if (!inUnitRange(t)) return;
      const x = this.pointOnCurve(t).x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    };
    if (this.zeroIsh(xa)) {
      // Muller's method finds the single root when a is 0.
      if (xb !== 0) includeX((2 * xc) / (-2 * xb));
    } else {
      const xs = xb * xb - 4 * xa * xc;
      if (xs >= 0) {
        includeX((-xb + Math.sqrt(xs)) / (2 * xa));
        includeX((-xb - Math.sqrt(xs)) / (2 * xa));
      }
    }

    // Repeat for y.
    const ya = -this.anchor0Y + 3 * this.control0Y - 3 * this.control1Y + this.anchor1Y;
    const yb = 2 * this.anchor0Y - 4 * this.control0Y + 2 * this.control1Y;
    const yc = -this.anchor0Y + this.control0Y;

    const includeY = (t: number) => {
      if (!inUnitRange(t)) return;
      const y = this.pointOnCurve(t).y;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };
    if (this.zeroIsh(ya)) {
      if (yb !== 0) includeY((2 * yc) / (-2 * yb));
    } else {
      const ys = yb * yb - 4 * ya * yc;
      if (ys >= 0) {
        includeY((-yb + Math.sqrt(ys)) / (2 * ya));
        includeY((-yb - Math.sqrt(ys)) / (2 * ya));
      }
    }

    bounds[0] = minX;
    bounds[1] = minY;
    bounds[2] = maxX;
    bounds[3] = maxY;
    return bounds;
  }

  /** Splits the curve at parameter `t` into two curves. */
  split(t: number): [Cubic, Cubic] {
    const u = 1 - t;
    const p = this.pointOnCurve(t);
    return [
      Cubic.of(
        this.anchor0X,
        this.anchor0Y,
        this.anchor0X * u + this.control0X * t,
        this.anchor0Y * u + this.control0Y * t,
        this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
        this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
        p.x,
        p.y,
      ),
      Cubic.of(
        p.x,
        p.y,
        this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
        this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
        this.control1X * u + this.anchor1X * t,
        this.control1Y * u + this.anchor1Y * t,
        this.anchor1X,
        this.anchor1Y,
      ),
    ];
  }

  /** The same curve, drawn from the other end. */
  reverse(): Cubic {
    return Cubic.of(
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    );
  }

  plus(o: Cubic): Cubic {
    return new Cubic(this.points.map((v, i) => v + o.points[i]));
  }

  times(x: number): Cubic {
    return new Cubic(this.points.map((v) => v * x));
  }

  div(x: number): Cubic {
    return this.times(1 / x);
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof Cubic)) return false;
    return this.points.every((v, i) => v === other.points[i]);
  }

  /** A new curve with every point passed through `f`. */
  transformed(f: PointTransformer): Cubic {
    const newCubic = new MutableCubic();
    for (let i = 0; i < 8; i++) newCubic.points[i] = this.points[i];
    newCubic.transform(f);
    return newCubic;
  }

  toString(): string {
    return (
      `anchor0: (${this.anchor0X}, ${this.anchor0Y}) control0: (${this.control0X}, ${this.control0Y}), ` +
      `control1: (${this.control1X}, ${this.control1Y}), anchor1: (${this.anchor1X}, ${this.anchor1Y})`
    );
  }

  /**
   * A straight line between two anchors, with the control points 1/3 of the
   * way from each anchor.
   */
  static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
    return Cubic.of(
      x0,
      y0,
      interpolate(x0, x1, 1 / 3),
      interpolate(y0, y1, 1 / 3),
      interpolate(x0, x1, 2 / 3),
      interpolate(y0, y1, 2 / 3),
      x1,
      y1,
    );
  }

  /**
   * A curve approximating a circular arc from (x0, y0) to (x1, y1) around
   * (centerX, centerY), taking the smaller of the two possible arcs. Arcs over
   * 180 degrees need more than one curve. Both points should be the same
   * distance from the center.
   */
  static circularArc(
    centerX: number,
    centerY: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): Cubic {
    const p0d = directionVector(x0 - centerX, y0 - centerY);
    const p1d = directionVector(x1 - centerX, y1 - centerY);
    const rotatedP0 = p0d.rotate90();
    const rotatedP1 = p1d.rotate90();
    const clockwise = rotatedP0.dotProductXY(x1 - centerX, y1 - centerY) >= 0;
    const cosa = p0d.dotProduct(p1d);
    if (cosa > 0.999) /* p0 ~= p1 */ return Cubic.straightLine(x0, y0, x1, y1);
    const k =
      ((((distance(x0 - centerX, y0 - centerY) * 4) / 3) *
        (Math.sqrt(2 * (1 - cosa)) - Math.sqrt(1 - cosa * cosa))) /
        (1 - cosa)) *
      (clockwise ? 1 : -1);
    return Cubic.of(
      x0,
      y0,
      x0 + rotatedP0.x * k,
      y0 + rotatedP0.y * k,
      x1 - rotatedP1.x * k,
      y1 - rotatedP1.y * k,
      x1,
      y1,
    );
  }

  /** A zero-length curve at (x0, y0). */
  static empty(x0: number, y0: number): Cubic {
    return Cubic.of(x0, y0, x0, y0, x0, y0, x0, y0);
  }
}

/**
 * A mutable Cubic for hot paths (such as drawing a morph every frame) that
 * should not allocate new curves.
 */
export class MutableCubic extends Cubic {
  private transformOnePoint(f: PointTransformer, ix: number) {
    const [x, y] = f(this.points[ix], this.points[ix + 1]);
    this.points[ix] = x;
    this.points[ix + 1] = y;
  }

  transform(f: PointTransformer) {
    this.transformOnePoint(f, 0);
    this.transformOnePoint(f, 2);
    this.transformOnePoint(f, 4);
    this.transformOnePoint(f, 6);
  }

  interpolate(c1: Cubic, c2: Cubic, progress: number) {
    for (let i = 0; i < 8; i++) {
      this.points[i] = interpolate(c1.points[i], c2.points[i], progress);
    }
  }
}
