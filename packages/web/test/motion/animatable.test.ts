// Animatable follows Compose's frame logic (SuspendAnimation.kt): the first
// frame shows the start value, every later frame shows the spring at
// (frame time - start time), the last frame lands on the target, and a new
// animateTo mid-flight carries on from the interrupted one's last frame,
// value and velocity.
import {afterEach, describe, expect, it} from 'vitest';
import {
  Animatable,
  FloatSpringSpec,
  MotionSchemes,
  setMotionDurationScale,
  spring,
  type FrameClock,
} from '../../src/motion/index.js';

const f = Math.fround;

/** A frame clock driven by hand: tick(ms) runs the waiting callbacks at that time. */
function manualClock() {
  let waiting: ((t: number) => void)[] = [];
  const clock: FrameClock = (cb) => {
    waiting.push(cb);
    return () => {
      waiting = waiting.filter((c) => c !== cb);
    };
  };
  const tick = (ms: number) => {
    const run = waiting;
    waiting = [];
    for (const cb of run) cb(ms);
  };
  return {clock, tick, pending: () => waiting.length};
}

afterEach(() => setMotionDurationScale(null));

const spec = MotionSchemes.expressive().defaultSpatial;

describe('Animatable', () => {
  it('follows the spring frame by frame and lands on the target', async () => {
    const {clock, tick, pending} = manualClock();
    const a = new Animatable(0, {frameClock: clock});
    const seen: number[] = [];
    const done = a.animateTo(100, spec, undefined, () => seen.push(a.value));
    expect(a.isRunning).toBe(true);
    expect(a.targetValue).toBe(100);

    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    const duration = ref.getDurationNanos(0, 100, 0);
    // First frame at 1000ms: play time 0, the start value.
    tick(1000);
    expect(seen).toEqual([0]);
    let t = 1000;
    while (pending()) {
      t += 16;
      tick(t);
      const playTime = (t - 1000) * 1e6;
      const want = playTime >= duration ? 100 : ref.getValueFromNanos(playTime, 0, 100, 0);
      expect(seen.at(-1)).toBe(f(want));
    }
    const result = await done;
    expect(result.endReason).toBe('Finished');
    expect(result.value).toBe(100);
    expect(a.value).toBe(100);
    expect(a.velocity).toBe(0);
    expect(a.isRunning).toBe(false);
    expect((t - 1000) * 1e6).toBeGreaterThanOrEqual(duration);
  });

  it('carries on from the interrupted animation: timeline, value and velocity', async () => {
    const {clock, tick} = manualClock();
    const a = new Animatable(0, {frameClock: clock});
    const first = a.animateTo(100, spec);
    tick(0);
    tick(16);
    tick(32);
    const value = a.value;
    const velocity = a.velocity;
    expect(velocity).toBeGreaterThan(0);

    const seen: number[] = [];
    const second = a.animateTo(0, spec, undefined, () => seen.push(a.value));
    expect((await first).endReason).toBe('Interrupted');
    // Its first frame is the interrupted animation's last one, at play time 0.
    expect(seen).toEqual([value]);
    tick(48);
    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    expect(seen[1]).toBe(f(ref.getValueFromNanos(16e6, value, 0, velocity)));
    a.stop();
    expect((await second).endReason).toBe('Interrupted');
    expect(a.velocity).toBe(0);
  });

  it('jumps to the end when the duration scale is 0 (reduced motion)', async () => {
    const {clock, tick} = manualClock();
    setMotionDurationScale(0);
    const a = new Animatable(0, {frameClock: clock});
    const done = a.animateTo(1, spec);
    tick(5);
    expect((await done).endReason).toBe('Finished');
    expect(a.value).toBe(1);
  });

  it('stretches time by the duration scale', () => {
    const {clock, tick} = manualClock();
    setMotionDurationScale(2);
    const a = new Animatable(0, {frameClock: clock});
    void a.animateTo(1, spec);
    tick(0);
    tick(100);
    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    expect(a.value).toBe(f(ref.getValueFromNanos(50e6, 0, 1, 0)));
    a.stop();
  });

  it('stops at a bound', async () => {
    const {clock, tick, pending} = manualClock();
    const a = new Animatable(0, {upperBound: 1, frameClock: clock});
    // A bouncy spring overshoots 1.
    const done = a.animateTo(1, spring({dampingRatio: 0.3, stiffness: 400}));
    for (let t = 0; pending(); t += 16) tick(t);
    const result = await done;
    expect(result.endReason).toBe('BoundReached');
    expect(a.value).toBe(1);
  });

  it('snaps and stops', async () => {
    const {clock, tick} = manualClock();
    const a = new Animatable(0, {frameClock: clock});
    const done = a.animateTo(10, spec);
    tick(0);
    a.snapTo(3);
    expect((await done).endReason).toBe('Interrupted');
    expect(a.value).toBe(3);
    expect(a.targetValue).toBe(3);
    expect(a.isRunning).toBe(false);
  });

  it('animates lists of values with one spring each, ending together', async () => {
    const {clock, tick, pending} = manualClock();
    const a = new Animatable([0, 0], {frameClock: clock});
    const done = a.animateTo([1, 300], spec);
    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    tick(0);
    tick(48);
    expect(a.value).toEqual([
      f(ref.getValueFromNanos(48e6, 0, 1, 0)),
      f(ref.getValueFromNanos(48e6, 0, 300, 0)),
    ]);
    // The larger move takes longer; both end at its duration.
    let t = 48;
    while (pending()) tick((t += 16));
    expect(t * 1e6).toBeGreaterThanOrEqual(ref.getDurationNanos(0, 300, 0));
    expect((await done).value).toEqual([1, 300]);
  });

  it("uses the Animatable's threshold for its default spring", () => {
    const coarse = new Animatable(0, {visibilityThreshold: 1});
    expect(coarse.defaultSpringSpec).toEqual({
      dampingRatio: 1,
      stiffness: 1500,
      visibilityThreshold: 1,
    });
  });

  it('integer: each frame cut toward zero (Int.VectorConverter), and a takeover starts from it', async () => {
    const {clock, tick} = manualClock();
    const a = new Animatable(-13, {frameClock: clock, integer: true});
    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    const seen: number[] = [];
    void a.animateTo(0, spec, undefined, () => seen.push(a.value));
    tick(0);
    tick(16);
    tick(32);
    expect(seen).toEqual(
      [0, 16e6, 32e6].map((t) => Math.trunc(ref.getValueFromNanos(t, -13, 0, 0)) + 0),
    );
    // The velocity stays fractional.
    const velocity = a.velocity;
    expect(Number.isInteger(velocity)).toBe(false);
    const from = a.value;
    void a.animateTo(-13, spec, undefined, () => seen.push(a.value));
    tick(48);
    expect(seen.at(-1)).toBe(Math.trunc(ref.getValueFromNanos(16e6, from, -13, velocity)) + 0);
    a.snapTo(2.7);
    expect(a.value).toBe(2);
    a.snapTo(-0.5);
    expect(Object.is(a.value, 0)).toBe(true);
  });

  it("integer 'size': rounded to the nearest whole number and never below 0 (IntSize.VectorConverter)", async () => {
    const {clock, tick} = manualClock();
    const a = new Animatable(10, {frameClock: clock, integer: 'size'});
    const ref = new FloatSpringSpec(spec.dampingRatio, spec.stiffness);
    const seen: number[] = [];
    void a.animateTo(0, spec, undefined, () => seen.push(a.value));
    for (let t = 0; t <= 400; t += 16) tick(t);
    const want = [];
    for (let t = 0; t < 16 * seen.length; t += 16) {
      const playTime = t * 1e6;
      const done = playTime >= ref.getDurationNanos(10, 0, 0);
      want.push(done ? 0 : Math.max(0, Math.round(ref.getValueFromNanos(playTime, 10, 0, 0))));
    }
    expect(seen).toEqual(want);
    // The default spatial spring overshoots below 0, which shows as 0.
    expect(Math.min(...seen)).toBe(0);
    a.snapTo(2.5);
    expect(a.value).toBe(3);
    a.snapTo(-4);
    expect(a.value).toBe(0);
  });
});
