/*
 * Ported by hand from androidx/compose/material3 internal/AnimatedShape.kt
 * (AnimatedShapeState, rememberAnimatedShape) and compose/foundation
 * shape/CornerSize.kt, CornerBasedShape.kt and RoundedCornerShape.kt (the
 * corner sizes and their lerp).
 * Copyright 2019-2025 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose morphs a control between two corner-based shapes by animating a
 * progress from 0 to 1 and interpolating each corner in pixels, worked out
 * from the current size on every frame. Here a shape's corners come from
 * CSS (the shape tokens) and the frames write `border-*-radius` in px.
 */

import {Animatable} from '../motion/animatable.js';
import type {SpringSpec} from '../motion/motion-scheme.js';

/**
 * A corner size, as Compose's CornerSize: a fixed size in px, a percent of
 * the shape's shorter side, or the interpolation of two others. `css` keeps
 * the CSS value it was read from, so a shape at rest can be written back as
 * it was given and follow later size changes.
 */
export type CornerSize =
  | {readonly kind: 'px'; readonly px: number; readonly css?: string}
  | {readonly kind: 'percent'; readonly percent: number; readonly css?: string}
  | {readonly kind: 'lerp'; readonly a: CornerSize; readonly b: CornerSize; readonly t: number};

/** A shape with four corner sizes, as Compose's RoundedCornerShape. Corners are logical. */
export interface CornerShape {
  readonly topStart: CornerSize;
  readonly topEnd: CornerSize;
  readonly bottomEnd: CornerSize;
  readonly bottomStart: CornerSize;
}

const CORNERS = ['topStart', 'topEnd', 'bottomEnd', 'bottomStart'] as const;

/** androidx.compose.ui.util.lerp. */
function lerpFloat(start: number, stop: number, fraction: number): number {
  return (1 - fraction) * start + fraction * stop;
}

/** CornerSize.toPx: a percent is of the shorter side (Size.minDimension). */
export function cornerSizeToPx(corner: CornerSize, width: number, height: number): number {
  switch (corner.kind) {
    case 'px':
      return corner.px;
    case 'percent':
      return Math.min(width, height) * (corner.percent / 100);
    case 'lerp':
      return lerpFloat(
        cornerSizeToPx(corner.a, width, height),
        cornerSizeToPx(corner.b, width, height),
        corner.t,
      );
  }
}

/**
 * RoundedCornerShape's lerp: each corner interpolates in px at the size it
 * is drawn at.
 */
export function lerpCornerShape(a: CornerShape, b: CornerShape, t: number): CornerShape {
  const corner = (key: (typeof CORNERS)[number]): CornerSize => ({
    kind: 'lerp',
    a: a[key],
    b: b[key],
    t,
  });
  return {
    topStart: corner('topStart'),
    topEnd: corner('topEnd'),
    bottomEnd: corner('bottomEnd'),
    bottomStart: corner('bottomStart'),
  };
}

// DpCornerSize and PercentCornerSize are data classes (equal by value); an
// interpolated corner is an anonymous object (equal only to itself).
function cornerSizesEqual(a: CornerSize, b: CornerSize): boolean {
  if (a.kind === 'px' && b.kind === 'px') return a.px === b.px;
  if (a.kind === 'percent' && b.kind === 'percent') return a.percent === b.percent;
  return a === b;
}

/** RoundedCornerShape.equals. */
export function cornerShapesEqual(a: CornerShape, b: CornerShape): boolean {
  return CORNERS.every((key) => cornerSizesEqual(a[key], b[key]));
}

/**
 * Reads a shape from a CSS `border-radius` value of one to four lengths, in
 * the order Compose names corners (top start, top end, bottom end, bottom
 * start). `fullValue` is the page's `--md-sys-shape-corner-full`: a corner
 * equal to it is Compose's CornerFull (CircleShape, 50% of the shorter
 * side), so it interpolates from the real half height, not from 9999px.
 */
export function parseCornerShape(value: string, fullValue: string): CornerShape | null {
  const full = parseFloat(fullValue);
  const sizes: CornerSize[] = [];
  for (const part of value.trim().split(/\s+/)) {
    const number = parseFloat(part);
    if (!Number.isFinite(number) || number < 0) return null;
    if (part.endsWith('%')) sizes.push({kind: 'percent', percent: number, css: part});
    else if (/^[\d.]+(px)?$/.test(part)) {
      sizes.push(
        number === full
          ? {kind: 'percent', percent: 50, css: part}
          : {kind: 'px', px: number, css: part},
      );
    } else return null;
  }
  if (sizes.length < 1 || sizes.length > 4) return null;
  // The border-radius shorthand rule for fewer than four values.
  const [ts, te = ts, be = ts, bs = te] = sizes;
  return {topStart: ts, topEnd: te, bottomEnd: be, bottomStart: bs};
}

