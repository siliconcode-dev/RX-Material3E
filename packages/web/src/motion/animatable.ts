/*
 * Ported by hand from androidx/compose/animation/animation-core Animatable.kt,
 * SuspendAnimation.kt (AnimationState.animate, doAnimationFrame) and
 * TargetBasedAnimation (Animation.kt), for spring specs.
 * Copyright 2019-2024 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose runs these as coroutines on its frame clock; here they run on
 * requestAnimationFrame (or any frame clock passed in) and animateTo
 * returns a Promise. A value is a number or a list of numbers (one spring
 * per entry, as Compose's AnimationVector), each a 32-bit Float.
 */

import {motionDurationScale} from './duration-scale.js';
import {spring, type SpringSpec} from './motion-scheme.js';
import {FloatSpringSpec, Spring} from './spring.js';

const f32 = Math.fround;

/** Calls back once on the next frame with its time in milliseconds; returns a cancel function. */
export type FrameClock = (callback: (timeMs: number) => void) => () => void;

const animationFrameClock: FrameClock = (callback) => {
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
};

/** Why an animation stopped. */
export type AnimationEndReason =
  /** It reached its target. */
  | 'Finished'
  /** It hit a bound set on the Animatable and stopped there. */
  | 'BoundReached'
  /**
   * Another animateTo, snapTo or stop took over. (Compose throws a
   * CancellationException here; the Promise resolves instead.)
   */
  | 'Interrupted';

export interface AnimationResult<T> {
  readonly endReason: AnimationEndReason;
  /** The value when it stopped. */
  readonly value: T;
  /** The velocity when it stopped, in units per second. */
  readonly velocity: T;
}

export interface AnimatableOptions<T> {
  /**
   * How close to the target, in the value's unit, counts as arrived, for the
   * default spring. Compose's default is 0.01.
   */
  visibilityThreshold?: T;
  /** Lowest allowed value; animations stop here (BoundReached). */
  lowerBound?: T;
  /** Highest allowed value; animations stop here (BoundReached). */
  upperBound?: T;
  /** Frame source; defaults to requestAnimationFrame. */
  frameClock?: FrameClock;
  /**
   * Whole numbers, as Compose's `Int.VectorConverter`: every frame's value
   * is cut toward zero (`toInt()`), and an animation that takes over starts
   * from that whole number. The velocity stays fractional. `'size'` is
   * `IntSize.VectorConverter`: rounded to the nearest whole number, and
   * never below 0.
   */
  integer?: boolean | 'size';
}

const Unspecified = Number.MIN_SAFE_INTEGER;

type Value = number | readonly number[];
/** `new Animatable(0)` animates numbers, not just the literal 0. */
type Widen<T> = T extends number ? number : readonly number[];
type Vector = number[];

const toVector = (v: Value): Vector => (typeof v === 'number' ? [f32(v)] : v.map(f32));

/**
 * A value that animates with springs, as Compose's `Animatable`: it keeps
 * its velocity, so a new `animateTo` mid-flight carries the motion on
 * smoothly from where and how fast it was going.
 *
 * @example
 * const scale = new Animatable(1);
 * scale.animateTo(1.2, MotionSchemes.expressive().fastSpatial, undefined, () => {
 *   el.style.scale = String(scale.value);
 * });
 */
export class Animatable<T extends Value = number> {
  private readonly scalar: boolean;
  private readonly size: number;
  private current: Vector;
  private currentVelocity: Vector;
  private target: Vector;
  private running = false;
  private lastFrameTimeNanos = Unspecified;
  private readonly thresholds: Vector;
  private readonly lower: Vector;
  private readonly upper: Vector;
  private readonly frameClock: FrameClock;
  private readonly convert: (v: Vector) => Vector;
  private job: {cancel: () => void} | null = null;

  /** The spring animateTo uses when no spec is given: Compose's default, with this threshold. */
  readonly defaultSpringSpec: SpringSpec;

  constructor(initialValue: T, options: AnimatableOptions<Widen<T>> = {}) {
    this.scalar = typeof initialValue === 'number';
    // + 0 turns -0 into 0, as Kotlin has no negative zero integer.
    this.convert =
      options.integer === 'size'
        ? (v) => v.map((x) => Math.max(0, Math.round(x)))
        : options.integer
          ? (v) => v.map((x) => Math.trunc(x) + 0)
          : (v) => v;
    this.current = this.convert(toVector(initialValue));
    this.size = this.current.length;
    this.currentVelocity = new Array<number>(this.size).fill(0);
    this.target = [...this.current];
    const fill = (v: Widen<T> | undefined, d: number) =>
      v === undefined ? new Array<number>(this.size).fill(d) : toVector(v);
    this.thresholds = fill(options.visibilityThreshold, Spring.DefaultDisplacementThreshold);
    this.lower = fill(options.lowerBound, Number.NEGATIVE_INFINITY);
    this.upper = fill(options.upperBound, Number.POSITIVE_INFINITY);
    this.frameClock = options.frameClock ?? animationFrameClock;
    this.defaultSpringSpec = spring(this.scalar ? {visibilityThreshold: this.thresholds[0]} : {});
  }

  private out(v: Vector): Widen<T> {
    return (this.scalar ? v[0] : [...v]) as unknown as Widen<T>;
  }

  /** The current value. */
  get value(): Widen<T> {
    return this.out(this.current);
  }

