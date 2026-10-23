// Compares the spring port against output from Google's real Compose code
// (scripts/shapes-golden/GoldenSpring.kt): values and velocities must be the
// same 32-bit floats, and durations the same whole nanoseconds.
import {describe, expect, it} from 'vitest';
import {FloatSpringSpec} from '../../src/motion/spring.js';
import golden from './golden/spring.json';

interface Curve {
  spring: string;
  damping: number;
  stiffness: number;
  start: number;
  from: number;
  to: number;
  velocity: number;
  threshold: number;
  durationNanos: number;
  times: number[];
  values: number[];
  velocities: number[];
}

const data = golden as unknown as {curves: Curve[]; durations: number[][]};
const f = Math.fround;

describe("golden: springs vs Google's Kotlin", () => {
  for (const c of data.curves) {
    it(`${c.spring} start ${c.start}`, () => {
      const spec = new FloatSpringSpec(c.damping, c.stiffness, c.threshold);
      expect(spec.getDurationNanos(c.from, c.to, c.velocity), 'duration').toBe(c.durationNanos);
      c.times.forEach((t, i) => {
        expect(f(spec.getValueFromNanos(t, c.from, c.to, c.velocity)), `value at ${t}ns`).toBe(
          f(c.values[i]),
        );
        expect(
          f(spec.getVelocityFromNanos(t, c.from, c.to, c.velocity)),
          `velocity at ${t}ns`,
        ).toBe(f(c.velocities[i]));
      });
    });
  }

  it(`${data.durations.length} durations`, () => {
    // Over-damped springs that start almost at rest make Compose's Newton
    // iteration so sensitive that last-bit differences between Java's and
    // the browser's exp/log change the answer (Android's libm differs from
    // Java's too). Both answers then end the spring within its first frame,
    // so those cases may differ; nothing else may.
    const frameNanos = 16_000_000;
    const wrong: string[] = [];
    let withinFirstFrame = 0;
    for (const [d, k, x, v, want] of data.durations) {
      const got = new FloatSpringSpec(d, k, 0.01).getDurationNanos(x, 0, v);
      if (got === want) continue;
      if (d > 1 && got < frameNanos && want < frameNanos) {
        withinFirstFrame++;
        continue;
      }
      wrong.push(`damping ${d} stiffness ${k} from ${x} velocity ${v}: ${got} vs. Kotlin ${want}`);
    }
    expect(wrong).toEqual([]);
    expect(withinFirstFrame).toBeLessThanOrEqual(4);
  });
});
