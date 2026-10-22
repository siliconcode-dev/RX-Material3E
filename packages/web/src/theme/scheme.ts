// Builds Material color schemes from a seed color with Google's
// material-color-utilities, the same engine behind Compose's
// dynamicColorScheme and Android's dynamic color.

import {
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  SchemeContent,
  SchemeExpressive,
  SchemeFidelity,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeRainbow,
  SchemeTonalSpot,
  SchemeVibrant,
  argbFromHex,
  hexFromArgb,
  sourceColorFromImage,
  type DynamicColor,
} from '@material/material-color-utilities';

/** Scheme styles. `tonal-spot` is the Material default. */
export const SCHEME_VARIANTS = [
  'tonal-spot',
  'neutral',
  'vibrant',
  'expressive',
  'fidelity',
  'content',
  'rainbow',
  'fruit-salad',
  'monochrome',
] as const;
export type SchemeVariant = (typeof SCHEME_VARIANTS)[number];

/** Color spec. `2025` is the Material 3 Expressive spec; `2021` is baseline M3. */
export type SpecVersion = '2021' | '2025';

export interface ThemeOptions {
  /** Seed color as hex, e.g. `#0b57d0`. */
  source: string;
  variant?: SchemeVariant;
  /** -1 (reduced) to 1 (high). 0 is standard, 0.5 medium, 1 high. */
  contrast?: number;
  spec?: SpecVersion;
}

/** Color roles as `--md-sys-color-*` custom properties mapped to hex values. */
export type ColorScheme = Record<`--md-sys-color-${string}`, string>;

const SCHEMES: Record<
  SchemeVariant,
  new (source: Hct, isDark: boolean, contrast: number, spec?: SpecVersion) => DynamicScheme
> = {
  'tonal-spot': SchemeTonalSpot,
  neutral: SchemeNeutral,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  rainbow: SchemeRainbow,
  'fruit-salad': SchemeFruitSalad,
  monochrome: SchemeMonochrome,
};

const colors = new MaterialDynamicColors();

// `allColors` leaves out a few roles the Compose tokens still use. The `*_dim`
// roles belong to the 2025 spec; older specs still return values for them, so
// they are skipped there.
const ROLES: DynamicColor[] = [
  ...colors.allColors,
  colors.surfaceVariant(),
  colors.surfaceTint(),
  colors.scrim(),
].filter((c): c is DynamicColor => c !== undefined);

const kebab = (name: string) => name.replace(/_/g, '-');

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Creates the light or dark color scheme for `options`. */
export function createScheme(options: ThemeOptions, dark: boolean): ColorScheme {
  const {source, variant = 'tonal-spot', contrast = 0, spec = '2025'} = options;
  const Scheme = SCHEMES[variant];
  if (!Scheme) throw new Error(`Unknown scheme variant: ${variant}`);
  const scheme = new Scheme(Hct.fromInt(argbFromHex(source)), dark, clamp(contrast, -1, 1), spec);
  const result: ColorScheme = {};
  for (const role of ROLES) {
    if (spec !== '2025' && role.name.endsWith('_dim')) continue;
    result[`--md-sys-color-${kebab(role.name)}`] = hexFromArgb(role.getArgb(scheme));
  }
  return result;
}

const declarations = (scheme: ColorScheme, mode: 'light' | 'dark') =>
  [`  color-scheme: ${mode};`, ...Object.entries(scheme).map(([k, v]) => `  ${k}: ${v};`)].join(
    '\n',
  );

/**
 * CSS for both schemes, following the same rules as `@rx-m3e/tokens/color.css`:
 * light by default, dark when the OS prefers it unless `data-theme="light"` is
 * set, and dark whenever `data-theme="dark"` is set on the selected element.
 */
export function themeCss(options: ThemeOptions, selector = ':root'): string {
  const light = declarations(createScheme(options, false), 'light');
  const dark = declarations(createScheme(options, true), 'dark');
  // :host only takes extra conditions in its functional form.
  const where = (condition: string) =>
    selector === ':host' ? `:host(${condition})` : `${selector}${condition}`;
  return [
    `${selector} {\n${light}\n}`,
    `@media (prefers-color-scheme: dark) {\n${where(':not([data-theme="light"])')} {\n${dark}\n}\n}`,
    `${where('[data-theme="dark"]')} {\n${dark}\n}`,
  ].join('\n');
}

/** Picks a seed color from an image, as Android does from the wallpaper. */
export async function sourceFromImage(image: HTMLImageElement): Promise<string> {
  return hexFromArgb(await sourceColorFromImage(image));
}
