/*
 * Ported by hand from androidx/graphics/graphics-shapes CornerRounding.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

/**
 * How a polygon vertex is rounded.
 *
 * A corner is either sharp (radius 0), rounded with a circular arc
 * (smoothing 0), or rounded with an inner arc and two symmetric flanking
 * curves that blend the arc into the edges (smoothing above 0; at 1 there is
 * no arc left and the flanking curves meet in the middle).
 *
 * `radius` is absolute, in the same units as the shape. For shapes in the
 * default canonical space (-1,-1 to 1,1) it should be relative to that size.
 * It scales along with the shape when the shape is transformed.
 */
export class CornerRounding {
  /** A sharp corner. */
  static readonly Unrounded = new CornerRounding();

  /**
   * @param radius 0 or more: the radius of the circle forming the inner arc.
   * @param smoothing 0 to 1: how far the curve extends from the arc toward the edges.
   */
  constructor(
    readonly radius: number = 0,
    readonly smoothing: number = 0,
  ) {}
}
