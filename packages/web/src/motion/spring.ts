/*
 * Ported by hand from androidx/compose/animation/animation-core:
 * SpringSimulation.kt, SpringEstimation.kt, FloatSpringSpec (FloatAnimationSpec.kt),
 * the Spring constants (VectorizedAnimationSpec.kt) and VisibilityThresholds.kt.
 * Copyright 2019-2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Kotlin number types are kept: Float values are rounded to 32 bits with
 * Math.fround where Kotlin stores or computes a Float, Double math stays
 * 64-bit, and Long milliseconds and nanoseconds are whole numbers.
 *
 * This file has no imports, so scripts/extract-compose-tokens.mjs can load
 * it directly to build the spring tokens.
 */

const f32 = Math.fround;

/** Spring constants from Compose's `Spring` object. */
export const Spring = Object.freeze({
  StiffnessHigh: 10_000,
  StiffnessMedium: 1500,
  StiffnessMediumLow: 400,
  StiffnessLow: 200,
  StiffnessVeryLow: 50,
  DampingRatioHighBouncy: f32(0.2),
  DampingRatioMediumBouncy: 0.5,
  DampingRatioLowBouncy: 0.75,
  DampingRatioNoBouncy: 1,
  /** How close a value must get to its target, in its own unit, before a spring stops. */
  DefaultDisplacementThreshold: f32(0.01),
});

/**
 * Visibility thresholds Compose uses for its own value types
 * (VisibilityThresholds.kt): dp values stop within 0.4dp, pixel values
 * within 1px, other floats within 0.01.
 */
export const VisibilityThreshold = Object.freeze({
  Dp: f32(0.4),
  Px: 1,
  Int: 1,
  Float: f32(0.01),
});

/** Kotlin's Long.MAX_VALUE / 1_000_000: the longest duration, in milliseconds. */
const MAX_LONG_MILLIS = 9_223_372_036_854;

/** Kotlin's Double.toLong(): truncates, NaN becomes 0, saturates at the Long range. */
function doubleToLong(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value >= 9.223372036854776e18) return 9.223372036854776e18;
  if (value <= -9.223372036854776e18) return -9.223372036854776e18;
  return Math.trunc(value);
}

/** Kotlin Long multiplication, which wraps around on overflow. */
function longTimes(a: number, b: number): number {
  // doubleToLong's saturated values stand for Long.MAX_VALUE and MIN_VALUE.
  const long = (x: number) =>
    x >= 9.223372036854776e18
      ? 2n ** 63n - 1n
      : x <= -9.223372036854776e18
        ? -(2n ** 63n)
        : BigInt(x);
  return Number(BigInt.asIntN(64, long(a) * long(b)));
}

/**
 * Spring physics. Query the value and velocity at any time from a starting
 * value and velocity. Stiffness is the spring constant: the stiffer the
 * spring, the faster it settles. A damping ratio above 1 returns without
 * overshooting, 1 (critical damping) returns in the shortest time without
 * overshooting, and below 1 overshoots and oscillates; 0 oscillates forever.
 */
export class SpringSimulation {
  /** Target position (a Float). */
  finalPosition: number;
  // Natural frequency (a Double).
  private naturalFreq = Math.sqrt(Spring.StiffnessVeryLow);
  private _dampingRatio: number = Spring.DampingRatioNoBouncy;

  constructor(finalPosition: number) {
    this.finalPosition = f32(finalPosition);
  }

  get stiffness(): number {
    return f32(this.naturalFreq * this.naturalFreq);
  }

  set stiffness(value: number) {
    // Upstream checks the current stiffness here, not the new value; kept as is.
    if (this.stiffness <= 0) {
      throw new Error('Spring stiffness constant must be positive.');
    }
    this.naturalFreq = Math.sqrt(f32(value));
  }

  get dampingRatio(): number {
    return this._dampingRatio;
  }

  set dampingRatio(value: number) {
    if (value < 0) throw new Error('Damping ratio must be non-negative');
    this._dampingRatio = f32(value);
  }

