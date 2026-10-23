/*
 * The web counterpart of Compose's MotionDurationScale. On Android the
 * scale comes from the system's animator duration setting, and "Remove
 * animations" sets it to 0, which makes every animation jump to its end. On
 * the web, prefers-reduced-motion plays that part.
 */

let override: number | null = null;
let query: MediaQueryList | null = null;

/** Whether the user asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  query ??=
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  return query?.matches ?? false;
}

/**
 * The duration scale for animations: 0 when the user prefers reduced motion
 * (animations jump to their end, as with Android's "Remove animations"),
 * otherwise 1, unless set with {@link setMotionDurationScale}. Durations are
 * multiplied by it.
 */
export function motionDurationScale(): number {
  if (override !== null) return override;
  return prefersReducedMotion() ? 0 : 1;
}

/**
 * Overrides the duration scale for the whole page: 0 turns animations off,
 * 2 plays them at half speed. `null` goes back to following the user's
 * reduced-motion setting.
 */
export function setMotionDurationScale(scale: number | null) {
  if (scale !== null && !(scale >= 0)) throw new Error('negative scale factor');
  override = scale;
}
