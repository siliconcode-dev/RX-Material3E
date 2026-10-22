# RX-Material3E

Material 3 and Material 3 Expressive as framework-free web components. Each component is ported by hand from Google's Jetpack Compose Material3 source, with Material Components for Android as a second reference.

This project is not affiliated with or endorsed by Google.

## Status

Foundations are in progress. See [COMPONENTS.md](COMPONENTS.md) for the full catalog and the build order.

| Package | What it is | Status |
|---------|-----------|--------|
| `@rx-m3e/tokens` | All M3 and M3E design tokens as CSS custom properties and JSON | Ready |
| `@rx-m3e/web` | The web components (`rx-*` elements) | Not started |

## Tokens

`packages/tokens` is generated from the 119 token objects in Compose Material3. Nothing in it is typed by hand.

```html
<link rel="stylesheet" href="@rx-m3e/tokens/theme.css">
```

| File | Contents |
|------|----------|
| `css/ref.css` | Tonal palettes (`--md-ref-palette-*`) and typefaces |
| `css/sys.css` | Typescale (incl. emphasized), shape corners, elevation levels, state opacities, durations, easings, expressive springs |
| `css/color.css` | Light and dark color roles. Follows the OS; force with `data-theme="light"` or `"dark"` on `<html>` |
| `css/components.css` | 2,430 component tokens (`--md-comp-*`) across 104 sets, for reference |
| `src/tokens.json` | Everything above as JSON, plus the source commit |

CSS has no spring timing function, so each expressive spring (fast, default, slow; spatial and effects) is simulated and exported as a `linear()` easing with a matching duration:

```css
transition: transform var(--md-sys-motion-spring-fast-spatial-duration)
  var(--md-sys-motion-spring-fast-spatial-easing);
```

Open `demo/tokens.html` to see the colors, typescale, corners and springs.

### Regenerating

```sh
npm run tokens:fetch   # sparse-clones androidx into .cache/
npm run tokens         # rewrites packages/tokens
```

## License

Apache-2.0. Ported material comes from Apache-2.0 projects; see [NOTICE](NOTICE).