  getAcceleration(lastDisplacement: number, lastVelocity: number): number {
    const adjustedDisplacement = f32(f32(lastDisplacement) - this.finalPosition);
    const k = this.naturalFreq * this.naturalFreq;
    const c = 2.0 * this.naturalFreq * this._dampingRatio;
    return f32(-k * adjustedDisplacement - c * f32(lastVelocity));
  }

  /**
   * Value and velocity `timeElapsed` milliseconds (a whole number, as
   * Kotlin's Long) after starting at `lastDisplacement` with `lastVelocity`,
   * from the analytical solution.
   */
  updateValues(
    lastDisplacement: number,
    lastVelocity: number,
    timeElapsed: number,
  ): {value: number; velocity: number} {
    lastVelocity = f32(lastVelocity);
    const dampingRatio = this._dampingRatio;
    const naturalFreq = this.naturalFreq;
    const adjustedDisplacement = f32(f32(lastDisplacement) - this.finalPosition);
    const deltaT = timeElapsed / 1000.0; // unit: seconds
    const dampingRatioSquared = dampingRatio * dampingRatio;
    const r = -dampingRatio * naturalFreq;

    let displacement: number;
    let currentVelocity: number;

    if (dampingRatio > 1) {
      // Over damping
      const s = naturalFreq * Math.sqrt(dampingRatioSquared - 1);
      const gammaPlus = r + s;
      const gammaMinus = r - s;

      // Overdamped
      const coeffB = (gammaMinus * adjustedDisplacement - lastVelocity) / (gammaMinus - gammaPlus);
      const coeffA = adjustedDisplacement - coeffB;
      displacement = coeffA * Math.exp(gammaMinus * deltaT) + coeffB * Math.exp(gammaPlus * deltaT);
      currentVelocity =
        coeffA * gammaMinus * Math.exp(gammaMinus * deltaT) +
        coeffB * gammaPlus * Math.exp(gammaPlus * deltaT);
    } else if (dampingRatio === 1.0) {
      // Critically damped
      const coeffA = adjustedDisplacement;
      const coeffB = lastVelocity + naturalFreq * adjustedDisplacement;
      const nFdT = -naturalFreq * deltaT;
      displacement = (coeffA + coeffB * deltaT) * Math.exp(nFdT);
      currentVelocity =
        (coeffA + coeffB * deltaT) * Math.exp(nFdT) * -naturalFreq + coeffB * Math.exp(nFdT);
    } else {
      const dampedFreq = naturalFreq * Math.sqrt(1 - dampingRatioSquared);
      // Underdamped
      const cosCoeff = adjustedDisplacement;
      const sinCoeff = (1 / dampedFreq) * (-r * adjustedDisplacement + lastVelocity);
      const dFdT = dampedFreq * deltaT;
      displacement = Math.exp(r * deltaT) * (cosCoeff * Math.cos(dFdT) + sinCoeff * Math.sin(dFdT));
      currentVelocity =
        displacement * r +
        Math.exp(r * deltaT) *
          (-dampedFreq * cosCoeff * Math.sin(dFdT) + dampedFreq * sinCoeff * Math.cos(dFdT));
    }

    return {value: f32(displacement + this.finalPosition), velocity: f32(currentVelocity)};
  }
}

/**
 * The estimated time, in milliseconds (a whole number), after which the
 * spring stays within `delta` of its rest position. Positions and velocity
 * are in units of the threshold. SpringEstimation.kt, Float overload.
 */
export function estimateAnimationDurationMillis(
  stiffness: number,
  dampingRatio: number,
  initialVelocity: number,
  initialDisplacement: number,
  delta: number,
): number {
  if (f32(dampingRatio) === 0) {
    // No damping, duration is infinite (max value).
    return MAX_LONG_MILLIS;
  }
  return estimateAnimationDurationMillisDouble(
    f32(stiffness),
    f32(dampingRatio),
    f32(initialVelocity),
    f32(initialDisplacement),
    f32(delta),
  );
}

