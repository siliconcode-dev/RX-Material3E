import {expect} from 'vitest';

/**
 * Checks numbers against Kotlin output. The port does Kotlin's 32-bit Float
 * math step for step, so every value must be the same 32-bit float, not
 * merely close. Kotlin prints the shortest decimal that reads back as its
 * Float, so rounding the parsed JSON to 32 bits gives Kotlin's exact value.
 */
export function expectFloatsEqual(
  actual: readonly number[],
  expected: readonly number[],
  label: string,
) {
  expect(actual.length, `${label} length`).toBe(expected.length);
  actual.forEach((value, i) => {
    expect(Math.fround(value), `${label}[${i}]: ${value} vs. Kotlin ${expected[i]}`).toBe(
      Math.fround(expected[i]),
    );
  });
}
