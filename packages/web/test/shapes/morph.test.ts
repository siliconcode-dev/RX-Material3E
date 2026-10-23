/*
 * Ported from androidx/graphics/graphics-shapes MorphTest.kt (commonTest)
 * and AndroidMorphTest.kt (androidDeviceTest).
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 */
import {describe, expect, it} from 'vitest';
import {
  type Cubic,
  Morph,
  morphToPath,
  RoundedPolygon,
  toPath,
} from '../../src/shapes/graphics/index.js';
import {cubicsEqualish} from './test-utils.js';

const RADIUS = 50;
const SCALE = RADIUS;

const poly1 = RoundedPolygon.fromNumVertices(3, {centerX: 0.5, centerY: 0.5});
const poly2 = RoundedPolygon.fromNumVertices(4, {centerX: 0.5, centerY: 0.5});
const morph11 = new Morph(poly1, poly1);
const morph12 = new Morph(poly1, poly2);

/** Fills `d` (scaled by SCALE, moved by SCALE / 2) in white on black, as a 0/1 mask. */
function drawTestPath(d: string): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = RADIUS * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, RADIUS * 2, RADIUS * 2);
  ctx.translate(SCALE / 2, SCALE / 2);
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#fff';
  ctx.fill(new Path2D(d));
  const pixels = ctx.getImageData(0, 0, RADIUS * 2, RADIUS * 2).data;
  // Android draws this test without anti-aliasing; threshold instead.
  return Uint8Array.from({length: pixels.length / 4}, (_, i) => (pixels[i * 4] > 127 ? 1 : 0));
}

describe('Morph', () => {
  it('cubicsTest', () => {
    // A Morph with the same start and end shape has curves equivalent to
    // those in that shape. Morphing may drop some zero-length curves, but
    // every curve in the morph should exist somewhere in the shape.
    const p1Cubics: readonly Cubic[] = poly1.cubics;
    const cubics11 = morph11.asCubics(0);
    expect(cubics11.length).toBeGreaterThan(0);
    for (const morphCubic of cubics11) {
      expect(p1Cubics.some((p1Cubic) => cubicsEqualish(morphCubic, p1Cubic))).toBe(true);
    }
  });

  it('morphDrawingTest (AndroidMorphTest)', () => {
    // The morph's cubics differ from the polygons' (the morph cuts curves
    // to match them up), but at progress 0 and 1 it must draw the same.
    const options = {startAngle: 0, precision: null};
    expect(drawTestPath(morphToPath(morph12, 0, options))).toEqual(
      drawTestPath(toPath(poly1, options)),
    );
    expect(drawTestPath(morphToPath(morph12, 1, options))).toEqual(
      drawTestPath(toPath(poly2, options)),
    );
  });
});