/** SpringEstimation.kt, Double overload taking stiffness and damping ratio. */
export function estimateAnimationDurationMillisDouble(
  stiffness: number,
  dampingRatio: number,
  initialVelocity: number,
  initialDisplacement: number,
  delta: number,
): number {
  const dampingCoefficient = 2.0 * dampingRatio * Math.sqrt(stiffness);
  // The roots of x^2 + b x + c = 0, which may be complex (a is 1, folded in).
  const partialRoot = dampingCoefficient * dampingCoefficient - 4.0 * stiffness;
  const partialRootReal = partialRoot < 0.0 ? 0.0 : Math.sqrt(partialRoot);
  const partialRootImaginary = partialRoot < 0.0 ? Math.sqrt(Math.abs(partialRoot)) : 0.0;
  const firstRootReal = (-dampingCoefficient + partialRootReal) * 0.5;
  const firstRootImaginary = partialRootImaginary * 0.5;
  const secondRootReal = (-dampingCoefficient - partialRootReal) * 0.5;
  return estimateDurationInternal(
    firstRootReal,
    firstRootImaginary,
    secondRootReal,
    dampingRatio,
    initialVelocity,
    initialDisplacement,
    delta,
  );
}

const isNotFinite = (x: number) => !Number.isFinite(x);

/**
 * Under-damped: the envelope of x(t) = c1 e^(rt) cos(...) + c2 e^(rt) sin(...),
 * which is c e^(rt).
 */
function estimateUnderDamped(
  firstRootReal: number,
  firstRootImaginary: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r = firstRootReal;
  const c1 = p0;
  const c2 = (v0 - r * c1) / firstRootImaginary;
  const c = Math.sqrt(c1 * c1 + c2 * c2);
  return Math.log(delta / c) / r;
}

/** Critically damped: Newton-Raphson on x(t) = c1 e^(rt) + c2 t e^(rt). */
function estimateCriticallyDamped(
  firstRootReal: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r = firstRootReal;
  const c1 = p0;
  const c2 = v0 - r * c1;

  // Initial guess: the larger t of c1 e^(rt) = delta and c2 t e^(rt) = delta.
  const t1 = Math.log(Math.abs(delta / c1)) / r;
  const t2 =
    (() => {
      // Lambert's W function to solve t e^t.
      const guess = Math.log(Math.abs(delta / c2));
      let t = guess;
      for (let i = 0; i <= 5; i++) {
        t = guess - Math.log(Math.abs(t / r));
      }
      return t;
    })() / r;
  let tCurr = isNotFinite(t1) ? t2 : isNotFinite(t2) ? t1 : Math.max(t1, t2);

  // The inflection time matters when it is at t > 0.
  const tInflection = -(r * c1 + c2) / (r * c2);
  const xInflection = c1 * Math.exp(r * tInflection) + c2 * tInflection * Math.exp(r * tInflection);

  // Without a real inflection, solve x(t) = delta (p0 is made positive).
  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0.0) {
    signedDelta = -delta;
  } else if (tInflection > 0.0 && -xInflection < delta) {
    // Find the first crossing of the threshold; the inflection does not
    // exceed delta, so search from the left.
    if (c2 < 0 && c1 > 0) {
      tCurr = 0.0;
    }
    signedDelta = -delta;
  } else {
    // Three crossings: from above, when the inflection exceeds the
    // threshold, and as x(t) finally decays. Start between the change of
    // concavity and the inflection so Newton converges on the last one.
    tCurr = -(2.0 / r) - c1 / c2;
    signedDelta = delta;
  }

  let tDelta = Number.MAX_VALUE;
  let iterations = 0;
  while (tDelta > 0.001 && iterations < 100) {
    iterations++;
    const tLast = tCurr;
    tCurr = iterateNewtonsMethod(
      tCurr,
      (t) => (c1 + c2 * t) * Math.exp(r * t) + signedDelta,
      (t) => (c2 * (r * t + 1) + c1 * r) * Math.exp(r * t),
    );
    tDelta = Math.abs(tLast - tCurr);
  }
  return tCurr;
}

