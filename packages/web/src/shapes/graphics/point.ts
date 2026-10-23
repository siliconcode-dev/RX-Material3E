/*
 * Ported by hand from androidx/graphics/graphics-shapes Point.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Kotlin's Point is a FloatFloatPair with extension operators; here it is a
 * small immutable class with the same operations as methods.
 *
 * Kotlin does this math in 32-bit Floats. So does this port: coordinates
 * are stored as 32-bit values and every operation rounds its result with
 * Math.fround, in Kotlin's order. Shapes then come out bit for bit as on
 * Android, which matters wherever upstream compares or sorts numbers (Morph
 * picks which corners to pair by sorting distances, and symmetric shapes
 * have ties that only exact Float math breaks the same way).
 */

/** Rounds to a 32-bit float (Kotlin Float). */
export const f32 = Math.fround;

/** A 2D point or vector. Immutable. */
export class Point {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = f32(x);
    this.y = f32(y);
  }

  copy(x: number = this.x, y: number = this.y): Point {
    return new Point(x, y);
  }

  /** The distance of this point from (0, 0). */
  getDistance(): number {
    return f32(Math.sqrt(this.getDistanceSquared()));
  }

  /** The square of the distance from (0, 0). Cheaper than {@link getDistance}. */
  getDistanceSquared(): number {
    return f32(f32(this.x * this.x) + f32(this.y * this.y));
  }

  dotProduct(other: Point): number {
    return f32(f32(this.x * other.x) + f32(this.y * other.y));
  }

  dotProductXY(otherX: number, otherY: number): number {
    return f32(f32(this.x * otherX) + f32(this.y * otherY));
  }

  /**
   * Whether `other` turns clockwise (> 0) from this vector, from the Z
   * coordinate of their cross product. False when they are collinear.
   */
  clockwise(other: Point): boolean {
    return f32(f32(this.x * other.y) - f32(this.y * other.x)) > 0;
  }

  /** Unit vector in the direction of this point from (0, 0). */
  getDirection(): Point {
    const d = this.getDistance();
    if (!(d > 0)) throw new Error("Can't get the direction of a 0-length vector");
    return this.div(d);
  }

  negate(): Point {
    return new Point(-this.x, -this.y);
  }

  minus(other: Point): Point {
    return new Point(this.x - other.x, this.y - other.y);
  }

  plus(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  times(operand: number): Point {
    const o = f32(operand);
    return new Point(this.x * o, this.y * o);
  }

  div(operand: number): Point {
    const o = f32(operand);
    return new Point(this.x / o, this.y / o);
  }

  rem(operand: number): Point {
    const o = f32(operand);
    return new Point(this.x % o, this.y % o);
  }

  /** Rotates 90 degrees (Utils.kt `rotate90`). */
  rotate90(): Point {
    return new Point(-this.y, this.x);
  }

  transformed(f: PointTransformer): Point {
    const [x, y] = f(this.x, this.y);
    return new Point(x, y);
  }

  toString(): string {
    return `Point(${this.x}, ${this.y})`;
  }
}

/** Maps a point to a new point (Kotlin's `PointTransformer` fun interface). */
export type PointTransformer = (x: number, y: number) => readonly [number, number];

/** Linear interpolation between two points; `fraction` may go outside 0..1. */
export function interpolatePoint(start: Point, stop: Point, fraction: number): Point {
  return new Point(interpolate(start.x, stop.x, fraction), interpolate(start.y, stop.y, fraction));
}

/** Linearly interpolate between `start` and `stop` with `fraction` between them. */
export function interpolate(start: number, stop: number, fraction: number): number {
  const t = f32(fraction);
  return f32(f32(f32(1 - t) * start) + f32(t * stop));
}
