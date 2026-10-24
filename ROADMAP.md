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
| 4    | Demo site shell: one page per component, theme toggle, font loading              | ☑      |

## Phase 1: Foundations (steps 5 to 17)

| Step | Work                                                                               | Status |
| ---- | ---------------------------------------------------------------------------------- | ------ |
| 5    | Theme: seed color to full scheme, scheme variants, contrast levels, `applyTheme()` | ☑      |
| 6    | Typography: typescale classes, emphasized styles                                   | ☑      |
| 7    | Elevation: shadows for levels 0 to 5                                               | ☑      |
| 8    | Focus ring                                                                         | ☑      |
| 9    | State layer and ripple                                                             | ☑      |
| 10   | Icon: Material Symbols font and SVG slot                                           | ☑      |
| 11   | Surface                                                                            | ☑      |
| 12   | Shapes 1: port `graphics-shapes` (RoundedPolygon) to TypeScript                    | ☑      |
| 13   | Shapes 2: the 35 expressive MaterialShapes as SVG paths and clip paths             | ☑      |
| 14   | Shapes 3: morphing between shapes                                                  | ☑      |
| 15   | Motion helpers: JS springs for the Web Animations API, reduced motion              | ☑      |
| 16   | Shared internals: form association, ARIA delegation, common controllers            | ☑      |
| 17   | Scrim                                                                              | ☑      |

## Phase 2: Actions (steps 18 to 31)

