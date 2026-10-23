/*
 * Ported by hand from androidx/compose/animation ColorVectorConverter.kt
 * (Color.VectorConverter, what animateColorAsState animates) and
 * compose/ui/ui-graphics colorspace/Oklab.kt and Rgb.kt (the sRGB
 * transfer function).
 * Copyright 2019-2023 The Android Open Source Project. Licensed under the Apache License 2.0.
 *
 * Compose animates a color as four numbers, alpha and the Oklab L, a and b
 * of the color without its alpha, each on its own spring, and clamps them
 * on the way back. Compose reaches Oklab from sRGB through XYZ (D50), with a
 * Bradford adaptation folded into its M1 matrix, in 32-bit floats and a fast
 * cube root; the net transform is Oklab from linear sRGB, which is done here
 * in doubles. The two differ far below one step of an 8-bit channel.
 */

/** An sRGB color with straight (not premultiplied) alpha, every channel 0 to 1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// sRGB's transfer function (ColorSpaces.Srgb: gamma 2.4, the usual constants).
const toLinear = (c: number) => (c >= 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92);
const fromLinear = (c: number) => (c >= 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c);

/** Color.VectorConverter's convertToVector: [alpha, L, a, b]. */
export function colorToVector(color: Rgba): [number, number, number, number] {
  const r = toLinear(clamp(color.r, 0, 1));
  const g = toLinear(clamp(color.g, 0, 1));
  const b = toLinear(clamp(color.b, 0, 1));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  // Oklab's M2.
  return [
    color.alpha,
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Color.VectorConverter's convertFromVector: clamps L to 0..1, a and b to ±0.5, alpha to 0..1. */
export function vectorToColor(vector: readonly number[]): Rgba {
  const L = clamp(vector[1], 0, 1);
  const A = clamp(vector[2], -0.5, 0.5);
  const B = clamp(vector[3], -0.5, 0.5);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  // Converting to sRGB clamps each channel to the color space's 0..1.
  const channel = (v: number) => clamp(fromLinear(clamp(v, 0, 1)), 0, 1);
  return {
    r: channel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: channel(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: channel(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha: clamp(vector[0], 0, 1),
  };
}

/** Color.Transparent: black at alpha 0. */
export const Transparent: Rgba = Object.freeze({r: 0, g: 0, b: 0, alpha: 0});

/** Reads a computed CSS color (`rgb()`, `rgba()` or `color(srgb …)`), or null. */
export function parseCssColor(value: string): Rgba | null {
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(
    value.trim(),
  );
  if (rgb) {
    return {
      r: Number(rgb[1]) / 255,
      g: Number(rgb[2]) / 255,
      b: Number(rgb[3]) / 255,
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  const srgb =
    /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(
      value.trim(),
    );
  if (srgb) {
    return {
      r: Number(srgb[1]),
      g: Number(srgb[2]),
      b: Number(srgb[3]),
      alpha: srgb[4] === undefined ? 1 : Number(srgb[4]),
    };
  }
  return null;
}

/** A CSS color for `color`. */
export function cssColor(color: Rgba): string {
  return `color(srgb ${color.r} ${color.g} ${color.b} / ${color.alpha})`;
}
