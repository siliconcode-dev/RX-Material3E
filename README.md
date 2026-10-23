<p align="center">
  <img src="assets/logo.png" alt="RXM3E" width="240">
</p>

# RX-Material3E

Material 3 and Material 3 Expressive as framework-free web components. Each component is ported by hand from Google's Jetpack Compose Material3 source, with Material Components for Android as a second reference.

This project is not affiliated with or endorsed by Google.

## Status

Steps 1 to 14 of 79 done. Live demo: https://rx-material3e.ashfaqizop.workers.dev See [ROADMAP.md](ROADMAP.md) for the step-by-step plan and [COMPONENTS.md](COMPONENTS.md) for the full catalog.

| Package          | What it is                                                     | Status                            |
| ---------------- | -------------------------------------------------------------- | --------------------------------- |
| `@rx-m3e/tokens` | All M3 and M3E design tokens as CSS custom properties and JSON | Ready                             |
| `@rx-m3e/web`    | The web components (`rx-*` elements)                           | Package set up, no components yet |

## Tokens

`packages/tokens` is generated from the 119 token objects in Compose Material3. Nothing in it is typed by hand.

```html
<link rel="stylesheet" href="@rx-m3e/tokens/theme.css" />
```

| File                 | Contents                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `css/ref.css`        | Tonal palettes (`--md-ref-palette-*`) and typefaces                                                                    |
| `css/sys.css`        | Typescale (incl. emphasized), shape corners, elevation levels, state opacities, durations, easings, expressive springs |
| `css/typeface.css`   | Language rules: English uses Google Sans Flex, other languages use Noto Sans                                           |
| `css/fonts.css`      | Optional Google Fonts loader for every family above                                                                    |
| `css/color.css`      | Light and dark color roles. Follows the OS; force with `data-theme="light"` or `"dark"` on `<html>`                    |
| `css/components.css` | 2,430 component tokens (`--md-comp-*`) across 104 sets, for reference                                                  |
| `src/tokens.json`    | Everything above as JSON, plus the source commit                                                                       |

CSS has no spring timing function, so each expressive spring (fast, default, slow; spatial and effects) is simulated and exported as a `linear()` easing with a matching duration:

```css
transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
  var(--md-sys-motion-spring-fast-spatial-easing);
```

Run `npm run dev` and open `/demo/tokens.html` to see the colors, typescale, corners, springs and language fonts.

### Fonts

| Text               | Font                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| English            | Google Sans Flex, falling back to Noto Sans                                           |
| Any other language | The Noto Sans family (Noto Sans, Noto Sans Bengali, Devanagari, Arabic, CJK and more) |

Mark text with its language and the right font follows: `<p lang="bn">`, `<html lang="ar">` and so on. Text without a `lang` uses the English stack, but any script Google Sans Flex can't draw (Bangla, Arabic, Chinese...) still falls through to the matching Noto font. Chinese, Japanese and Korean each get their own Noto family first, so shared characters take the right regional shapes.

The library ships no font files. The easiest way to load them all is the optional `fonts.css`, which pulls every family from Google Fonts; browsers only download the parts a page actually uses.

```html
<link rel="stylesheet" href="@rx-m3e/tokens/fonts.css" />
<link rel="stylesheet" href="@rx-m3e/tokens/theme.css" />
```

To use a different font, override `--md-ref-typeface-brand` and `--md-ref-typeface-plain`.

### Regenerating

```sh
npm run tokens:fetch   # sparse-clones androidx into .cache/
npm run tokens         # rewrites packages/tokens
```

## Typography

Use the class for any of the 15 Material type styles, or its Material 3 Expressive `-emphasized` version:

```html
<link rel="stylesheet" href="@rx-m3e/tokens/typescale.css" />
<h2 class="rx-typescale-headline-small">Settings</h2>
<p class="rx-typescale-body-large-emphasized">Saved</p>
```

Inside your own Lit components, use `typescale('title-medium')` for the declarations or `typescaleStyles` for the classes (both from `@rx-m3e/web`).

## Elevation

```html
<div class="card" style="position: relative">
  <rx-elevation level="2"></rx-elevation>
  ...
</div>
```

`level` is 0 to 5. For component work, set `--rx-elevation` to a token instead, e.g. `var(--md-sys-elevation-level3)`; any value in between works and changes animate. `--rx-elevation-shadow-color` changes the shadow color.

## Focus ring

```html
<button style="position: relative">
  Save
  <rx-focus-ring></rx-focus-ring>
</button>
```

Shows only for keyboard focus (`:focus-visible`), follows the control's corner radius, and springs in. Add `inward` for edge-to-edge rows, or `for="id"` to follow another element.

## Ripple

```html
<button style="position: relative; color: var(--md-sys-color-on-primary)">
  Save
  <rx-ripple></rx-ripple>
  <rx-focus-ring></rx-focus-ring>
</button>
```

Hover tints the control, a press grows a ripple from the pointer (or from the center for the keyboard), using the control's text color. Set `--rx-ripple-color` to change it, `dragged` while dragging, `disabled` to turn it off.

## Icons

```html
<rx-icon>home</rx-icon>
<rx-icon filled label="Favourite">favorite</rx-icon>
<rx-icon><svg viewBox="0 0 24 24">...</svg></rx-icon>
```

