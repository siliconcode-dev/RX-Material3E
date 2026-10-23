/*
 * Ported from androidx/graphics/graphics-shapes commonTest FloatMappingTest.kt.
 * Copyright 2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Upstream skips sourceWrapsTest and multiplePointTest on its JS target
 * because of float rounding near the wrap-around. This port does Kotlin's
 * 32-bit Float math, so both run here.
 */
import {describe, expect, it} from 'vitest';
import {DoubleMapper} from '../../src/shapes/graphics/index.js';
import {assertEqualish} from './test-utils.js';

const f = Math.fround;

function validateMapping(mapper: DoubleMapper, expectedFunction: (x: number) => number) {
  for (let i = 0; i <= 9999; i++) {
    const source = f(i / 10000);
    const target = expectedFunction(source);

    assertEqualish(target, mapper.map(source));
    assertEqualish(source, mapper.mapBack(target));
  }
}

describe('FloatMapping', () => {
  it('identityMappingTest', () => validateMapping(DoubleMapper.Identity, (x) => x));

  it('simpleMappingTest', () =>
    validateMapping(
      // Map the first half of the source to the first quarter of the target.
      new DoubleMapper([0, 0], [0.5, 0.25]),
      (x) => (x < 0.5 ? f(x / 2) : f(f(f(3 * x) - 1) / 2)),
    ));

  it('targetWrapsTest', () =>
    validateMapping(
      // The mapping applies a "+ 0.5f".
      new DoubleMapper([0, 0.5], [0.1, 0.6]),
      (x) => f(f(x + 0.5) % 1),
    ));

  it('sourceWrapsTest', () =>
    validateMapping(
      // Values on the source wrap (this is still the "+ 0.5f" function).
      new DoubleMapper([0.5, 0], [0.1, 0.6]),
      (x) => f(f(x + 0.5) % 1),
    ));

  it('bothWrapTest', () =>
    validateMapping(
      // Just the identity function.
      new DoubleMapper([0.5, 0.5], [0.75, 0.75], [0.1, 0.1], [0.49, 0.49]),
      (x) => x,
    ));

  it('multiplePointTest', () =>
    validateMapping(new DoubleMapper([0.4, 0.2], [0.5, 0.22], [0, 0.8]), (x) => {
      if (x < f(0.4)) {
        return f(f(f(0.8) + x) % 1);
      } else if (x < f(0.5)) {
        return f(f(0.2) + f(f(x - f(0.4)) / 5));
      } else {
        // Maps a change of 0.5 in the source to a change 0.58 in the target, hence the 1.16.
        return f(f(0.22) + f(f(x - 0.5) * f(1.16)));
      }
    }));

  it('targetDoubleWrapThrows', () => {
    expect(() => new DoubleMapper([0, 0], [0.3, 0.6], [0.6, 0.3], [0.9, 0.9])).toThrow();
  });

  it('sourceDoubleWrapThrows', () => {
    expect(() => new DoubleMapper([0, 0], [0.6, 0.3], [0.3, 0.6], [0.9, 0.9])).toThrow();
  });
});