| Step | Work                                                                   | Status |
| ---- | ---------------------------------------------------------------------- | ------ |
| 18   | Button: filled, tonal, elevated, outlined, text                        | ☑      |
| 19   | Button: expressive sizes XS to XL, round and square, press shape morph | ☑      |
| 20   | Toggle button                                                          | ☑      |
| 21   | Icon button: standard, filled, tonal, outlined, toggle                 | ☑      |
| 22   | Icon button: expressive sizes and widths                               | ☑      |
| 23   | Button group: standard                                                 | ☑      |
| 24   | Button group: connected                                                | ☑      |
| 25   | Split button                                                           | ☑      |
| 26   | Segmented button                                                       | ☑      |
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
| 58   | Menu 1: standard (and the button group overflow menu)        | ☐      |
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
- Theme: `@material/material-color-utilities` 0.4.0 builds schemes. Default spec is 2025 (M3 Expressive); 2021 is available. The library's imports omit file extensions, so it needs a bundler (Vite, webpack, esbuild); it does not load as raw ES modules in a browser.
- Elevation: `--rx-elevation` is a registered, non-inheriting `<length>` taking the Compose dp values directly; the M3 key + ambient shadow pair is computed from it in CSS, so it animates between levels. Shadows only; tonal elevation is covered by the surface-container color roles, as in current Compose.
- Focus ring: outward by default (M3 web spec: 3dp `secondary`, 2dp offset); `inward` is Compose's InsetFocusRing (2dp `secondary` over a 3dp `on-secondary` band). Springs in with fast spatial, out with fast effects, as in `material3-ripple`. Shown only for `:focus-visible`.
- Ripple: timings and geometry from `material3-ripple` (75ms fade in, 225ms fast-out-slow-in grow from 30% of the longest side to the surface plus 10dp, center drifting to the middle, 150ms fade out after both the grow and the press end). State layer: hover 8%, dragged 16%; focus tint is off by default because components use `<rx-focus-ring>`.
- Icons: Material Symbols, Rounded by default (the M3 Expressive look); Outlined and Sharp via `variant`. The full font is about 5 MB, so `@rx-m3e/tokens/icons.css` is optional and apps should prefer Google Fonts' `&icon_names=` subsets. Accessibility uses plain ARIA attributes (not ElementInternals) so checkers such as axe see it.
- Demo site: `npm run build` also writes it to `dist-site/`. It was on Cloudflare Workers (`wrangler.jsonc`) until the old account was lost; since step 20 Vercel builds it (`vercel.json`) at https://rxmaterial3e.dpdns.org/
- Surface: color roles paired with content colors as in `ColorScheme.contentColorFor`; tonal elevation uses `surfaceColorAtElevation` and adds up through nested surfaces; `interactive` gives button semantics, ripple and focus ring. Start/end shapes use logical corners so they flip in RTL (the generated `*-start`/`*-end` shape tokens are physical; fix in the token script later).
- Tests that check a mapping must hold their own copy of the Compose values, never import the list under test.
- Shape engine: `packages/web/src/shapes/graphics/` is a hand port of `androidx.graphics.shapes` (Point, Utils, Cubic, CornerRounding, Features, RoundedPolygon, Shapes) plus Compose's `toPath`. Google's own unit tests are ported, and `scripts/shapes-golden/` compiles Google's real Kotlin to produce reference output that the golden tests must match. Upstream quirks kept on purpose: `Float.MIN_VALUE` as a sentinel and starting max, `pillStar` using the full shorter side as end-cap radius, path rotation about the origin. SvgPathParser, FeatureSerializer, FeatureDetector and PolygonValidation come later if needed.
- Kotlin Float math (step 14): the whole shape engine does Kotlin's 32-bit Float arithmetic, each operation rounded with `Math.fround` in Kotlin's order, and Float parameters are rounded on the way in. Without it, 46 of the 1,225 MaterialShapes morph pairs paired corners differently from Android: symmetric shapes have tied corner distances, and only identical Float math breaks the ties the same way (the morph then turns the other way). With it, every number matches Android bit for bit, and the golden tests check exact 32-bit equality instead of a tolerance.
- Material shapes: the 35 `MaterialShapes` are ported definition by definition. Their golden reference is Google's MaterialShapes.kt extracted verbatim and compiled (`scripts/shapes-golden/extract-material-shapes.mjs`). `customPolygon`/`doRepeat` emulate Kotlin's 32-bit float math so vertices that sit exactly on a line (pixel shapes) get Android's convex flags, and `convex()` does its sign test in 32-bit floats, proven by a near-collinear Kotlin case. `<rx-shape>` sizes the path like Compose `toShape` (scale, then center the control-point bounds); clipping changes painting, not hit testing, as in Compose.
- Morph: Morph, FeatureMapping, FloatMapping and PolygonMeasure are ported line by line, with Google's tests for all four (including the two that Google skips on its JS target for float rounding; they pass here). `golden-morph.test.ts` checks 28 pairs in full (Google's test pairs, Compose's LoadingIndicator sequences, Material shape pairs) at 19 progress values, Compose's `Morph.toPath` commands, all 35 x 35 MaterialShapes pairs, and 75 frames filled by Java2D against the browser's fill. `<rx-shape>` morphs on shape change, its progress on the default spatial spring (an `Animatable` since step 15; `--rx-shape-morph-stiffness`/`-damping` override it), springs back with its velocity when sent back mid-morph, and switches at once with `no-morph` or reduced motion. A third shape mid-morph starts from the nearer end of the running morph, a small jump (Compose's corner-shape animation freezes the current shape instead; a Morph cannot be frozen into a polygon).
- Motion (step 15): `packages/web/src/motion/` ports SpringSimulation, SpringEstimation, FloatSpringSpec, the Spring constants, MotionScheme (standard and expressive) and Animatable's frame logic (SuspendAnimation: first frame at play time 0, whole-millisecond spring steps, a retarget carries on from the last frame's time, value and velocity). `golden-spring.test.ts` compares 133 curves (value and velocity at many times) and 3,080 durations with Google's Kotlin: all exact except 4 durations of over-damped springs starting almost at rest, where last-bit exp/log differences change a Newton iteration and both answers end within the first frame. The CSS spring tokens are generated by the same code (they were a rough numeric simulation before); since Compose's duration depends on the distance (it stops within 0.01 in the value's unit), they are timed for 100dp (spatial) and 0 to 1 (effects); components that need exact durations use `Animatable` or `animateWithSpring` with their real distance. Reduced motion maps to Compose's MotionDurationScale 0 (Android's "Remove animations"). Animatable's Promise resolves as `Interrupted` where Compose throws a CancellationException.
- Shared internals (step 16): semantics live on the host element (Compose puts them on the node that draws), as plain attributes: no ARIA delegation into the shadow root, so ID references and `<label>` work across it and checkers see them. Components that need a native element inside (text fields, step 56) will mirror labels onto it then. Keyboard activation copies the native controls (button: Enter on key down, Space on key up; toggle: Space only; a Space held across a focus change does nothing). Form association uses ElementInternals; a custom element can't be a form's submitter, so `submitForm` presses a hidden native submit button carrying the name and value. Chrome clicks a form-associated element from its `<label>` once, as for a native checkbox (tested). Compose's `minimumInteractiveComponentSize` (48dp, centered, 0 turns it off) is CSS on the host.
- Scrim (step 17): Compose's `Scrim` and how its modals show it: the scrim color at 32% (`ScrimTokens`), alpha springing between 0 and 1 on the default effects spec, a clickable button with a content description only when it can dismiss (not a Tab stop, as in Compose), nothing for assistive technology otherwise. Compose's own labels ("Close navigation menu", "Close sheet", "Close rail") come from its string resources. It fills its positioned container; modals in later steps place it.
- Buttons (step 18): `<rx-button>` is Compose's classic `Button(onClick)` family (Button, FilledTonalButton, ElevatedButton, OutlinedButton, TextButton) with ButtonDefaults' colors, elevations, padding (24dp, 16dp before an icon, text 12dp/16dp) and sizes (40dp container, 58dp minimum width, 18dp icons 8dp from the label). Current Compose values are kept where they differ from older M3: outlined buttons use on-surface-variant text and an outline-variant border, disabled containers are on-surface at 10% (tonal 12%), text buttons are primary (ButtonDefaults overrides the token, with a TODO). Like the clickable Surface it is built on, it lays out a 48dp touch target. Elevation follows Compose's interaction list and tweens (ButtonElevation, internal/Elevation.kt), as a shared `InteractionElevationController`. It is a form button with `<button>`'s default `type="submit"`. Links (`href`) are not in this step. Component tokens now ship as JS modules (`@rx-m3e/tokens/js/<set>.js`), each value `var(--md-comp-…, <system token>)`, so components need only theme.css. Ripples and focus rings take a `controlElement` to follow the host from inside the visible container.
- Button sizes and morph (step 19): `size` (`xs` to `xl`) lays the button out as Compose's size samples do, which use the classic overload with `heightIn(size)` and ButtonDefaults' contentPaddingFor, iconSizeFor, iconSpacingFor and textStyleFor; without `size` the button is the classic one from step 18. `morph` is opt-in, as Compose's `shapes` overload is: it takes that overload's default padding (contentPaddingFor(MinHeight), so 16dp sides even for text buttons) and springs the corners to shapesFor's pressed shape on the default effects spring. Kept as Compose does, by the owner's choice: `shape="square"` is ButtonDefaults.squareShape (12dp) at every size (the per-size square tokens are ToggleButton's), and outlined buttons keep outlinedButtonBorder's 1dp at every size (the 2dp and 3dp tokens go unused). The morph is AnimatedShapeState ported (`internals/animated-shape.ts`): each corner is interpolated in px from the current size, so CornerFull (the 9999px token) is read as 50% of the shorter side. Compose's code flips the velocity when a press is reversed mid-morph, but the LaunchedEffect it runs in is cancelled first, and the Animatable's cancellation resets the velocity to 0 before it is read, so the reverse starts at rest; ours does the same. At rest the token's own CSS is written back, so the corners follow size changes. Content padding now uses logical sides (step 18 used physical ones, wrong in RTL with an icon).
- Toggle button (step 20): `<rx-toggle-button>` is Compose's current ToggleButton family (ToggleButton, ElevatedToggleButton, FilledTonalToggleButton, OutlinedToggleButton) with ToggleButtonSize: `size` is `s` by default, and each size sets the height, ToggleButtonDefaults.contentPaddingFor, ButtonDefaults' iconSizeFor, iconSpacingFor and textStyleFor, and shapesFor's three shapes (round off; pressed 8, 6, 12, 16, 16dp and checked 12, 12, 16, 28, 28dp from XS to XL; small's 6dp pressed shape is typed by hand upstream). Unlike Button there is no minimum width and one leading `icon` slot. Colors are the tokens' Unselected and Selected values (tonal uses TonalButtonTokens, its elevations FilledTonalButtonTokens) and switch at once; a disabled outlined toggle has the disabled outline color at 10% as its container. The morph always runs, pressed over checked, on the fast spatial spring, so it bounces; a third shape mid-morph freezes the visible one, as AnimatedShapeState does. The outline (unchecked outlined only) springs its width on fast spatial and its color on default effects in Oklab with straight alpha, as animateBorderStrokeAsState and Color.VectorConverter do (`motion/color.ts`; Oklab from linear sRGB in doubles, where Compose goes through XYZ in floats); it is drawn as an inset shadow because browsers snap border widths to whole pixels. It is a checkbox for assistive technology and forms (Space toggles, as a native checkbox; Compose also takes Enter), fires `input` and `change`, and resets to its `checked` attribute. `InteractionShapeController` (shapeByInteraction) and the shared size styles now serve both buttons.
- Icon button (step 21): `<rx-icon-button>` is Compose's IconButton family (IconButton, FilledIconButton, FilledTonalIconButton, OutlinedIconButton) and, with `toggle`, the IconToggleButton family, at the default small size (40dp, a 24dp icon with 8dp each side, in a 48dp touch target). Standard and outlined ones take the surrounding content color (LocalContentColor, the inherited `color`) for the icon and the outline, at 38% when disabled; `vibrant` gives the vibrant colors from the tokens. By the owner's choice it keeps Compose's defaults: the `shapes` overloads of the standard and outlined toggles default to the vibrant colors, so `toggle morph` turns them on, while plain `morph` does not. `morph` is the `shapes` overloads (shapes() and toggleableShapes(): 8dp pressed, 12dp checked) on the default effects spring. Colors switch at once and there is no elevation. Upstream's defaultOutlinedIconToggleButtonColors reads the standard toggle's cache, so on Android an outlined icon toggle shows the standard toggle's colors once a standard one has been drawn; by the owner's choice ours always shows the colors it means (inverse surface when on). Disabled wins over checked, and a checked outlined toggle has no outline even when disabled. A toggle is a checkbox (Space only, as for rx-toggle-button); otherwise it is a form button like rx-button. `PressInteractionController.keys` is now a function.
- Icon button sizes (step 22): `size` (`xs` to `xl`, small by default) and `width` (`narrow`, `uniform`, `wide`) give IconButtonDefaults' extraSmallContainerSize to extraLargeContainerSize: the size's icon plus the width option's leading and trailing space (uniform is the leading space twice; Large's token is UniformLeadingSpace), by the container height. The icon takes the size's icon size. `shape` is the size's round (default) or square shape; with `morph` the pressed shape and the selected shape follow the size (selected round is squarer, selected square is fully round), as the size tokens give them; Compose has no ready-made shapes per size for icon buttons, so these are the tokens apps use. As for Button, the outline stays 1dp at every size (outlinedIconButtonBorder uses the small width). The host keeps the 48dp touch target, as Compose's extra small sample adds with minimumInteractiveComponentSize.
- Button group (step 23): `<rx-button-group>` is Compose's ButtonGroup without its overflow menu, which waits for menus (step 58, by the owner's choice): items 12dp apart (ButtonGroupSmallTokens.BetweenSpace), top-aligned by default (`align` center or bottom), each measured at its intrinsic width and given exactly that, so its container fills its touch target (a small icon button is 48dp wide in a group, as in Compose, where minimumInteractiveComponentSize reports 48dp and the 40dp size is coerced up). `flex` on an item is Compose's weight. By the owner's choice every item grows on press, as Compose's clickableItem and toggleableItem do (`static` turns it off): EnlargeOnPressNode's spring (fast spatial) takes a pressed value to 1 and, on release, waits until it passes 0.75 (or a second) before going back; each frame runs ButtonGroupMeasurePolicy's expand and compress logic in Kotlin Float steps (a middle item takes round(value x min(ratio x width / 2, both neighbours' compression limits)) from each side, the first and last from their one neighbour; ExpandedRatio 0.15, compression limit 24dp, ButtonDefaults.ContentPadding's end). The buttons take `--rx-button-group-width`, `--rx-button-group-min-width` and `--rx-button-group-max-padding` from the group; a squeezed button's padding is capped at half its width (Compose's padding gives way and the surface clips). `trackPress()` follows the press of an element the group does not own.
- Connected button group (step 24): `connected` follows Compose's SingleSelect and MultiSelectConnectedButtonGroupSample, which use a FlowRow and not ButtonGroup: toggle buttons ConnectedSpaceBetween (2dp) apart, wrapping into rows 2dp apart, with no press growth, and connectedLeading/Middle/TrailingButtonShapes (outer corners ShapeDefaults.CornerFull, which is CornerSize(100); inner corners InnerCornerCornerSize, 4dp pressed; the middle ones ShapeDefaults.Small; fully round when on). `selection="single"` is the single-select sample: the toggles get the RadioButton role (rx-toggle-button's new `radio`), one is on at a time, and pressing the one that is on keeps it on; each stays a Tab stop as in Compose. Corner shapes now go through CornerBasedShape.createOutline's own scaling (the start pair and the end pair each fit the shorter side) and are always written in px, redrawn when the container resizes; CSS would scale all four by one factor and shrink the inner corners of a 100% outer corner.
- Split button (step 25): `<rx-split-button>` is SplitButtonLayout with SplitButtonDefaults' LeadingButton and checkable TrailingButton (and their Tonal, Elevated and Outlined versions): two buttons Spacing (2dp) apart at the same height, the trailing one sized first, the 48dp touch target on the whole layout. Each size takes the split tokens' paddings, trailing icon size and inner corners (which grow when pressed, 4 to 12dp at small) and ButtonDefaults' height, icon size, spacing and text style, as the size samples do. Outer corners are CornerSize(100). Checked, the trailing button turns CircleShape and draws the content color at PressedStateLayerOpacity over itself; its content is centered optically (0.11 times the corner difference, capped by the padding) from the morphing shape on every frame. Its shapes morph on default effects without `key`, so a new size morphs on (InteractionShapeController `keyed: false`). The chevron (Compose's KeyboardArrowDown as SVG) turns 180 degrees on the default spring when checked, from the samples. The halves are role="button" elements in the shadow root (a composite control; semantics can't all sit on the host); the trailing one has aria-expanded, as the samples' Expanded and Collapsed state description, and `trailing-label`. The leading button fires `leading-click`. The leading label wraps when space is short and both buttons grow, as Compose measures them. InteractionElevationController takes a `source` element. Per-half enabled and the uncheckable TrailingButton(onClick) are not exposed yet; the menu comes with menus (step 58).
- Segmented button (step 26): `<rx-segmented-button>` is SegmentedButton on its toggleable or selectable Surface, `<rx-segmented-button-set>` is SingleChoiceSegmentedButtonRow and MultiChoiceSegmentedButtonRow (`selection`, single by default; single is a radiogroup of radio buttons, and pressing the one that is on keeps it on). Colors from SegmentedButtonDefaults (disabled borders are the outline color at 12%, as the code has it, not the disabled outline token; a disabled checked button keeps its container). The row is Compose's `width(IntrinsicSize.Min)`: the set measures each button's minIntrinsicWidth (label at its longest word, rounded up as Compose's text, plus the 26dp icon room, 24dp padding, at least 58dp) and is that times the count less the 1dp overlaps, held to the room it has; the buttons share its width equally (a grid of `minmax(0, 1fr)` with half-border margins and padding for the overlap), so multi-word labels wrap (the owner chose this over keeping labels on one line). In a row short of room the buttons shrink below the 58dp minimum and the 48dp touch target's width, as Compose's fixed widths win over defaultMinSize. The label is measured with the whole padded width, as Compose does, so a wrapped row pushes past the padding, centered, clipped by the shape. The label sits half the icon and spacing back (-13dp) when no icon shows and springs over on fast spatial in whole pixels (Animatable's new `integer` option, Int.VectorConverter). The checkmark (Icons.Filled.Check) fades in on default effects and scales in from 0 at its bottom left on fast spatial, and goes at once; with a slotted icon the two crossfade on default effects and the label stays put. `no-checkmark` is Compose's `icon = {}`. interactionZIndex is CSS: 5 when checked, 1 while pressed (a custom state); keyboard focus adds 10 rather than 1, because our focus ring is drawn outside the button where Compose's focus is a tint inside. Compose places the icon and label with `place`, not `placeRelative`, so in right-to-left text its checkmark stays on the left; we treat that as an oversight and mirror it. Direction-dependent offsets are now CSS (`:dir(rtl)`), so they follow a change of direction; the split button's optical offset was fixed the same way.
- Every element must upgrade cleanly when it is already in the page before the library loads; `test/upgrade.test.ts` checks all of them (add each new tag there).
- Dependency versions are normally at least two weeks old. Security fixes are the exception (Vitest 5.0.5 fixes GHSA-p458-7748-mcp3).
- Distribution: npm. A shadcn-style registry may be added after the alpha.