Any [Material Symbols](https://fonts.google.com/icons) name, or your own SVG. 24dp and the surrounding text color by default; `variant` picks rounded (default), outlined or sharp; `--rx-icon-size`, `--rx-icon-weight`, `--rx-icon-grade` and `--rx-icon-optical-size` tune it; `flip-rtl` mirrors arrows in right-to-left pages. Without a `label` the icon is hidden from screen readers.

Load the font yourself. To keep it small, ask Google Fonts for just your icons:

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=favorite,home,search&display=block"
/>
```

`@rx-m3e/tokens/icons.css` loads every icon instead (about 5 MB).

## Surface

```html
<rx-surface color="secondary-container" shape="large" elevation="1">...</rx-surface>
<rx-surface interactive color="surface-container-highest" shape="medium">Open</rx-surface>
```

Compose's `Surface`: a `color` role with its matching content color, a `shape` token, `elevation` (shadow, 0 to 5), `tonal-elevation` (tint, 0 to 5) and a border through `--rx-surface-border`. Content is clipped to the shape. `interactive` makes it a button with ripple and focus ring; `selected` and `disabled` work with it.

## Shape engine

A hand port of Google's `androidx.graphics.shapes`, the engine behind the Material 3 Expressive shapes:

```js
import {graphicsShapes as s} from '@rx-m3e/web';

const cookie = s.star(9, {innerRadius: 0.85, rounding: new s.CornerRounding(0.2, 0.2)});
const d = s.toPath(cookie.normalized()); // SVG path data in a 0..1 box
```

`RoundedPolygon` (from a vertex count, vertices or features), `circle`, `rectangle`, `star`, `pill`, `pillStar`, `CornerRounding` (radius and smoothing), bounds, `normalized()`, `transformed()`, `Morph`, and `toPath()`/`morphToPath()` for SVG, clip paths or `Path2D`.

It does Kotlin's 32-bit Float math step for step, so every number matches Android bit for bit. That is what makes morphs pair the same corners as on Android. Google's own tests are ported, and `npm test` checks the output against Google's real Kotlin code exactly (see `scripts/shapes-golden/`).

## Material shapes

```html
<rx-shape shape="cookie-9-sided" style="width: 96px; height: 96px">
  <img src="avatar.jpg" alt="" />
</rx-shape>
```

All 35 Material 3 Expressive shapes from Compose's `MaterialShapes`: circle, square, slanted, arch, fan, arrow, semi-circle, oval, pill, triangle, diamond, clam-shell, pentagon, gem, sunny, very-sunny, cookie-4/6/7/9/12-sided, ghostish, clover-4/8-leaf, burst, soft-burst, boom, soft-boom, flower, puffy, puffy-diamond, pixel-circle, pixel-triangle, bun and heart. `--rx-shape-color` sets the fill. In code, `MaterialShapes.Heart` or `materialShape('Heart')` gives the polygon and `shapePath(polygon, width, height)` its SVG path. Every shape matches Google's own Kotlin bit for bit.

## Shape morphing

```html
<rx-shape id="s" shape="circle"></rx-shape>
<script>
  s.shape = 'heart'; // morphs, with the expressive default spatial spring
</script>
```

Changing `shape` morphs to the new shape with Google's `Morph`. Sending it back mid-morph runs the morph backwards. `--rx-shape-morph-duration` and `--rx-shape-morph-easing` change the timing, `no-morph` switches at once, and so does reduced motion. `morphAnimation` gives the running animation, to pause or seek it.

In code:

```js
import {graphicsShapes as s, MaterialShapes, morphShapePath} from '@rx-m3e/web';

const morph = new s.Morph(MaterialShapes.Heart, MaterialShapes.Clover8Leaf);
const d = morphShapePath(morph, 0.5, 200, 200); // halfway, drawn at 200x200
```

All 1,225 pairs of Material shapes, Compose's loading indicator sequence and Google's test pairs are checked against Google's Kotlin.

## Theme

Generate a full light and dark scheme from one seed color with Google's color engine:

```js
import {applyTheme} from '@rx-m3e/web';

applyTheme({source: '#0b57d0', variant: 'vibrant', contrast: 0, spec: '2025'});
```

Or theme just part of a page:

```html
<rx-theme source="#146c2e" variant="expressive">...</rx-theme>
```

Styles: `tonal-spot` (default), `neutral`, `vibrant`, `expressive`, `fidelity`, `content`, `rainbow`, `fruit-salad`, `monochrome`. Contrast runs from -1 to 1 (0 standard, 0.5 medium, 1 high). `sourceFromImage(img)` picks a seed from a picture. Light and dark follow `data-theme` on `<html>`, or the OS.

## Development

```sh
npm install
npm run dev           # demo site at http://localhost:5173/demo/
npm run build         # compiles packages/web to dist/ and the demo site to dist-site/
npm run build:site    # only the demo site
npm test              # browser tests (Vitest + Playwright, headless Chromium)
npm run lint          # ESLint with the Lit and web component rules
npm run format        # Prettier
npm run typecheck     # TypeScript, no output
```

The demo site (`demo/`) has a catalog page read straight from COMPONENTS.md, plus a page per finished step. Its top bar switches theme (system, light, dark) and text direction (LTR, RTL). To add a page, copy the `<head>` from `demo/tokens.html` and list the page in `demo/pages.ts`.

### Hosting the demo site

`npm run build` also writes the demo site to `dist-site/` as static files, with every page at the root.

- Cloudflare Workers: build command `npm run build`, deploy command `npx wrangler deploy` (reads `wrangler.jsonc`).
- Cloudflare Pages or any static host: build command `npm run build`, output directory `dist-site`.

Node 22 comes from `.node-version`.

GitHub Actions runs lint, format check, type check, build and tests on every push and pull request.

Components are Lit elements written in TypeScript. They use Lit's `experimentalDecorators` mode (the same mode `@material/web` uses), because the dev server does not yet compile standard decorators.

## License

Apache-2.0. Ported material comes from Apache-2.0 projects; see [NOTICE](NOTICE).
