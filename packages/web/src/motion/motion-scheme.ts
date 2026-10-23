/*
 * Ported by hand from androidx/compose/material3 MotionScheme.kt and the
 * spring() spec of animation-core AnimationSpec.kt, with the values of
 * tokens/StandardMotionTokens.kt and tokens/ExpressiveMotionTokens.kt.
 * Copyright 2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 */

import {Spring} from './spring.js';

/** A spring animation spec, as Compose's `spring()`. */
export interface SpringSpec {
  readonly dampingRatio: number;
  readonly stiffness: number;
  /**
   * How close to the target, in the value's unit, counts as arrived. Leave
   * it out for Compose's default of 0.01 per value.
   */
  readonly visibilityThreshold?: number;
}

/** Compose's `spring()`: damping ratio 1 (no bounce) and medium stiffness by default. */
export function spring(options: Partial<SpringSpec> = {}): SpringSpec {
  return Object.freeze({
    dampingRatio: options.dampingRatio ?? Spring.DampingRatioNoBouncy,
    stiffness: options.stiffness ?? Spring.StiffnessMedium,
    ...(options.visibilityThreshold === undefined
      ? {}
      : {visibilityThreshold: options.visibilityThreshold}),
  });
}

/** The six springs of a Material motion scheme. */
export interface MotionScheme {
  /** For moving and resizing things, the usual choice. */
  readonly defaultSpatial: SpringSpec;
  /** For small components, such as switches and buttons. */
  readonly fastSpatial: SpringSpec;
  /** For large movements, such as full-screen transitions. */
  readonly slowSpatial: SpringSpec;
  /** For color and opacity, the usual choice. No bounce. */
  readonly defaultEffects: SpringSpec;
  /** For color and opacity of small components. */
  readonly fastEffects: SpringSpec;
  /** For color and opacity of large areas. */
  readonly slowEffects: SpringSpec;
}

/** The token keys components use to pick a spring (MotionSchemeKeyTokens). */
export type MotionSchemeKey = keyof MotionScheme;

const scheme = (values: Record<MotionSchemeKey, [number, number]>): MotionScheme =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(values).map(([key, [dampingRatio, stiffness]]) => [
        key,
        spring({dampingRatio, stiffness}),
      ]),
    ) as unknown as MotionScheme,
  );

// [dampingRatio, stiffness] from StandardMotionTokens.kt.
const Standard = scheme({
  defaultSpatial: [0.9, 700],
  fastSpatial: [0.9, 1400],
  slowSpatial: [0.9, 300],
  defaultEffects: [1, 1600],
  fastEffects: [1, 3800],
  slowEffects: [1, 800],
});

// [dampingRatio, stiffness] from ExpressiveMotionTokens.kt.
const Expressive = scheme({
  defaultSpatial: [0.8, 380],
  fastSpatial: [0.6, 800],
  slowSpatial: [0.8, 200],
  defaultEffects: [1, 1600],
  fastEffects: [1, 3800],
  slowEffects: [1, 800],
});

/** Compose's two motion schemes. */
export const MotionSchemes = Object.freeze({
  /** The standard scheme: little bounce. */
  standard: (): MotionScheme => Standard,
  /** The Material 3 Expressive scheme: springier spatial motion. */
  expressive: (): MotionScheme => Expressive,
});

const cssName = (key: MotionSchemeKey) =>
  key.replace(
    /^(default|fast|slow)(Spatial|Effects)$/,
    (_, speed: string, kind: string) => `${speed}-${kind.toLowerCase()}`,
  );

/**
 * The spring for `key` as the page's CSS sets it: the
 * `--md-sys-motion-spring-*-damping` and `-stiffness` tokens on `element`
 * (expressive by default, standard under `data-motion-scheme="standard"`, or
 * any values a theme sets). Falls back to the expressive scheme.
 */
export function motionSpring(element: Element, key: MotionSchemeKey): SpringSpec {
  const style = getComputedStyle(element);
  const base = `--md-sys-motion-spring-${cssName(key)}`;
  const damping = parseFloat(style.getPropertyValue(`${base}-damping`));
  const stiffness = parseFloat(style.getPropertyValue(`${base}-stiffness`));
  const fallback = Expressive[key];
  return spring({
    dampingRatio: Number.isFinite(damping) ? damping : fallback.dampingRatio,
    stiffness: Number.isFinite(stiffness) && stiffness > 0 ? stiffness : fallback.stiffness,
  });
}
