#!/usr/bin/env node
// Converts the generated design-token objects in Jetpack Compose Material3
// (androidx/compose/material3/tokens/*.kt) into CSS custom properties and JSON.
//
// Usage:
//   node scripts/extract-compose-tokens.mjs <path-to-compose-tokens-dir> [androidx-commit]
//
// Source tokens are Apache-2.0, Copyright The Android Open Source Project.

import {readFileSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {springTiming} from '../packages/web/src/motion/spring.ts';

const [srcDir, commit = 'unknown'] = process.argv.slice(2);
if (!srcDir) {
  console.error('usage: extract-compose-tokens.mjs <compose-tokens-dir> [commit]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'packages/tokens');

const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
const num = (s) => Number(String(s).replace(/f$/, ''));
const px = (n) => `${+n.toFixed(4)}px`;
const rem = (n) => `${+(n / 16).toFixed(4)}rem`;

// ---------------------------------------------------------------------------
// 1. Parse every `object XxxTokens { ... }` into {Name: rawExpression}.

const objects = {};
for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.kt'))) {
  const text = readFileSync(join(srcDir, file), 'utf8');
  const obj = /object (\w+)\s*\{([\s\S]*)\}\s*$/.exec(text);
  if (!obj) continue;
  const body = obj[2].replace(/\s+/g, ' ');
  const entries = {};
  const re =
    /(?:inline |const )?val (\w+)(?::\s*[\w.]+)?\s*(?:get\(\)\s*)?=\s*((?:[^()\s]|\([^()]*(?:\([^()]*\)[^()]*)*\))+)/g;
  for (const m of body.matchAll(re)) entries[m[1]] = m[2].trim();
  objects[obj[1]] = entries;
}

// ---------------------------------------------------------------------------
// 2. Resolve raw Kotlin expressions to CSS values.

const hex = (expr) => {
  const m = /Color\(red = (\d+), green = (\d+), blue = (\d+)\)/.exec(expr);
  return (
    m &&
    '#' +
      m
        .slice(1)
        .map((v) => (+v).toString(16).padStart(2, '0'))
        .join('')
  );
};

// Compose maps both typefaces to the platform sans serif. On the web:
//   English: Google Sans Flex, falling back to Noto Sans.
//   Any other language: the Noto Sans family.
// Text marked with a non-English `lang` switches to the Noto stack; unmarked
// non-Latin text still reaches the right Noto script font through per-glyph
// fallback. The library ships no font files (see css/fonts.css).
const NOTO_FAMILIES = [
  'Noto Sans',
  'Noto Sans Bengali',
  'Noto Sans Devanagari',
  'Noto Sans Arabic',
  'Noto Sans Hebrew',
  'Noto Sans Thai',
  'Noto Sans Tamil',
  'Noto Sans Telugu',
  'Noto Sans Gujarati',
  'Noto Sans Gurmukhi',
  'Noto Sans Kannada',
  'Noto Sans Malayalam',
  'Noto Sans Oriya',
  'Noto Sans Sinhala',
  'Noto Sans Khmer',
  'Noto Sans Lao',
  'Noto Sans Myanmar',
  'Noto Sans Ethiopic',
  'Noto Sans Georgian',
  'Noto Sans Armenian',
  'Noto Sans SC',
  'Noto Sans TC',
  'Noto Sans HK',
  'Noto Sans JP',
  'Noto Sans KR',
];
const quote = (families) => families.map((f) => `'${f}'`).join(', ');
const ENGLISH_STACK = `'Google Sans Flex', ${quote(NOTO_FAMILIES)}, system-ui, sans-serif`;
const OTHER_STACK = `${quote(NOTO_FAMILIES)}, system-ui, sans-serif`;
const FONT_FAMILY = {SansSerif: ENGLISH_STACK};
const FONT_WEIGHT = {Normal: '400', Medium: '500', Bold: '700'};
const TYPE_PARTS = ['Font', 'Size', 'LineHeight', 'Weight', 'Tracking'];

function resolve(expr) {
  let m;
  if ((m = /^(-?[\d.]+)\.dp$/.exec(expr))) return px(+m[1]);
  if ((m = /^(-?[\d.]+)\.sp$/.exec(expr))) return rem(+m[1]);
  if ((m = /^-([\d.]+)\.sp$/.exec(expr))) return rem(-m[1]);
  if (/^-?[\d.]+f?$/.test(expr)) return String(num(expr));
  if (expr.startsWith('Color(')) return hex(expr);
  if ((m = /^PaletteTokens\.(\w+)$/.exec(expr))) return `var(--md-ref-palette-${kebab(m[1])})`;
  if ((m = /^ColorSchemeKeyTokens\.(\w+)$/.exec(expr))) return `var(--md-sys-color-${kebab(m[1])})`;
  if ((m = /^ShapeKeyTokens\.(\w+)$/.exec(expr))) return `var(--md-sys-shape-${kebab(m[1])})`;
  if ((m = /^ShapeTokens\.(\w+)$/.exec(expr))) return `var(--md-sys-shape-${kebab(m[1])})`;
  if ((m = /^ElevationTokens\.(\w+)$/.exec(expr))) return `var(--md-sys-elevation-${kebab(m[1])})`;
  if ((m = /^TypefaceTokens\.(\w+)$/.exec(expr))) return `var(--md-ref-typeface-${kebab(m[1])})`;
  if ((m = /^FontFamily\.(\w+)$/.exec(expr))) return FONT_FAMILY[m[1]];
  if ((m = /^FontWeight\.(\w+)$/.exec(expr))) return FONT_WEIGHT[m[1]];
  if ((m = /^CubicBezierEasing\(([^)]*)\)$/.exec(expr)))
    return `cubic-bezier(${m[1].split(',').map(num).join(', ')})`;
  if ((m = /^RoundedCornerShape\(([\d.]+)\.dp\)$/.exec(expr))) return px(+m[1]);
  if ((m = /^CornerSize\(([\d.]+)\.dp\)$/.exec(expr))) return px(+m[1]);
  if (
    (m =
      /^RoundedCornerShape\(\s*topStart = ([\d.]+)\.dp, topEnd = ([\d.]+)\.dp, bottomEnd = ([\d.]+)\.dp, bottomStart = ([\d.]+)\.dp,?\s*\)$/.exec(
        expr,
      ))
  )
    return m
      .slice(1)
      .map((v) => px(+v))
      .join(' ');
  if (expr === 'CircleShape') return '9999px';
  if (expr === 'RectangleShape') return '0px';
  if ((m = /^(\w+Tokens)\.(\w+)$/.exec(expr)) && objects[m[1]])
    return `var(--md-comp-${kebab(m[1].replace(/Tokens$/, ''))}-${kebab(m[2])})`;
  return null;
}

const unresolved = [];

// ---------------------------------------------------------------------------
// 3. Reference + system tokens.

const ref = {};
for (const [k, v] of Object.entries(objects.PaletteTokens))
  ref[`--md-ref-palette-${kebab(k)}`] = hex(v);
for (const [k, v] of Object.entries(objects.TypefaceTokens))
  ref[`--md-ref-typeface-${kebab(k)}`] = resolve(v);

// A bare name (SurfaceTint = Primary) points at another role in the same scheme.
const colorScheme = (o) =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      `--md-sys-color-${kebab(k)}`,
      v in o ? `var(--md-sys-color-${kebab(v)})` : resolve(v),
    ]),
  );