/** Over-damped: Newton-Raphson on x(t) = c1 e^(r1 t) + c2 e^(r2 t). */
function estimateOverDamped(
  firstRootReal: number,
  secondRootReal: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r1 = firstRootReal;
  const r2 = secondRootReal;
  const c2 = (r1 * p0 - v0) / (r1 - r2);
  const c1 = p0 - c2;

  // Initial guess: the larger t of c1 e^(r1 t) = delta and c2 e^(r2 t) = delta.
  const t1 = Math.log(Math.abs(delta / c1)) / r1;
  const t2 = Math.log(Math.abs(delta / c2)) / r2;
  let tCurr = isNotFinite(t1) ? t2 : isNotFinite(t2) ? t1 : Math.max(t1, t2);

  // The inflection time matters when it is at t > 0.
  const tInflection = Math.log((c1 * r1) / (-c2 * r2)) / (r2 - r1);
  const xInflection = () => c1 * Math.exp(r1 * tInflection) + c2 * Math.exp(r2 * tInflection);

  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0.0) {
    signedDelta = -delta;
  } else if (tInflection > 0.0 && -xInflection() < delta) {
    // Find the first crossing; search from the left.
    if (c2 > 0.0 && c1 < 0.0) {
      tCurr = 0.0;
    }
    signedDelta = -delta;
  } else {
    // Three crossings; start where Newton converges on the last one.
    tCurr = Math.log(-(c2 * r2 * r2) / (c1 * r1 * r1)) / (r1 - r2);
    signedDelta = delta;
  }

  // A good enough initial guess is returned as is.
  if (Math.abs(c1 * r1 * Math.exp(r1 * tCurr) + c2 * r2 * Math.exp(r2 * tCurr)) < 0.0001) {
    return tCurr;
  }

  let tDelta = Number.MAX_VALUE;
  // Capped for safety; upstream measured at most 5 iterations.
  let iterations = 0;
  while (tDelta > 0.001 && iterations < 100) {
    iterations++;
    const tLast = tCurr;
    tCurr = iterateNewtonsMethod(
      tCurr,
      (t) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t) + signedDelta,
      (t) => c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
    );
    tDelta = Math.abs(tLast - tCurr);
  }
  return tCurr;
}

function estimateDurationInternal(
  firstRootReal: number,
  firstRootImaginary: number,
  secondRootReal: number,
  dampingRatio: number,
  initialVelocity: number,
  initialPosition: number,
  delta: number,
): number {
  if (initialPosition === 0.0 && initialVelocity === 0.0) {
    return 0;
  }
  const v0 = initialPosition < 0 ? -initialVelocity : initialVelocity;
  const p0 = Math.abs(initialPosition);
  let seconds: number;
  if (dampingRatio > 1.0) {
    seconds = estimateOverDamped(firstRootReal, secondRootReal, p0, v0, delta);
  } else if (dampingRatio < 1.0) {
    seconds = estimateUnderDamped(firstRootReal, firstRootImaginary, p0, v0, delta);
  } else {
    seconds = estimateCriticallyDamped(firstRootReal, p0, v0, delta);
  }
  return doubleToLong(seconds * 1000.0);
}

function iterateNewtonsMethod(
  x: number,
  fn: (x: number) => number,
  fnPrime: (x: number) => number,
): number {
  return x - fn(x) / fnPrime(x);
}

/** Compose's MillisToNanos. */
export const MillisToNanos = 1_000_000;

/**
 * A spring for one Float value (FloatSpringSpec). Times are in nanoseconds,
 * as whole numbers; like Compose, the spring itself is evaluated at whole
 * milliseconds.
 */
export class FloatSpringSpec {
  readonly dampingRatio: number;
  readonly stiffness: number;
  private readonly visibilityThreshold: number;
  private readonly spring = new SpringSimulation(1);

  constructor(
    dampingRatio: number = Spring.DampingRatioNoBouncy,
    stiffness: number = Spring.StiffnessMedium,
    visibilityThreshold: number = Spring.DefaultDisplacementThreshold,
  ) {
    this.dampingRatio = f32(dampingRatio);
    this.stiffness = f32(stiffness);
    this.visibilityThreshold = f32(visibilityThreshold);
    this.spring.dampingRatio = this.dampingRatio;
    this.spring.stiffness = this.stiffness;
  }

