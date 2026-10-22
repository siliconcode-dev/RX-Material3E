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
  return m && '#' + m.slice(1).map((v) => (+v).toString(16).padStart(2, '0')).join('');
};

// Compose maps both typefaces to the platform sans serif. On the web we use
// Google Sans Flex (OFL-1.1), with Noto Sans for scripts it does not cover.
// The library does not ship font files; apps load them.
const FONT_FAMILY = {SansSerif: "'Google Sans Flex', 'Noto Sans', system-ui, sans-serif"};
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
  if ((m = /^RoundedCornerShape\(\s*topStart = ([\d.]+)\.dp, topEnd = ([\d.]+)\.dp, bottomEnd = ([\d.]+)\.dp, bottomStart = ([\d.]+)\.dp,?\s*\)$/.exec(expr)))
    return m.slice(1).map((v) => px(+v)).join(' ');
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
for (const [k, v] of Object.entries(objects.PaletteTokens)) ref[`--md-ref-palette-${kebab(k)}`] = hex(v);
for (const [k, v] of Object.entries(objects.TypefaceTokens)) ref[`--md-ref-typeface-${kebab(k)}`] = resolve(v);

const colorScheme = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [`--md-sys-color-${kebab(k)}`, resolve(v)]));
const light = colorScheme(objects.ColorLightTokens);
const dark = colorScheme(objects.ColorDarkTokens);

const sys = {};
for (const [k, v] of Object.entries(objects.TypeScaleTokens)) {
  const name = `--md-sys-typescale-${kebab(k.replace(/(Font|LineHeight|Size|Tracking|Weight)$/, ''))}-${kebab(k.match(/(Font|LineHeight|Size|Tracking|Weight)$/)[1])}`;
  sys[name] = resolve(v);
}
for (const [k, v] of Object.entries(objects.ShapeTokens)) sys[`--md-sys-shape-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.ElevationTokens)) sys[`--md-sys-elevation-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.StateTokens)) sys[`--md-sys-state-${kebab(k)}`] = resolve(v);
for (const [k, v] of Object.entries(objects.MotionTokens)) {
  if (k.startsWith('Duration')) sys[`--md-sys-motion-duration-${kebab(k.slice(8))}`] = `${num(v)}ms`;
  else sys[`--md-sys-motion-easing-${kebab(k.slice(6).replace(/CubicBezier$/, ''))}`] = resolve(v);
}

// Expressive motion springs. CSS has no spring timing function, so each spring
// is sampled into a `linear()` easing plus the duration it takes to settle.
function spring(stiffness, dampingRatio) {
  const w0 = Math.sqrt(stiffness);
  const dt = 1 / 600;
  let x = 0, v = 0, t = 0;
  const samples = [];
  let settled = 0;
  while (t < 3) {
    const a = stiffness * (1 - x) - 2 * dampingRatio * w0 * v;
    v += a * dt;
    x += v * dt;
    t += dt;
    samples.push([t, x]);
    if (Math.abs(1 - x) < 0.001 && Math.abs(v) < 0.01) {
      if (++settled > 30) break;
    } else settled = 0;
  }
  const dur = samples.at(-1)[0];
  const step = Math.max(1, Math.floor(samples.length / 48));
  const pts = ['0'];
  for (let i = step; i < samples.length - 1; i += step) pts.push(+samples[i][1].toFixed(4));
  pts.push('1');
  return {duration: `${Math.round(dur * 1000)}ms`, easing: `linear(${pts.join(', ')})`};
}
for (const speed of ['Default', 'Fast', 'Slow']) {
  for (const kind of ['Spatial', 'Effects']) {
    const s = objects.ExpressiveMotionTokens;
    const damping = num(s[`Spring${speed}${kind}Damping`]);
    const stiffness = num(s[`Spring${speed}${kind}Stiffness`]);
    const base = `--md-sys-motion-spring-${speed.toLowerCase()}-${kind.toLowerCase()}`;
    const {duration, easing} = spring(stiffness, damping);
    Object.assign(sys, {
      [`${base}-damping`]: String(damping),
      [`${base}-stiffness`]: String(stiffness),
      [`${base}-duration`]: duration,
      [`${base}-easing`]: easing,
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Component tokens.

const SYSTEM_OBJECTS = new Set([
  'PaletteTokens', 'TypefaceTokens', 'ColorLightTokens', 'ColorDarkTokens', 'TypeScaleTokens',
  'TypographyTokens', 'ShapeTokens', 'ElevationTokens', 'StateTokens', 'MotionTokens',
  'ExpressiveMotionTokens', 'StandardMotionTokens', 'ColorSchemeKeyTokens', 'ShapeKeyTokens',
  'TypographyKeyTokens', 'MotionSchemeKeyTokens',
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

// ---------------------------------------------------------------------------
// 5. Write outputs.

const header = (title) =>
  `/**\n * ${title}\n * Generated by scripts/extract-compose-tokens.mjs from androidx@${commit}.\n * DO NOT EDIT BY HAND. Source tokens: Apache-2.0, The Android Open Source Project.\n */\n`;
const block = (sel, vars, indent = '  ') =>
  `${sel} {\n${Object.entries(vars).map(([k, v]) => `${indent}${k}: ${v};`).join('\n')}\n}\n`;

mkdirSync(join(outDir, 'css'), {recursive: true});
mkdirSync(join(outDir, 'src'), {recursive: true});

writeFileSync(join(outDir, 'css/ref.css'), header('Reference tokens: tonal palettes and typefaces.') + block(':root', ref));
writeFileSync(
  join(outDir, 'css/sys.css'),
  header('System tokens: typescale, shape, elevation, state and motion.') + block(':root', sys),
);
writeFileSync(
  join(outDir, 'css/color.css'),
  header('System color tokens. Light by default; dark follows the OS unless data-theme="light" is set.') +
    block(':root', light) +
    '\n@media (prefers-color-scheme: dark) {\n' +
    block(':root:not([data-theme="light"])', dark, '    ').replace(/^/gm, '  ').trimEnd() +
    '\n}\n\n' +
    block(':root[data-theme="dark"]', dark),
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
writeFileSync(
  join(outDir, 'css/theme.css'),
  header('Full theme: reference, system and color tokens.') +
    "@import './ref.css';\n@import './sys.css';\n@import './color.css';\n",
);

const json = {source: {repo: 'androidx/androidx', commit, path: 'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens'}, ref, sys, color: {light, dark}, components};
writeFileSync(join(outDir, 'src/tokens.json'), JSON.stringify(json, null, 2) + '\n');
writeFileSync(join(outDir, 'src/raw-compose-tokens.json'), JSON.stringify(objects, null, 2) + '\n');

const compCount = Object.values(components).reduce((n, c) => n + Object.keys(c).length, 0);
console.log(
  `objects: ${Object.keys(objects).length}, ref: ${Object.keys(ref).length}, sys: ${Object.keys(sys).length}, ` +
    `color: ${Object.keys(light).length}, component sets: ${Object.keys(components).length}, component tokens: ${compCount}`,
);
if (unresolved.length) {
  console.log(`unresolved (${unresolved.length}):\n  ` + unresolved.join('\n  '));
}
