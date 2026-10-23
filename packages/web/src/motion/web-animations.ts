// Springs for the Web Animations API: element.animate() with a spring's
// duration and a linear() easing computed by the Compose spring port.

import {motionDurationScale} from './duration-scale.js';
import type {SpringSpec} from './motion-scheme.js';
import {Spring, springTiming} from './spring.js';

export interface SpringAnimationOptions extends Omit<
  KeyframeAnimationOptions,
  'duration' | 'easing'
> {
  /**
   * How far the animated value moves, in its own unit (px or dp for spatial
   * changes, 1 for opacity). With the visibility threshold this sets how
   * long the spring runs, as in Compose. Defaults to 1.
   */
  distance?: number;
  /** Starting velocity, in the same unit per second. Defaults to 0. */
  velocity?: number;
}

/**
 * The duration (ms) and `linear()` easing for a spring moving `distance`
 * with an initial `velocity`. Scaled by {@link motionDurationScale}: with
 * reduced motion the duration is 0.
 */
export function springEasing(
  spec: SpringSpec,
  options: {distance?: number; velocity?: number} = {},
): {duration: number; easing: string} {
  const {distance = 1, velocity = 0} = options;
  const timing = springTiming(spec.dampingRatio, spec.stiffness, {
    from: 0,
    to: distance,
    velocity,
    visibilityThreshold: spec.visibilityThreshold ?? Spring.DefaultDisplacementThreshold,
  });
  return {duration: timing.duration * motionDurationScale(), easing: timing.easing};
}

/**
 * `element.animate()` on a spring. Keyframes go from the first to the last
 * along the spring's curve, overshooting where the spring does.
 *
 * @example
 * animateWithSpring(card, {translate: ['0 0', '0 -120px']}, scheme.defaultSpatial, {distance: 120});
 */
export function animateWithSpring(
  element: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  spec: SpringSpec,
  options: SpringAnimationOptions = {},
): Animation {
  const {distance, velocity, ...rest} = options;
  const {duration, easing} = springEasing(spec, {distance, velocity});
  return element.animate(keyframes, {...rest, duration, easing});
}
