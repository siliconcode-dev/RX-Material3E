# Roadmap to 0.1.0-alpha

The plan has 79 steps. We do one step per round, and the next one starts only after the current one is reviewed and approved. Steps may be split or reordered as we learn; any change gets written down here.

## What "done" means for a step

A component step is done when it has:

1. The element written in Lit + TypeScript, ported from the Compose source named in [COMPONENTS.md](COMPONENTS.md)
2. Styling that reads only from `@rx-m3e/tokens`, with light and dark theme working
3. Keyboard support and ARIA roles that match the M3 accessibility guidance
4. A demo page showing every variant
5. Tests that pass in the browser
6. Its row ticked in COMPONENTS.md and here

Groundwork and foundation steps use the parts of this list that apply.

Status: `☐` not started, `◐` in progress, `☑` done.

## Phase 0: Groundwork (steps 1 to 4)

| Step | Work                                                                             | Status |
| ---- | -------------------------------------------------------------------------------- | ------ |
| 1    | Roadmap (this file); switch the token font stack to Google Sans Flex + Noto Sans | ☑      |
| 2    | `@rx-m3e/web` package: Lit, TypeScript, build, dev server; language-aware fonts  | ☑      |
| 3    | Quality tooling: browser tests, lint, format, GitHub Actions CI                  | ☑      |
| 4    | Demo site shell: one page per component, theme toggle, font loading              | ☐      |

## Phase 1: Foundations (steps 5 to 17)

| Step | Work                                                                               | Status |
| ---- | ---------------------------------------------------------------------------------- | ------ |
| 5    | Theme: seed color to full scheme, scheme variants, contrast levels, `applyTheme()` | ☐      |
| 6    | Typography: typescale classes, emphasized styles                                   | ☐      |
| 7    | Elevation: shadows for levels 0 to 5                                               | ☐      |
| 8    | Focus ring                                                                         | ☐      |
| 9    | State layer and ripple                                                             | ☐      |
| 10   | Icon: Material Symbols font and SVG slot                                           | ☐      |
| 11   | Surface                                                                            | ☐      |
| 12   | Shapes 1: port `graphics-shapes` (RoundedPolygon) to TypeScript                    | ☐      |
| 13   | Shapes 2: the 35 expressive MaterialShapes as SVG paths and clip paths             | ☐      |
| 14   | Shapes 3: morphing between shapes                                                  | ☐      |
| 15   | Motion helpers: JS springs for the Web Animations API, reduced motion              | ☐      |
| 16   | Shared internals: form association, ARIA delegation, common controllers            | ☐      |
| 17   | Scrim                                                                              | ☐      |

## Phase 2: Actions (steps 18 to 31)

| Step | Work                                                                   | Status |
| ---- | ---------------------------------------------------------------------- | ------ |
| 18   | Button: filled, tonal, elevated, outlined, text                        | ☐      |
| 19   | Button: expressive sizes XS to XL, round and square, press shape morph | ☐      |
| 20   | Toggle button                                                          | ☐      |
| 21   | Icon button: standard, filled, tonal, outlined, toggle                 | ☐      |
| 22   | Icon button: expressive sizes and widths                               | ☐      |
| 23   | Button group: standard                                                 | ☐      |
| 24   | Button group: connected                                                | ☐      |
| 25   | Split button                                                           | ☐      |
| 26   | Segmented button                                                       | ☐      |
| 27   | FAB: sizes and container colors                                        | ☐      |
| 28   | Extended FAB                                                           | ☐      |
| 29   | FAB menu                                                               | ☐      |
| 30   | Chips 1: assist, suggestion                                            | ☐      |
| 31   | Chips 2: filter, input, chip set                                       | ☐      |

## Phase 3: Communication (steps 32 to 39)

| Step | Work                                   | Status |
| ---- | -------------------------------------- | ------ |
| 32   | Badge                                  | ☐      |
| 33   | Linear progress (flat)                 | ☐      |
| 34   | Circular progress (flat)               | ☐      |
| 35   | Wavy progress, linear and circular     | ☐      |
| 36   | Loading indicator, plain and contained | ☐      |
| 37   | Snackbar and snackbar host             | ☐      |
| 38   | Tooltip: plain and rich                | ☐      |
| 39   | Pull to refresh                        | ☐      |

