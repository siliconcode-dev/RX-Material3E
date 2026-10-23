import {afterEach, describe, expect, it} from 'vitest';
import {
  AnimatedShapeState,
  cornerShapesEqual,
  cornerSizeToPx,
  lerpCornerShape,
  parseCornerShape,
  type CornerShape,
} from '../../src/internals/animated-shape.js';
import {setMotionDurationScale, spring} from '../../src/motion/index.js';

const uniform = (value: string) => parseCornerShape(value, '9999px')!;
const px = (shape: CornerShape, w: number, h: number) =>
  [shape.topStart, shape.topEnd, shape.bottomEnd, shape.bottomStart].map((c) =>
    cornerSizeToPx(c, w, h),
  );
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

afterEach(() => setMotionDurationScale(null));

describe('parseCornerShape', () => {
  it('reads CornerFull as 50% of the shorter side, not as 9999px', () => {
    const full = uniform('9999px');
    expect(full.topStart).toMatchObject({kind: 'percent', percent: 50});
    expect(px(full, 120, 40)).toEqual([20, 20, 20, 20]);
    expect(px(full, 30, 136)).toEqual([15, 15, 15, 15]);
  });

  it('reads px and percent corners, in the border-radius shorthand order', () => {
    expect(px(uniform('8px'), 100, 40)).toEqual([8, 8, 8, 8]);
    expect(px(uniform('25%'), 100, 40)).toEqual([10, 10, 10, 10]);
    // topStart, topEnd, bottomEnd, bottomStart.
    expect(px(uniform('1px 2px'), 100, 40)).toEqual([1, 2, 1, 2]);
    expect(px(uniform('1px 2px 3px'), 100, 40)).toEqual([1, 2, 3, 2]);
    expect(px(uniform('1px 2px 3px 4px'), 100, 40)).toEqual([1, 2, 3, 4]);
    expect(px(uniform('0'), 100, 40)).toEqual([0, 0, 0, 0]);
  });

  it('gives up on anything that is not corner sizes', () => {
    for (const value of [
      '',
      'calc(4px + 2px)',
      '1em',
      '-2px',
      '1px 2px 3px 4px 5px',
      '8px / 4px',
    ]) {
      expect(parseCornerShape(value, '9999px'), value).toBeNull();
    }
  });
});

describe('corner shape lerp and equality', () => {
  it('interpolates each corner in px at the size it is drawn at', () => {
    const shape = lerpCornerShape(uniform('9999px'), uniform('8px'), 0.25);
    // (1 - t) * 20 + t * 8 at 40px tall; (1 - t) * 68 + t * 8 at 136px.
    expect(px(shape, 200, 40)).toEqual([17, 17, 17, 17]);
    expect(px(shape, 300, 136)).toEqual([53, 53, 53, 53]);
  });

  it('nests: a frozen interpolation interpolates again', () => {
    const frozen = lerpCornerShape(uniform('9999px'), uniform('8px'), 0.5); // 14 at 40px
    expect(px(lerpCornerShape(frozen, uniform('12px'), 0.5), 100, 40)).toEqual([13, 13, 13, 13]);
  });

  it('compares fixed and percent corners by value, interpolated ones by identity', () => {
    expect(cornerShapesEqual(uniform('8px'), uniform('8px'))).toBe(true);
    expect(cornerShapesEqual(uniform('8px'), uniform('12px'))).toBe(false);
    expect(cornerShapesEqual(uniform('9999px'), uniform('50%'))).toBe(true);
    const a = lerpCornerShape(uniform('8px'), uniform('12px'), 0.5);
    const b = lerpCornerShape(uniform('8px'), uniform('12px'), 0.5);
    expect(cornerShapesEqual(a, a)).toBe(true);
    expect(cornerShapesEqual(a, b)).toBe(false);
  });
});

describe('AnimatedShapeState', () => {
  const spec = () => spring({dampingRatio: 1, stiffness: 1600});
  const rest = uniform('9999px');
  const pressed = uniform('8px');
  const other = uniform('12px');

  it('starts at rest on its first shape and does nothing for the same target', () => {
    const state = new AnimatedShapeState(rest, spec, () => {});
    expect(state.progress.value).toBe(1);
    expect(state.atRest).toBe(true);
    expect(state.animateToShape(uniform('9999px'))).toBeUndefined();
    expect(state.progress.isRunning).toBe(false);
  });

  it('morphs from 0 to 1 towards a new target, from the shape it was showing', async () => {
    const state = new AnimatedShapeState(rest, spec, () => {});
    const done = state.animateToShape(pressed);
    expect(state.startShape).toBe(rest);
    expect(state.targetShape).toBe(pressed);
    expect(state.progress.value).toBe(0);
    expect(px(state.morphedShape(), 100, 40)).toEqual([20, 20, 20, 20]);
    await done;
    expect(state.atRest).toBe(true);
    expect(px(state.morphedShape(), 100, 40)).toEqual([8, 8, 8, 8]);
  });

  it('reversed mid-way, flips the progress and starts again from rest', async () => {
    setMotionDurationScale(10);
    const state = new AnimatedShapeState(rest, spec, () => {});
    void state.animateToShape(pressed);
    await nextFrame();
    await nextFrame();
    await nextFrame();
    const p = state.progress.value;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
    const before = px(state.morphedShape(), 100, 40)[0];
    void state.animateToShape(rest);
    // Same shape on screen: progress 1 - p from the pressed shape back to rest.
    expect(state.startShape).toBe(pressed);
    expect(state.targetShape).toBe(rest);
    // 1f - p, a Kotlin Float like every Animatable<Float> value.
    expect(state.progress.value).toBe(Math.fround(1 - p));
    expect(px(state.morphedShape(), 100, 40)[0]).toBeCloseTo(before, 5);
    // Compose's LaunchedEffect is cancelled before this runs, which resets the
    // Animatable's velocity: the reverse starts at rest, not with the momentum.
    expect(Math.abs(state.progress.velocity)).toBe(0);
  });

  it('a third shape mid-way freezes the visible shape and morphs from it', async () => {
    setMotionDurationScale(10);
    const state = new AnimatedShapeState(rest, spec, () => {});
    void state.animateToShape(pressed);
    await nextFrame();
    await nextFrame();
    await nextFrame();
    const before = px(state.morphedShape(), 100, 40)[0];
    void state.animateToShape(other);
    expect(state.targetShape).toBe(other);
    expect(state.progress.value).toBe(0);
    expect(px(state.startShape, 100, 40)[0]).toBeCloseTo(before, 9);
    expect(px(state.morphedShape(), 100, 40)[0]).toBeCloseTo(before, 9);
  });

  it('takes the end shape itself at the exact ends, without nesting', async () => {
    const state = new AnimatedShapeState(rest, spec, () => {});
    await state.animateToShape(pressed);
    void state.animateToShape(other);
    expect(state.startShape).toBe(pressed);
  });

  it('calls back on every frame', async () => {
    let frames = 0;
    const state = new AnimatedShapeState(rest, spec, () => frames++);
    await state.animateToShape(pressed);
    expect(frames).toBeGreaterThan(2);
  });
});
