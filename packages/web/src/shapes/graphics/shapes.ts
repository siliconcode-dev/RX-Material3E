/*
 * Ported by hand from androidx/graphics/graphics-shapes Shapes.kt.
 * Copyright 2022 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Kotlin's RoundedPolygon.Companion.circle/rectangle/star/pill/pillStar
 * extension functions are plain functions here.
 */

import {CornerRounding} from './corner-rounding.js';
import {f32, interpolate, Point} from './point.js';
import {RoundedPolygon} from './rounded-polygon.js';
import {FloatPi, radialToCartesian, TwoPi} from './utils.js';

// Kotlin Float math throughout: see point.ts. Float parameters are rounded
// to 32 bits on the way in, as Kotlin's signatures do.

/**
 * A circle, approximated by a polygon of `numVertices` (default 8) with each
 * corner rounded by the full radius. Default radius 1, centered on (0, 0).
 */
export function circle(
  options: {numVertices?: number; radius?: number; centerX?: number; centerY?: number} = {},
): RoundedPolygon {
  const {numVertices = 8} = options;
  const radius = f32(options.radius ?? 1);
  const centerX = f32(options.centerX ?? 0);
  const centerY = f32(options.centerY ?? 0);
  if (numVertices < 3) throw new Error('Circle must have at least three vertices');
  // Half of the angle between two adjacent vertices.
  const theta = f32(FloatPi / numVertices);
  // The polygon's radius that gives the requested circle radius.
  const polygonRadius = f32(radius / f32(Math.cos(theta)));
  return RoundedPolygon.fromNumVertices(numVertices, {
    rounding: new CornerRounding(radius),
    radius: polygonRadius,
    centerX,
    centerY,
  });
}

