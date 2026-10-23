# Handoff

Written at the end of a long session, for a fresh Claude Code session to pick
up from. Read this, then CLAUDE.md (working rules), ROADMAP.md (the plan and
all decisions) and COMPONENTS.md (the catalog).

## Where things stand

- **Steps 1 to 18 of 79 are done**, committed and pushed, CI green.
  Phase 0 (groundwork) and Phase 1 (foundations) are finished; Phase 2
  (actions) has started with step 18 (buttons).
- Branch: `claude/material-design-web-components-fre1r7` (the only branch to
  push to; no pull request unless the owner asks).
- Last commits: `079ea6d` (button test timing fix), `d844b33` (step 18).
- 622 tests pass (`npm test`), lint, format, typecheck and build are clean.
- Live demo (Cloudflare Workers, rebuilt from the branch):
  https://rx-material3e.ashfaqizop.workers.dev (pages have no `.html`, e.g.
  `/buttons`).
- **Next: step 19**, button expressive sizes XS to XL, round and square
  shapes, and the press shape morph. Wait for the owner to say "Go ahead with
  step 19". Prepared notes are at the end of this file.

When the new session starts, after reading these notes, tell the owner:

> Ready for step 19 (expressive button sizes XS to XL, round and square shapes, press shape morph) when you are.

## What exists

