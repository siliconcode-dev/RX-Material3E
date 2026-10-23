export {
  Animatable,
  type AnimatableOptions,
  type AnimationEndReason,
  type AnimationResult,
  type FrameClock,
} from './animatable.js';
export {
  motionDurationScale,
  prefersReducedMotion,
  setMotionDurationScale,
} from './duration-scale.js';
export {
  MotionSchemes,
  motionSpring,
  spring,
  type MotionScheme,
  type MotionSchemeKey,
  type SpringSpec,
} from './motion-scheme.js';
export {
  estimateAnimationDurationMillis,
  FloatSpringSpec,
  Spring,
  SpringSimulation,
  springTiming,
  VisibilityThreshold,
  type SpringTimingOptions,
} from './spring.js';
export {animateWithSpring, springEasing, type SpringAnimationOptions} from './web-animations.js';