  /** The current velocity, in units per second. */
  get velocity(): Widen<T> {
    return this.out(this.currentVelocity);
  }

  /** The value being animated to (or the current value when idle). */
  get targetValue(): Widen<T> {
    return this.out(this.target);
  }

  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Springs to `targetValue`, starting from the current value with
   * `initialVelocity` (the current velocity by default). Any running
   * animation is taken over: its Promise resolves as Interrupted and this
   * one picks up its timeline, value and velocity.
   */
  animateTo(
    targetValue: Widen<T>,
    animationSpec: SpringSpec = this.defaultSpringSpec,
    initialVelocity: Widen<T> = this.velocity,
    onFrame?: (animatable: this) => void,
  ): Promise<AnimationResult<Widen<T>>> {
    const target = toVector(targetValue);
    const velocity = toVector(initialVelocity);
    if (target.length !== this.size || velocity.length !== this.size) {
      throw new Error('animateTo: value has the wrong number of entries');
    }
    // One spring per entry. A spec without a threshold uses Compose's 0.01 on
    // every entry (VectorizedSpringSpec); the default spec uses this
    // Animatable's thresholds.
    const specs = target.map(
      (_, i) =>
        new FloatSpringSpec(
          animationSpec.dampingRatio,
          animationSpec.stiffness,
          animationSpec.visibilityThreshold ??
            (animationSpec === this.defaultSpringSpec
              ? this.thresholds[i]
              : Spring.DefaultDisplacementThreshold),
        ),
    );
    const initial = [...this.current];
    const durationNanos = Math.max(
      0,
      ...specs.map((s, i) => s.getDurationNanos(initial[i], target[i], velocity[i])),
    );
    const isFinished = (playTimeNanos: number) => playTimeNanos >= durationNanos;
    const valueAt = (playTimeNanos: number) =>
      isFinished(playTimeNanos)
        ? [...target]
        : specs.map((s, i) =>
            s.getValueFromNanos(playTimeNanos, initial[i], target[i], velocity[i]),
          );
    const velocityAt = (playTimeNanos: number) =>
      isFinished(playTimeNanos)
        ? specs.map((s) => s.getEndVelocity())
        : specs.map((s, i) =>
            s.getVelocityFromNanos(playTimeNanos, initial[i], target[i], velocity[i]),
          );

    // Keep the start time before stopping the running animation resets it.
    const startTime = this.lastFrameTimeNanos;
    this.cancelJob();

    return new Promise((resolve) => {
      let cancelFrame = () => {};
      let startTimeNanos = startTime;
      let active = true;
      const job = {
        cancel: () => {
          active = false;
          cancelFrame();
          this.endAnimation();
          resolve({endReason: 'Interrupted', value: this.value, velocity: this.velocity});
        },
      };
      this.job = job;
      this.currentVelocity = [...velocity];
      this.target = [...target];
      this.running = true;

      const finish = (endReason: AnimationEndReason) => {
        active = false;
        const result = {endReason, value: this.value, velocity: this.velocity};
        this.job = null;
        this.endAnimation();
        resolve(result);
      };

      // One frame: doAnimationFrameWithScale, doAnimationFrame, updateState
      // and the clamping of Animatable.runAnimation.
      const frame = (frameTimeNanos: number) => {
        const durationScale = motionDurationScale();
        const playTimeNanos =
          durationScale === 0
            ? durationNanos
            : Math.trunc((frameTimeNanos - startTimeNanos) / durationScale);
        const value = this.convert(valueAt(playTimeNanos));
        this.currentVelocity = velocityAt(playTimeNanos);
        this.lastFrameTimeNanos = frameTimeNanos;
        const lastFrame = isFinished(playTimeNanos);
        const clamped = value.map((v, i) => Math.min(Math.max(v, this.lower[i]), this.upper[i]));
        const boundReached = clamped.some((v, i) => v !== value[i]);
        this.current = clamped;
        onFrame?.(this);
        if (!active) return;
        if (boundReached) finish('BoundReached');
        else if (lastFrame) finish('Finished');
        else next();
      };
      const next = () => {
        cancelFrame = this.frameClock((ms) => frame(Math.round(ms * 1e6)));
      };

      if (startTimeNanos === Unspecified) {
        // Start on the next frame.
        cancelFrame = this.frameClock((ms) => {
          startTimeNanos = Math.round(ms * 1e6);
          frame(startTimeNanos);
        });
      } else {
        // Carry on the interrupted animation's timeline: its last frame is
        // this animation's first.
        frame(startTimeNanos);
      }
    });
  }

  /** Jumps to `targetValue`, stopping any animation. */
  snapTo(targetValue: Widen<T>): void {
    this.cancelJob();
    this.endAnimation();
    const v = this.convert(toVector(targetValue));
    this.current = v.map((x, i) => Math.min(Math.max(x, this.lower[i]), this.upper[i]));
    this.target = [...this.current];
  }

  /** Stops any animation where it is; the velocity resets to 0. */
  stop(): void {
    this.cancelJob();
    this.endAnimation();
  }

  private cancelJob() {
    const job = this.job;
    this.job = null;
    job?.cancel();
  }

  private endAnimation() {
    this.currentVelocity = new Array<number>(this.size).fill(0);
    this.lastFrameTimeNanos = Unspecified;
    this.running = false;
  }
}