/** A rectangle, 2 by 2 around (0, 0) by default. */
export function rectangle(
  options: {
    width?: number;
    height?: number;
    rounding?: CornerRounding;
    perVertexRounding?: readonly CornerRounding[] | null;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const {rounding = CornerRounding.Unrounded, perVertexRounding = null} = options;
  const width = f32(options.width ?? 2);
  const height = f32(options.height ?? 2);
  const centerX = f32(options.centerX ?? 0);
  const centerY = f32(options.centerY ?? 0);
  const left = f32(centerX - f32(width / 2));
  const top = f32(centerY - f32(height / 2));
  const right = f32(centerX + f32(width / 2));
  const bottom = f32(centerY + f32(height / 2));
  return RoundedPolygon.fromVertices([right, bottom, left, bottom, left, top, right, top], {
    rounding,
    perVertexRounding,
    centerX,
    centerY,
  });
}

/**
 * A star: `numVerticesPerRadius` outer vertices on `radius` alternating with
 * as many inner vertices on `innerRadius`. `innerRounding` rounds the inner
 * vertices differently from the outer ones.
 *
 * @throws if either radius is 0 or less, or innerRadius is not below radius.
 */
export function star(
  numVerticesPerRadius: number,
  options: {
    radius?: number;
    innerRadius?: number;
    rounding?: CornerRounding;
    innerRounding?: CornerRounding | null;
    perVertexRounding?: readonly CornerRounding[] | null;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const {
    rounding = CornerRounding.Unrounded,
    innerRounding = null,
    perVertexRounding = null,
  } = options;
  const radius = f32(options.radius ?? 1);
  const innerRadius = f32(options.innerRadius ?? 0.5);
  const centerX = f32(options.centerX ?? 0);
  const centerY = f32(options.centerY ?? 0);
  if (radius <= 0 || innerRadius <= 0) {
    throw new Error('Star radii must both be greater than 0');
  }
  if (innerRadius >= radius) {
    throw new Error('innerRadius must be less than radius');
  }
  let pvRounding = perVertexRounding;
  // With inner rounding and no per-vertex list, alternate outer and inner rounding.
  if (pvRounding == null && innerRounding != null) {
    pvRounding = Array.from({length: numVerticesPerRadius}).flatMap(() => [
      rounding,
      innerRounding,
    ]);
  }
  // A star is a polygon whose vertices alternate between the two radii.
  return RoundedPolygon.fromVertices(
    starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, centerX, centerY),
    {rounding, perVertexRounding: pvRounding, centerX, centerY},
  );
}

/**
 * A pill: a rectangle whose shorter sides are fully rounded. 2 by 1 by
 * default; `smoothing` blends the ends into the sides.
 *
 * @throws if width or height is not positive.
 */
export function pill(
  options: {
    width?: number;
    height?: number;
    smoothing?: number;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const width = f32(options.width ?? 2);
  const height = f32(options.height ?? 1);
  const smoothing = f32(options.smoothing ?? 0);
  const centerX = f32(options.centerX ?? 0);
  const centerY = f32(options.centerY ?? 0);
  if (!(width > 0 && height > 0)) {
    throw new Error('Pill shapes must have positive width and height');
  }
  const wHalf = f32(width / 2);
  const hHalf = f32(height / 2);
  return RoundedPolygon.fromVertices(
    [
      wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      hHalf + centerY,
      -wHalf + centerX,
      -hHalf + centerY,
      wHalf + centerX,
      -hHalf + centerY,
    ],
    {rounding: new CornerRounding(Math.min(wHalf, hHalf), smoothing), centerX, centerY},
  );
}

/**
 * A star laid out around a pill outline: `numVerticesPerRadius` outer and
 * inner vertices alternating along the pill's perimeter.
 *
 * Note: as upstream, the end caps use the full shorter side as their radius,
 * so the result is larger than `width` by `height`.
 *
 * @param innerRadiusRatio Inner vertices' distance as a fraction of the outer, in (0, 1].
 * @param vertexSpacing 0 to 1: space the inner (0) or outer (1) vertices on the
 *   end caps like those on the edges; the default 0.5 averages them.
 * @param startLocation 0 to 1: where on the perimeter the first vertex goes.
 * @throws if width or height is not positive, or innerRadiusRatio is out of range.
 */
export function pillStar(
  options: {
    width?: number;
    height?: number;
    numVerticesPerRadius?: number;
    innerRadiusRatio?: number;
    rounding?: CornerRounding;
    innerRounding?: CornerRounding | null;
    perVertexRounding?: readonly CornerRounding[] | null;
    vertexSpacing?: number;
    startLocation?: number;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const {
    numVerticesPerRadius = 8,
    rounding = CornerRounding.Unrounded,
    innerRounding = null,
    perVertexRounding = null,
  } = options;
  const width = f32(options.width ?? 2);
  const height = f32(options.height ?? 1);
  const innerRadiusRatio = f32(options.innerRadiusRatio ?? 0.5);
  const vertexSpacing = f32(options.vertexSpacing ?? 0.5);
  const startLocation = f32(options.startLocation ?? 0);
  const centerX = f32(options.centerX ?? 0);
  const centerY = f32(options.centerY ?? 0);
  if (!(width > 0 && height > 0)) {
    throw new Error('Pill shapes must have positive width and height');
  }
  if (!(innerRadiusRatio > 0 && innerRadiusRatio <= 1)) {
    throw new Error('innerRadius must be between 0 and 1');
  }
  let pvRounding = perVertexRounding;
  if (pvRounding == null && innerRounding != null) {
    pvRounding = Array.from({length: numVerticesPerRadius}).flatMap(() => [
      rounding,
      innerRounding,
    ]);
  }
  return RoundedPolygon.fromVertices(
    pillStarVerticesFromNumVerts(
      numVerticesPerRadius,
      width,
      height,
      innerRadiusRatio,
      vertexSpacing,
      startLocation,
      centerX,
      centerY,
    ),
    {rounding, perVertexRounding: pvRounding, centerX, centerY},
  );
}

function pillStarVerticesFromNumVerts(
  numVerticesPerRadius: number,
  width: number,
  height: number,
  innerRadius: number,
  vertexSpacing: number,
  startLocation: number,
  centerX: number,
  centerY: number,
): number[] {
  // Walk the perimeter of the underlying pill, placing each vertex at its
  // distance t along it, then work out which section it lands in: the
  // vertical sides, the four circular corners, or the top and bottom edges.
  // Either the vertical or the horizontal edges have length zero, since the
  // shorter dimension is all curve.
  const endcapRadius = Math.min(width, height);
  const vSegLen = Math.max(f32(height - width), 0);
  const hSegLen = Math.max(f32(width - height), 0);
  const vSegHalf = f32(vSegLen / 2);
  const hSegHalf = f32(hSegLen / 2);
  // vertexSpacing decides whether the inner (0) or outer (1) vertices on the
  // end caps are spaced like those along the edges.
  const circlePerimeter = f32(
    f32(TwoPi * endcapRadius) * interpolate(innerRadius, 1, vertexSpacing),
  );
  // The circle plus the inner rectangle's sides, any of which may be zero.
  const perimeter = f32(f32(f32(2 * hSegLen) + f32(2 * vSegLen)) + circlePerimeter);
  // Where each part of the outline starts along t, to find the section a
  // vertex lands in and how far into it.
  const quarter = f32(circlePerimeter / 4);
  const sections = new Array<number>(11);
  sections[0] = 0;
  sections[1] = f32(vSegLen / 2);
  sections[2] = f32(sections[1] + quarter);
  sections[3] = f32(sections[2] + hSegLen);
  sections[4] = f32(sections[3] + quarter);
  sections[5] = f32(sections[4] + vSegLen);
  sections[6] = f32(sections[5] + quarter);
  sections[7] = f32(sections[6] + hSegLen);
  sections[8] = f32(sections[7] + quarter);
  sections[9] = f32(sections[8] + f32(vSegLen / 2));
  sections[10] = perimeter;
  // Vertices are evenly spaced along the outline.
  const tPerVertex = f32(perimeter / (2 * numVerticesPerRadius));
  // Inner and outer vertices alternate, and may fall in different quadrants.
  let inner = false;
  let currSecIndex = 0;
  let secStart = 0;
  let secEnd = sections[1];
  // t = 0 is on the positive x axis; startLocation moves the first vertex.
  let t = f32(startLocation * perimeter);
  const result: number[] = [];
  const rectBR = new Point(hSegHalf, vSegHalf);
  const rectBL = new Point(-hSegHalf, vSegHalf);
  const rectTL = new Point(-hSegHalf, -vSegHalf);
  const rectTR = new Point(hSegHalf, -vSegHalf);
  const halfPi = f32(FloatPi / 2);
  for (let i = 0; i < numVerticesPerRadius * 2; i++) {
    // t may start after 0 and wrap past the end.
    const boundedT = f32(t % perimeter);
    if (boundedT < secStart) currSecIndex = 0;
    while (boundedT >= sections[(currSecIndex + 1) % sections.length]) {
      currSecIndex = (currSecIndex + 1) % sections.length;
      secStart = sections[currSecIndex];
      secEnd = sections[(currSecIndex + 1) % sections.length];
    }
    // How far into its section the vertex is, as a fraction.
    const tInSection = f32(boundedT - secStart);
    const tProportion = f32(tInSection / f32(secEnd - secStart));
    // On an end cap the fraction gives an angle from the section's start
    // angle; on an edge it is a straight interpolation.
    const currRadius = inner ? f32(endcapRadius * innerRadius) : endcapRadius;
    // Kotlin: tProportion * FloatPi / 2
    const arc = f32(f32(tProportion * FloatPi) / 2);
    let vertex: Point;
    switch (currSecIndex) {
      case 0:
        vertex = new Point(currRadius, tProportion * vSegHalf);
        break;
      case 1:
        vertex = radialToCartesian(currRadius, arc).plus(rectBR);
        break;
      case 2:
        vertex = new Point(hSegHalf - f32(tProportion * hSegLen), currRadius);
        break;
      case 3:
        vertex = radialToCartesian(currRadius, f32(halfPi + arc)).plus(rectBL);
        break;
      case 4:
        vertex = new Point(-currRadius, vSegHalf - f32(tProportion * vSegLen));
        break;
      case 5:
        vertex = radialToCartesian(currRadius, f32(FloatPi + arc)).plus(rectTL);
        break;
      case 6:
        vertex = new Point(-hSegHalf + f32(tProportion * hSegLen), -currRadius);
        break;
      case 7:
        vertex = radialToCartesian(currRadius, f32(f32(FloatPi * 1.5) + arc)).plus(rectTR);
        break;
      default: // 8
        vertex = new Point(currRadius, -vSegHalf + f32(tProportion * vSegHalf));
    }
    result.push(f32(vertex.x + centerX), f32(vertex.y + centerY));
    t = f32(t + tPerVertex);
    inner = !inner;
  }
  return result;
}

function starVerticesFromNumVerts(
  numVerticesPerRadius: number,
  radius: number,
  innerRadius: number,
  centerX: number,
  centerY: number,
): number[] {
  const result: number[] = [];
  const step = f32(FloatPi / numVerticesPerRadius);
  for (let i = 0; i < numVerticesPerRadius; i++) {
    let vertex = radialToCartesian(radius, f32(f32(step * 2) * i));
    result.push(f32(vertex.x + centerX), f32(vertex.y + centerY));
    vertex = radialToCartesian(innerRadius, f32(step * (2 * i + 1)));
    result.push(f32(vertex.x + centerX), f32(vertex.y + centerY));
  }
  return result;
}