  getValueFromNanos(
    playTimeNanos: number,
    initialValue: number,
    targetValue: number,
    initialVelocity: number,
  ): number {
    // Upstream TODO: properly support nanos in the spring.
    const playTimeMillis = Math.trunc(playTimeNanos / MillisToNanos);
    this.spring.finalPosition = f32(targetValue);
    return this.spring.updateValues(initialValue, initialVelocity, playTimeMillis).value;
  }

  getVelocityFromNanos(
    playTimeNanos: number,
    initialValue: number,
    targetValue: number,
    initialVelocity: number,
  ): number {
    const playTimeMillis = Math.trunc(playTimeNanos / MillisToNanos);
    this.spring.finalPosition = f32(targetValue);
    return this.spring.updateValues(initialValue, initialVelocity, playTimeMillis).velocity;
  }

  getEndVelocity(): number {
    return 0;
  }

  getDurationNanos(initialValue: number, targetValue: number, initialVelocity: number): number {
    const millis = estimateAnimationDurationMillis(
      this.spring.stiffness,
      this.spring.dampingRatio,
      f32(f32(initialVelocity) / this.visibilityThreshold),
      f32(f32(f32(initialValue) - f32(targetValue)) / this.visibilityThreshold),
      1,
    );
    return longTimes(millis, MillisToNanos);
  }
}

export interface SpringTimingOptions {
  /** Start value. Defaults to 0. */
  from?: number;
  /** End value. Defaults to 1. */
  to?: number;
  /** Starting velocity, in units per second. Defaults to 0. */
  velocity?: number;
  /** Visibility threshold, in the value's unit. Defaults to Compose's 0.01. */
  visibilityThreshold?: number;
  /** Largest allowed error of the `linear()` curve, as a fraction of the distance. */
  tolerance?: number;
}

/**
 * A CSS/Web Animations timing for a spring: its duration in milliseconds, as
 * Compose computes it, and a `linear()` easing through the spring's values
 * at each millisecond (Compose's own steps), thinned out to within
 * `tolerance`. At the end the value lands on `to`, as Compose's does.
 */
export function springTiming(
  dampingRatio: number,
  stiffness: number,
  options: SpringTimingOptions = {},
): {duration: number; easing: string} {
  const {
    from = 0,
    to = 1,
    velocity = 0,
    visibilityThreshold = Spring.DefaultDisplacementThreshold,
    tolerance = 0.0005,
  } = options;
  const spec = new FloatSpringSpec(dampingRatio, stiffness, visibilityThreshold);
  const durationNanos = spec.getDurationNanos(from, to, velocity);
  const duration = Math.max(0, Math.ceil(durationNanos / MillisToNanos));
  const span = f32(to) - f32(from);
  if (duration === 0 || span === 0) return {duration, easing: 'linear'};

  // Progress at every whole millisecond; Compose snaps to the target once
  // the play time reaches the duration.
  const progress = (ms: number) =>
    ms * MillisToNanos >= durationNanos
      ? 1
      : (spec.getValueFromNanos(ms * MillisToNanos, from, to, velocity) - f32(from)) / span;
  const samples = Array.from({length: duration + 1}, (_, ms) => progress(ms));

  // Keep the fewest points whose straight lines stay within tolerance.
  const keep = new Set([0, duration]);
  const split = (a: number, b: number) => {
    let worst = -1;
    let worstError = tolerance;
    for (let i = a + 1; i < b; i++) {
      const line = samples[a] + ((samples[b] - samples[a]) * (i - a)) / (b - a);
      const error = Math.abs(samples[i] - line);
      if (error > worstError) {
        worst = i;
        worstError = error;
      }
    }
    if (worst > 0) {
      keep.add(worst);
      split(a, worst);
      split(worst, b);
    }
  };
  split(0, duration);

  const points = [...keep].sort((a, b) => a - b);
  const stops = points.map((ms, i) => {
    const value = +samples[ms].toFixed(4);
    if (i === 0 || i === points.length - 1) return String(value);
    return `${value} ${+((ms / duration) * 100).toFixed(3)}%`;
  });
  return {duration, easing: `linear(${stops.join(', ')})`};
}