/**
 * AnimatedShapeState: the progress of a morph between two corner shapes.
 * It starts at rest (progress 1) on `initialShape`.
 */
export class AnimatedShapeState {
  startShape: CornerShape;
  targetShape: CornerShape;
  readonly progress = new Animatable(1);

  private cachedProgress = -1;
  private cachedMorphedShape: CornerShape | null = null;

  constructor(
    initialShape: CornerShape,
    private readonly spec: () => SpringSpec,
    private readonly onFrame: () => void,
  ) {
    this.startShape = initialShape;
    this.targetShape = initialShape;
  }

  /** getMorphedShape: the shape at the current progress (cached per progress value). */
  morphedShape(): CornerShape {
    const currentProgress = this.progress.value;
    const cached = this.cachedMorphedShape;
    if (currentProgress === this.cachedProgress && cached) return cached;
    const morphed = lerpCornerShape(this.startShape, this.targetShape, currentProgress);
    this.cachedProgress = currentProgress;
    this.cachedMorphedShape = morphed;
    return morphed;
  }

  /** Whether the morph has ended on its target. */
  get atRest(): boolean {
    return !this.progress.isRunning && this.progress.value === 1;
  }

  /** animateToShape. */
  animateToShape(newTarget: CornerShape): Promise<unknown> | undefined {
    if (cornerShapesEqual(this.targetShape, newTarget)) return undefined;

    // Compose calls this from a LaunchedEffect keyed on the shape, so the
    // effect running the previous morph is cancelled first, and Animatable's
    // cancellation resets its velocity to 0 before this code reads it.
    this.progress.stop();

    if (cornerShapesEqual(newTarget, this.startShape)) {
      // The user reversed their action before the animation finished: flip
      // the progress and the velocity (0 after the cancellation above).
      this.startShape = this.targetShape;
      this.targetShape = newTarget;
      this.cachedMorphedShape = null;

      const p = this.progress.value;
      const v = this.progress.velocity;

      this.progress.snapTo(1 - p);
      this.onFrame();
      return this.progress.animateTo(1, this.spec(), -v, this.onFrame);
    }

    // A new target: freeze the visible shape and morph from it. At the exact
    // ends, take the end shape itself rather than nesting interpolations.
    const currentProgress = this.progress.value;
    const capturedStart = this.startShape;
    const capturedTarget = this.targetShape;
    this.startShape =
      currentProgress === 1
        ? capturedTarget
        : currentProgress === 0
          ? capturedStart
          : lerpCornerShape(capturedStart, capturedTarget, currentProgress);
    this.targetShape = newTarget;
    this.cachedMorphedShape = null;
    this.progress.snapTo(0);
    this.onFrame();
    return this.progress.animateTo(1, this.spec(), 0, this.onFrame);
  }
}

/** The CSS for a corner at rest, or null when it is an interpolation. */
function restingCss(corner: CornerSize): string | null {
  return corner.kind === 'lerp' ? null : (corner.css ?? null);
}

/**
 * Writes `shape` as the element's logical corner radii. Corners are worked
 * out in px from the element's size, except at rest, where the CSS each
 * corner was read from is written back so it keeps following the size.
 */
export function applyCornerShape(element: HTMLElement, shape: CornerShape, atRest: boolean) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const properties = {
    topStart: 'border-start-start-radius',
    topEnd: 'border-start-end-radius',
    bottomEnd: 'border-end-end-radius',
    bottomStart: 'border-end-start-radius',
  } as const;
  for (const key of CORNERS) {
    const css = atRest ? restingCss(shape[key]) : null;
    element.style.setProperty(
      properties[key],
      css ?? `${cornerSizeToPx(shape[key], width, height)}px`,
    );
  }
}

/** Removes the radii `applyCornerShape` wrote, handing the shape back to the stylesheet. */
export function clearCornerShape(element: HTMLElement) {
  for (const property of [
    'border-start-start-radius',
    'border-start-end-radius',
    'border-end-end-radius',
    'border-end-start-radius',
  ]) {
    element.style.removeProperty(property);
  }
}