| Area               | Path                                        | Notes                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens             | `packages/tokens/`                          | Generated from 119 Compose token objects by `scripts/extract-compose-tokens.mjs`. `css/` (theme, sys, color, components...), `src/tokens.json`, and since step 18 `js/<set>.js` (+ `.d.ts`): one module per component token set, each value `var(--md-comp-<set>-<token>, <system value>)`. Components import these, so they need only `theme.css`. |
| Theme              | `packages/web/src/theme/`                   | `applyTheme()`, `<rx-theme>`, via @material/material-color-utilities 0.4.0.                                                                                                                                                                                                                                                                         |
| Typography         | `src/typography/`                           | typescale classes and helpers.                                                                                                                                                                                                                                                                                                                      |
| Elevation          | `src/elevation/`                            | `<rx-elevation>`, `elevationShadow` CSS from the registered `--rx-elevation` length.                                                                                                                                                                                                                                                                |
| Focus ring, ripple | `src/focus/`, `src/ripple/`                 | Both follow a control: `controlElement` (step 18) > `for` > parent.                                                                                                                                                                                                                                                                                 |
| Icon, surface      | `src/icon/`, `src/surface/`                 | `<rx-surface interactive>` uses the internals below.                                                                                                                                                                                                                                                                                                |
| Shape engine       | `src/shapes/graphics/`                      | Hand port of androidx graphics-shapes incl. Morph. **Does Kotlin's 32-bit Float math step for step** (`Math.fround` everywhere, in Kotlin's order): every number matches Android bit for bit. Keep it that way in any change.                                                                                                                       |
| Material shapes    | `src/shapes/material-shapes.ts`, `shape.ts` | 35 MaterialShapes, `<rx-shape>` (morphs on shape change with an Animatable on the default spatial spring).                                                                                                                                                                                                                                          |
| Motion             | `src/motion/`                               | Port of SpringSimulation, SpringEstimation, FloatSpringSpec, Spring constants, MotionScheme, Animatable's frame logic; `springTiming()`, `animateWithSpring()`, `motionDurationScale()` / `setMotionDurationScale()` (reduced motion = scale 0). `spring.ts` has no imports so the token script can import it.                                      |
| Internals          | `src/internals/`                            | `HostSemanticsController`, `addActivation`, `FormAssociated`, `submitForm`/`resetForm`, `RovingTabindexController`, `minimumInteractiveComponentSize`, `InteractionElevationController` (Compose's ButtonElevation logic), `redispatchEvent`, `isRtl`.                                                                                              |
| Scrim              | `src/scrim/`                                | `<rx-scrim>`.                                                                                                                                                                                                                                                                                                                                       |
| Button             | `src/button/`                               | `<rx-button>` with `variant` filled / tonal / elevated / outlined / text.                                                                                                                                                                                                                                                                           |
| Demo               | `demo/`                                     | One page per finished step, listed in `demo/pages.ts`; `shell.ts` builds the header and nav.                                                                                                                                                                                                                                                        |
| Golden tests       | `scripts/shapes-golden/`                    | Compiles Google's real Kotlin and writes reference JSON (see below).                                                                                                                                                                                                                                                                                |

## Setting up a fresh container

```sh
npm install
# Google sources, pinned to the commit everything was generated from:
npm run tokens:fetch -- 05311d19b0b22b2fa108016661b81ddf0586939b
npm run tokens            # should change nothing (git status clean)
npm test
```

`npm run tokens:fetch` without a commit takes androidx-main's newest code,
which can change tokens. Only move to a newer commit on purpose, and then
check every diff.

### Golden tests (Google's Kotlin as the reference)

The shape, morph and spring ports are checked against output from Google's
real Kotlin, compiled here with the Kotlin compiler (Java is installed):

```sh
./scripts/shapes-golden/fetch-kotlin-deps.sh .cache/kt-deps   # 10 jars from Maven Central / Google Maven
KT_DEPS=.cache/kt-deps ./scripts/shapes-golden/generate.sh
git status   # the golden JSON must not change unless the port or the sources changed
```

It writes `packages/web/test/shapes/golden/{graphics-shapes,material-shapes,morph}.json`
and `packages/web/test/motion/golden/spring.json`. The Kotlin files used are
compiled as they are, or extracted verbatim by `extract-material-shapes.mjs` /
`extract-spring.mjs` (never retyped). Verified at the end of this session:
regenerating from a clean setup gives identical files.

## How the work has been done (keep doing it this way)

1. Read the Compose sources for the step in full, and their tokens. Grep
   other components to see how Compose uses the thing (as was done for the
   scrim in ModalBottomSheet and the drawer).
2. Port by hand with Apache-2.0 headers naming the Kotlin files. Use the
   generated tokens; type numbers by hand only where Compose does
   (ButtonDefaults' 58dp, 18dp, etc.), with a comment.
3. Tests hold their own copy of Compose's values. Golden-compare numeric
   logic. Then a sabotage pass: break the code several ways (a Python script
   that replaces a line, runs the test file, restores) and add tests for
   whatever was not caught. Every step so far found at least one gap.
4. Run timing-sensitive tests several times; CI machines are faster or
   slower. Prefer checking the animation's own timing
   (`element.getAnimations()[0].effect.getTiming()`) or slowing time with
   `setMotionDurationScale(10)` over sampling frames.
5. Demo page, Playwright screenshots (desktop, dark, 375px), send them.
6. Docs (ROADMAP tick + decision bullet, COMPONENTS row, README section,
   step count), all checks, commit, push, wait for CI and confirm.

## Gotchas met so far

- **Never kill processes by a pattern that matches your own shell.**
  `pkill -f vite` or `ps ... | awk '/http.server 4321/'` inside the same
  command line kills the Bash tool's own shell (exit 144). Start the preview
  server in its own command: `cd dist-site && python3 -m http.server 4321 &`.
- Playwright clicks must be on screen: use `locator.click()` (it scrolls),
  not `page.mouse.click()` at coordinates below the fold.
- Full-page screenshots show the sticky header mid-page if the page was
  scrolled; scroll to the top before the screenshot.
- `focus()` on something inside an `overflow: hidden` box scrolls that box;
  use `{preventScroll: true}` for things that animate in.
- Browsers rewrite `linear()` easings, `color-mix()` colors
  (`color(srgb ...)`) and `path()` data when stored: compare through a probe
  element, not as strings.
- Lit with `experimentalDecorators` and `useDefineForClassFields: false`
  (Vite 8 does not compile standard decorators). A mixin returning a class
  needs the declared-interface cast (see `FormAssociated`).
- `new Animatable(0)` is typed for numbers through `Widen<T>`.
- Constants used in `connectedCallback` must be declared above the class
  (pre-upgraded elements run it during definition).
- CI waits: poll
  `https://api.github.com/repos/siliconxcode2/RX-Material3E/actions/runs?head_sha=<sha>`
  in a background loop; on failure read logs with the GitHub MCP
  `get_job_logs` tool (run id from that API).
- The owner reads results on a phone sometimes: keep reports short, with
  screenshots.

## Owner preferences (from the conversation)

- Slow and steady, one step at a time, report then wait.
- Upstream first, extreme care, 1:1 with Compose; dig the upstream code
  rather than guess (the owner corrected the scrim demo's sheet motion by
  asking what Android does: the answer came from BottomSheet.kt).
- Plain writing (humanizer skill), short replies.
- Fonts: Google Sans Flex for English, Noto Sans family for other languages
  (by `lang`). Logo in `assets/` (icon and "RXM3E" name, no subtitle).
- npm publishing at step 79 (needs the owner's npm account); a shadcn-style
  registry may come later.

## Prepared notes for step 19 (read upstream again before coding)

Step 19 = the expressive `Button(onClick, shapes, ...)` overloads and
ButtonDefaults' size helpers, in `Button.kt` (the second overload of each
button, around lines 238, 417, 570, 721, 874) and ButtonDefaults (around
lines 918 to 1700), plus `internal/AnimatedShape.kt`.

What was already read at the end of this session:

- Sizes by container height: XS 32dp (ButtonXSmallTokens), S 40dp
  (ButtonSmallTokens, = MinHeight), M 56dp, L 96dp, XL 136dp
  (ButtonMedium/Large/XLargeTokens).
- `shapesFor(height)` picks the pressed shape by the midpoint between sizes:
  XS uses `extraSmallPressedShape`, S the default shapes, M `mediumPressedShape`,
  L `largePressedShape`, XL `extraLargePressedShape`. The resting shape is
  `ButtonDefaults.shape` (round, CornerFull); square shapes come from the
  `ContainerShapeSquare` tokens. Check each size's token file for the square
  and pressed corner sizes (roughly: XS/S square = medium, pressed = small;
  M square = large, pressed = medium; L/XL square = extra large, pressed =
  large; confirm in the tokens, the summary here was skimmed).
- `contentPaddingFor(height, hasStartIcon, hasEndIcon)`: below S
  ExtraSmallContentPadding (12dp sides, 6dp vertical, upstream TODO), below M
  the small padding (16dp sides, 10dp vertical, `iconSmallHorizontalPadding`
  with icons), below L medium (Medium tokens' leading/trailing, 16dp
  vertical), below XL large (32dp vertical), else ExtraLargeContentPadding
  (48dp vertical). Note the expressive overload's default padding is
  `contentPaddingFor(MinHeight)` (16dp sides), unlike the classic 24dp.
- `iconSizeFor`, `iconSpacingFor`, `textStyleFor` (labelLarge below M,
  titleMedium below L, headlineSmall below XL, else headlineLarge).
- Outline width grows with size (ButtonXLargeTokens etc. `OutlinedOutlineWidth`).
- Press morph: `shapeByInteraction(shapes, pressed, spec)` with spec
  `MotionSchemeKeyTokens.DefaultEffects` ("intentional here to prevent any
  bounce"); for corner-based shapes it uses `rememberAnimatedShape` from
  `internal/AnimatedShape.kt` (an Animatable progress 0..1 with
  `Interpolatable.lerp` between the two corner shapes; reversing mid-way
  flips progress and velocity; a new target mid-way freezes the current
  interpolated shape). The ported `Animatable` and `motionSpring(el,
'defaultEffects')` are ready for this. Corner radius interpolation for
  "full" corners needs care: CornerFull is 50% of the height, so lerp in px
  from the current size.
- Decide with the owner (or keep the classic default and add a `size`
  attribute): whether `<rx-button size="m">` switches to the expressive
  overload's padding and shapes. The classic overload stays the default
  unless the owner wants otherwise.
- Precision pointer sizing (`shouldUsePrecisionPointerComponentSizing`) is
  behind a flag that is off upstream: ignore it.
