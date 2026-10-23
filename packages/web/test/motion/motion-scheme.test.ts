import {afterEach, describe, expect, it} from 'vitest';
import '@rx-m3e/tokens/theme.css';
import tokens from '@rx-m3e/tokens/tokens.json';
import {
  animateWithSpring,
  MotionSchemes,
  motionSpring,
  prefersReducedMotion,
  setMotionDurationScale,
  springEasing,
  springTiming,
  FloatSpringSpec,
  type MotionSchemeKey,
} from '../../src/motion/index.js';

const keys: MotionSchemeKey[] = [
  'defaultSpatial',
  'fastSpatial',
  'slowSpatial',
  'defaultEffects',
  'fastEffects',
  'slowEffects',
];
const css = (k: MotionSchemeKey) => k.replace(/(Spatial|Effects)/, (m) => `-${m.toLowerCase()}`);

afterEach(() => setMotionDurationScale(null));

describe('MotionScheme', () => {
  it("matches Compose's tokens (generated from the Kotlin token files)", () => {
    const t = tokens as unknown as {
      sys: Record<string, string>;
      standardMotion: Record<string, string>;
    };
    for (const [scheme, values] of [
      [MotionSchemes.expressive(), t.sys],
      [MotionSchemes.standard(), t.standardMotion],
    ] as const) {
      for (const k of keys) {
        const base = `--md-sys-motion-spring-${css(k)}`;
        expect(scheme[k].dampingRatio, k).toBe(Number(values[`${base}-damping`]));
        expect(scheme[k].stiffness, k).toBe(Number(values[`${base}-stiffness`]));
        expect(scheme[k].visibilityThreshold, k).toBeUndefined();
      }
    }
  });

  it('reads the scheme from CSS, so a page can switch to standard', () => {
    const el = document.createElement('div');
    document.body.append(el);
    expect(motionSpring(el, 'defaultSpatial')).toEqual(MotionSchemes.expressive().defaultSpatial);
    el.dataset.motionScheme = 'standard';
    for (const k of keys) expect(motionSpring(el, k)).toEqual(MotionSchemes.standard()[k]);
    el.remove();
  });
});

describe('springTiming', () => {
  it('ends when Compose ends the spring and stays within tolerance of it', () => {
    for (const k of keys) {
      const {dampingRatio, stiffness} = MotionSchemes.expressive()[k];
      for (const to of [1, 100, -40]) {
        const {duration, easing} = springTiming(dampingRatio, stiffness, {to});
        const ref = new FloatSpringSpec(dampingRatio, stiffness);
        const nanos = ref.getDurationNanos(0, to, 0);
        expect(duration).toBe(Math.ceil(nanos / 1e6));
        // Read the linear() stops back and check every millisecond.
        const stops = [...easing.slice(7, -1).split(', ')].map((s, i, all) => {
          const [v, p] = s.split(' ');
          return [i === 0 ? 0 : i === all.length - 1 ? 100 : parseFloat(p), Number(v)];
        });
        for (let ms = 0; ms <= duration; ms++) {
          const pct = (ms / duration) * 100;
          const j = stops.findIndex(([p]) => p >= pct);
          const [p1, v1] = stops[Math.max(0, j - 1)];
          const [p2, v2] = stops[j];
          const eased = p2 === p1 ? v2 : v1 + ((v2 - v1) * (pct - p1)) / (p2 - p1);
          const want = ms * 1e6 >= nanos ? 1 : ref.getValueFromNanos(ms * 1e6, 0, to, 0) / to;
          expect(Math.abs(eased - want), `${k} to ${to} at ${ms}ms`).toBeLessThan(0.0006);
        }
      }
    }
  });

  it('gives the CSS tokens: 100dp for spatial springs, 0 to 1 for effects', () => {
    const style = getComputedStyle(document.documentElement);
    for (const k of keys) {
      const {dampingRatio, stiffness} = MotionSchemes.expressive()[k];
      const to = k.endsWith('Spatial') ? 100 : 1;
      const timing = springTiming(dampingRatio, stiffness, {to});
      const base = `--md-sys-motion-spring-${css(k)}`;
      expect(style.getPropertyValue(`${base}-duration`).trim()).toBe(`${timing.duration}ms`);
      expect(style.getPropertyValue(`${base}-easing`).trim()).toBe(timing.easing);
    }
  });
});

describe('Web Animations', () => {
  it('animates on the spring', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const spec = MotionSchemes.expressive().fastSpatial;
    const animation = animateWithSpring(el, {translate: ['0px', '120px']}, spec, {distance: 120});
    const timing = animation.effect!.getTiming();
    const want = springEasing(spec, {distance: 120});
    expect(timing.duration).toBe(want.duration);
    // The browser rewrites linear() when it stores it; compare in its form.
    const probe = el.animate([], {easing: want.easing});
    expect(timing.easing).toBe(probe.effect!.getTiming().easing);
    probe.cancel();
    expect(timing.duration).toBeGreaterThan(0);
    animation.cancel();
    el.remove();
  });

  it('has no duration with reduced motion', () => {
    expect(prefersReducedMotion()).toBe(false);
    setMotionDurationScale(0);
    expect(springEasing(MotionSchemes.expressive().slowSpatial, {distance: 500}).duration).toBe(0);
  });
});