## Phase 4: Containment (steps 40 to 50)

| Step | Work                                                   | Status |
| ---- | ------------------------------------------------------ | ------ |
| 40   | Divider                                                | ☐      |
| 41   | Card: filled, elevated, outlined                       | ☐      |
| 42   | List and list item                                     | ☐      |
| 43   | List: expressive segmented items                       | ☐      |
| 44   | Dialog: basic and full screen                          | ☐      |
| 45   | Bottom sheet and drag handle                           | ☐      |
| 46   | Side sheet                                             | ☐      |
| 47   | Carousel 1: multi-browse, uncontained                  | ☐      |
| 48   | Carousel 2: hero, centered hero, full screen, parallax | ☐      |
| 49   | Swipe to dismiss                                       | ☐      |
| 50   | Scrollbar                                              | ☐      |

## Phase 5: Selection and input (steps 51 to 63)

| Step | Work                                                         | Status |
| ---- | ------------------------------------------------------------ | ------ |
| 51   | Checkbox                                                     | ☐      |
| 52   | Radio button                                                 | ☐      |
| 53   | Switch                                                       | ☐      |
| 54   | Slider 1: standard and range                                 | ☐      |
| 55   | Slider 2: expressive centered, vertical, track sizes, stops  | ☐      |
| 56   | Text field 1: filled and outlined                            | ☐      |
| 57   | Text field 2: textarea, password, prefix and suffix, counter | ☐      |
| 58   | Menu 1: standard                                             | ☐      |
| 59   | Menu 2: expressive vibrant, groups, submenus                 | ☐      |
| 60   | Select and autocomplete                                      | ☐      |
| 61   | Date picker 1: docked and modal                              | ☐      |
| 62   | Date picker 2: input mode and range                          | ☐      |
| 63   | Time picker: dial, input, vibrant dialog                     | ☐      |

## Phase 6: Navigation (steps 64 to 73)

| Step | Work                                                  | Status |
| ---- | ----------------------------------------------------- | ------ |
| 64   | Tabs: primary and secondary                           | ☐      |
| 65   | Top app bar 1: small, center aligned, medium, large   | ☐      |
| 66   | Top app bar 2: flexible variants and scroll behaviour | ☐      |
| 67   | Bottom app bar                                        | ☐      |
| 68   | Search bar and search view                            | ☐      |
| 69   | Floating toolbar and docked toolbar                   | ☐      |
| 70   | Navigation bar: baseline and short                    | ☐      |
| 71   | Navigation rail: collapsed, expanded, modal           | ☐      |
| 72   | Navigation drawer                                     | ☐      |
| 73   | Scaffold                                              | ☐      |

## Phase 7: Alpha release (steps 74 to 79)

| Step | Work                                                                            | Status |
| ---- | ------------------------------------------------------------------------------- | ------ |
| 74   | Accessibility audit: axe, keyboard, screen reader                               | ☐      |
| 75   | Browser check (Chromium, Firefox, WebKit) and right-to-left layout              | ☐      |
| 76   | Framework check: React, Vue, Angular; `custom-elements.json` manifest and types | ☐      |
| 77   | Finish the docs site                                                            | ☐      |
| 78   | Release setup: versioning, package metadata, bundle size check                  | ☐      |
| 79   | Publish `0.1.0-alpha` to npm (needs your npm account)                           | ☐      |

## Decisions so far

- Element prefix `rx-`, packages under `@rx-m3e/`.
- Fonts: English uses Google Sans Flex with Noto Sans as fallback; every other language uses the Noto Sans family, chosen by the `lang` attribute (CJK gets its regional family first). The library ships no font files; `@rx-m3e/tokens/fonts.css` is an optional Google Fonts loader.
- Tooling: Lit 3, TypeScript 6 with `experimentalDecorators`, Vite 8 for the dev server, `tsc` for the library build.
- Quality: Vitest 5 browser mode on Playwright (Chromium for now; Firefox and WebKit join at step 75), ESLint 10 with `eslint-plugin-lit` and `eslint-plugin-wc`, Prettier. CI on GitHub Actions.
- Dependency versions are normally at least two weeks old. Security fixes are the exception (Vitest 5.0.5 fixes GHSA-p458-7748-mcp3).
- Distribution: npm. A shadcn-style registry may be added after the alpha.