const light = colorScheme(objects.ColorLightTokens);
const dark = colorScheme(objects.ColorDarkTokens);

const sys = {};
for (const [k, v] of Object.entries(objects.TypeScaleTokens)) {
  const name = `--md-sys-typescale-${kebab(k.replace(/(Font|LineHeight|Size|Tracking|Weight)$/, ''))}-${kebab(k.match(/(Font|LineHeight|Size|Tracking|Weight)$/)[1])}`;
  sys[name] = resolve(v);
}
for (const [k, v] of Object.entries(objects.ShapeTokens))
  sys[`--md-sys-shape-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.ElevationTokens))
  sys[`--md-sys-elevation-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.StateTokens))
  sys[`--md-sys-state-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.MotionTokens)) {
  if (k.startsWith('Duration'))
    sys[`--md-sys-motion-duration-${kebab(k.slice(8))}`] = `${num(v)}ms`;
  else sys[`--md-sys-motion-easing-${kebab(k.slice(6).replace(/CubicBezier$/, ''))}`] = resolve(v);
}

// Motion springs. CSS has no spring timing function, so each spring is turned
// into a duration and a `linear()` easing by the library's port of Compose's
// spring (packages/web/src/motion/spring.ts): the same values Compose
// computes, millisecond by millisecond, ending when Compose ends it. Compose
// stops a spring within 0.01 of its target in the value's own unit, so the
// duration depends on the distance. The tokens use a 100dp move for spatial
// springs and a 0 to 1 change (an alpha) for effects springs.
const SpatialTokenDistance = 100;
const EffectsTokenDistance = 1;
function motionSprings(tokens) {
  const out = {};
  for (const speed of ['Default', 'Fast', 'Slow']) {
    for (const kind of ['Spatial', 'Effects']) {
      const damping = num(tokens[`Spring${speed}${kind}Damping`]);
      const stiffness = num(tokens[`Spring${speed}${kind}Stiffness`]);
      const base = `--md-sys-motion-spring-${speed.toLowerCase()}-${kind.toLowerCase()}`;
      const to = kind === 'Spatial' ? SpatialTokenDistance : EffectsTokenDistance;
      const {duration, easing} = springTiming(damping, stiffness, {to});
      Object.assign(out, {
        [`${base}-damping`]: String(damping),
        [`${base}-stiffness`]: String(stiffness),
        [`${base}-duration`]: `${duration}ms`,
        [`${base}-easing`]: easing,
      });
    }
  }
  return out;
}
// Expressive is the default (M3 Expressive); data-motion-scheme="standard"
// switches to the standard scheme, like Compose's MotionScheme.standard().
Object.assign(sys, motionSprings(objects.ExpressiveMotionTokens));
const standardMotion = motionSprings(objects.StandardMotionTokens);

// ---------------------------------------------------------------------------
// 4. Component tokens.

const SYSTEM_OBJECTS = new Set([
  'PaletteTokens',
  'TypefaceTokens',
  'ColorLightTokens',
  'ColorDarkTokens',
  'TypeScaleTokens',
  'TypographyTokens',
  'ShapeTokens',
  'ElevationTokens',
  'StateTokens',
  'MotionTokens',
  'ExpressiveMotionTokens',
  'StandardMotionTokens',
  'ColorSchemeKeyTokens',
  'ShapeKeyTokens',
  'TypographyKeyTokens',
  'MotionSchemeKeyTokens',
]);

const components = {};
for (const [obj, entries] of Object.entries(objects).sort()) {
  if (SYSTEM_OBJECTS.has(obj)) continue;
  const comp = kebab(obj.replace(/Tokens$/, ''));
  const out = (components[comp] = {});
  for (const [k, v] of Object.entries(entries)) {
    const t = /^TypographyKeyTokens\.(\w+)$/.exec(v);
    if (t) {
      const prop = kebab(k.replace(/Font$/, ''));
      const scale = kebab(t[1]);
      for (const part of TYPE_PARTS)
        out[`${prop}-${kebab(part)}`] = `var(--md-sys-typescale-${scale}-${kebab(part)})`;
      continue;
    }
    if (/^MotionSchemeKeyTokens\./.test(v)) {
      out[kebab(k)] = v.split('.')[1].toLowerCase();
      continue;
    }
    const r = resolve(v);
    if (r == null) unresolved.push(`${obj}.${k} = ${v}`);
    else out[kebab(k)] = r;
  }
}

// Refuse to write anything if a value could not be converted.
for (const [group, vars] of Object.entries({ref, sys, light, dark})) {
  for (const [k, v] of Object.entries(vars)) if (v == null) unresolved.push(`${group}: ${k}`);
}
if (unresolved.length) {
  console.error(`unresolved (${unresolved.length}):\n  ` + unresolved.join('\n  '));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 5. Write outputs.

const header = (title) =>
  `/**\n * ${title}\n * Generated by scripts/extract-compose-tokens.mjs from androidx@${commit}.\n * DO NOT EDIT BY HAND. Source tokens: Apache-2.0, The Android Open Source Project.\n */\n`;
const block = (sel, vars, indent = '  ') =>
  `${sel} {\n${Object.entries(vars)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n')}\n}\n`;

mkdirSync(join(outDir, 'css'), {recursive: true});
mkdirSync(join(outDir, 'src'), {recursive: true});

writeFileSync(
  join(outDir, 'css/ref.css'),
  header('Reference tokens: tonal palettes and typefaces.') + block(':root', ref),
);
writeFileSync(
  join(outDir, 'css/sys.css'),
  header('System tokens: typescale, shape, elevation, state and motion.') +
    block(':root', sys) +
    '\n/* The standard motion scheme, for a page or a part of one. */\n' +
    block('[data-motion-scheme="standard"]', standardMotion),
);
writeFileSync(
  join(outDir, 'css/color.css'),
  header(
    'System color tokens. Light by default; dark follows the OS unless data-theme="light" is set.',
  ) +
    block(':root', {'color-scheme': 'light', ...light}) +
    '\n@media (prefers-color-scheme: dark) {\n' +
    block(':root:not([data-theme="light"])', {'color-scheme': 'dark', ...dark})
      .replace(/^/gm, '  ')
      .trimEnd() +
    '\n}\n\n' +
    block(':root[data-theme="dark"]', {'color-scheme': 'dark', ...dark}),
);
writeFileSync(
  join(outDir, 'css/components.css'),
  header('Component tokens (reference values; components read these as fallbacks).') +
    block(
      ':root',
      Object.fromEntries(
        Object.entries(components).flatMap(([c, vars]) =>
          Object.entries(vars).map(([k, v]) => [`--md-comp-${c}-${k}`, v]),
        ),
      ),
    ),
);
// A custom property's var() is resolved where it is declared, so switching the
// typeface under [lang] must re-declare the typescale font tokens there too.
const typefaceVars = (stack) => ({
  '--md-ref-typeface-brand': stack,
  '--md-ref-typeface-plain': stack,
  ...Object.fromEntries(
    Object.entries(sys).filter(([k]) => /^--md-sys-typescale-.*-font$/.test(k)),
  ),
});
// Chinese, Japanese and Korean share Han code points, so the first CJK family
// in the stack decides their glyph shapes. Put the matching one first.
const CJK = [
  ['[lang]:lang(ja)', 'Noto Sans JP'],
  ['[lang]:lang(ko)', 'Noto Sans KR'],
  ['[lang]:lang(zh-TW), [lang]:lang(zh-Hant)', 'Noto Sans TC'],
  ['[lang]:lang(zh-HK), [lang]:lang(zh-MO)', 'Noto Sans HK'],
];
const cjkStack = (first) =>
  `${quote([first, ...NOTO_FAMILIES.filter((f) => f !== first)])}, system-ui, sans-serif`;
writeFileSync(
  join(outDir, 'css/typeface.css'),
  header(
    'Language-aware typefaces: Google Sans Flex for English, the Noto Sans family for other languages.',
  ) +
    [
      block('[lang]:not(:lang(en))', typefaceVars(OTHER_STACK)),
      ...CJK.map(([sel, first]) => block(sel, typefaceVars(cjkStack(first)))),
      block('[lang]:lang(en)', typefaceVars(ENGLISH_STACK)),
    ].join('\n'),
);

// One class per typescale role, e.g. .rx-typescale-body-large and
// .rx-typescale-body-large-emphasized, for text outside components.
const TYPE_PROPS = {
  'font-family': 'font',
  'font-size': 'size',
  'line-height': 'line-height',
  'font-weight': 'weight',
  'letter-spacing': 'tracking',
};
const typescaleRoles = [
  ...new Set(
    Object.keys(sys)
      .filter((k) => k.startsWith('--md-sys-typescale-'))
      .map((k) =>
        k
          .slice('--md-sys-typescale-'.length)
          .replace(/-(font|size|line-height|weight|tracking)$/, ''),
      ),
  ),
];
writeFileSync(
  join(outDir, 'css/typescale.css'),
  header('Typescale classes: .rx-typescale-<role>, including the expressive -emphasized roles.') +
    typescaleRoles
      .map((role) =>
        block(
          `.rx-typescale-${role}`,
          Object.fromEntries(
            Object.entries(TYPE_PROPS).map(([prop, part]) => [
              prop,
              `var(--md-sys-typescale-${role}-${part})`,
            ]),
          ),
        ),
      )
      .join('\n'),
);

const googleFamilies = [
  'Google+Sans+Flex:opsz,wght,ROND@6..144,1..1000,0..100',
  ...NOTO_FAMILIES.map((f) => `${f.replaceAll(' ', '+')}:wght@100..900`),
];
writeFileSync(
  join(outDir, 'css/fonts.css'),
  header(
    'Optional: loads every typeface the tokens name from Google Fonts. Browsers only download the subsets a page uses.',
  ) +
    `@import url('https://fonts.googleapis.com/css2?${googleFamilies.map((f) => `family=${f}`).join('&')}&display=swap');\n`,
);

// Optional icon font for <rx-icon>: Material Symbols Rounded with every
// axis. It is large (about 5 MB); apps that know their icons should load it
// from Google Fonts with &icon_names=home,search,... instead.
writeFileSync(
  join(outDir, 'css/icons.css'),
  header('Optional: loads the full Material Symbols Rounded font (about 5 MB) for <rx-icon>.') +
    "@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block');\n",
);

writeFileSync(
  join(outDir, 'css/theme.css'),
  header(
    'Full theme: reference, system, typeface and color tokens. Fonts are loaded separately (fonts.css).',
  ) +
    "@import './ref.css';\n@import './sys.css';\n@import './typeface.css';\n@import './color.css';\n",
);

const json = {
  source: {
    repo: 'androidx/androidx',
    commit,
    path: 'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens',
  },
  ref,
  sys,
  standardMotion,
  color: {light, dark},
  components,
};
writeFileSync(join(outDir, 'src/tokens.json'), JSON.stringify(json, null, 2) + '\n');
writeFileSync(join(outDir, 'src/raw-compose-tokens.json'), JSON.stringify(objects, null, 2) + '\n');

const compCount = Object.values(components).reduce((n, c) => n + Object.keys(c).length, 0);
console.log(
  `objects: ${Object.keys(objects).length}, ref: ${Object.keys(ref).length}, sys: ${Object.keys(sys).length}, ` +
    `color: ${Object.keys(light).length}, component sets: ${Object.keys(components).length}, component tokens: ${compCount}`,
);
