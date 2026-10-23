# Handoff

Written at the end of a long session, for a fresh Claude Code session to pick
up from. Read this, then CLAUDE.md (working rules), ROADMAP.md (the plan and
all decisions) and COMPONENTS.md (the catalog).

## Where things stand

- **Steps 1 to 20 of 79 are done**, committed and pushed, CI green.
  Phase 0 (groundwork) and Phase 1 (foundations) are finished; Phase 2
  (actions) is under way: step 18 (buttons), step 19 (button sizes, square
  shape, press morph), step 20 (toggle button).
- Repository: **https://github.com/siliconcode-dev/RX-Material3E** (the
  owner's new account; the old `siliconxcode2` account is lost). `gh` is
  logged in as `siliconcode-dev`; the clone has it as `origin` and the old
  repo as `old` (never push there).
- Branches: work is committed on `claude/material-design-web-components-fre1r7`,
  then `main` is fast-forwarded to it and both are pushed (the owner asked for
  `main` at step 20). No pull request unless the owner asks.
- Demo site: Vercel builds every push (`vercel.json`: `npm run build`,
  output `dist-site`, clean URLs, so pages have no `.html`, e.g. `/buttons`).
  The old Cloudflare Workers URL in the README is from the lost account.
- **Next: step 21**, icon button: standard, filled, tonal, outlined, toggle.
  Wait for the owner to say "Go ahead with step 21".

When the new session starts, after reading these notes, tell the owner:

> Ready for step 21 (icon button) when you are.

## The owner's machine (Windows)

The work now happens on the owner's Windows PC (Git Bash and PowerShell),
not a Linux container:

- Tests: `CI=1 npx vitest run ...` uses the installed Google Chrome
  (`channel: 'chrome'`, as on CI). Playwright's own Chromium download was
  never finished; the owner asked not to bother with it.
- Git's global `core.autocrlf=true` checks files out with CRLF, so
  `npm run format:check` reports every file. Check with
  `npx prettier --check --end-of-line auto .` locally; CI (Linux) is the
  real check, and commits are stored with LF.
- `npm run tokens` writes a literal `$(git -C ...)` as the commit (npm runs
  scripts in cmd on Windows) and orders raw-compose-tokens.json differently
  (Windows lists files alphabetically). The data is identical; restore the
  generated files with `git checkout -- packages/tokens` after checking.
- Python is `python`, not `python3`.
- This repo's git identity is `siliconcode-dev <siliconxcode@gmail.com>`
  (set locally). Contributors are listed in the README and every
  package.json: ashfaqizop (the owner), siliconcode-dev (the owner's second
  account) and Claude.
- Live demo: https://rxmaterial3e.dpdns.org/ (Vercel).
- The androidx sparse checkout in `.cache/androidx` also has the Compose
  material3 samples and foundation's `shape/` package (added for step 19).

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
| Internals          | `src/internals/`                            | `HostSemanticsController`, `addActivation`, `FormAssociated`, `submitForm`/`resetForm`, `RovingTabindexController`, `minimumInteractiveComponentSize`, `InteractionElevationController` (Compose's ButtonElevation logic), `PressInteractionController`, `AnimatedShapeState` (corner-shape morph, step 19), `redispatchEvent`, `isRtl`.            |
| Scrim              | `src/scrim/`                                | `<rx-scrim>`.                                                                                                                                                                                                                                                                                                                                       |
| Button             | `src/button/`                               | `<rx-button>` with `variant` filled / tonal / elevated / outlined / text, `size` xs to xl, `shape` round / square, `morph` (press shape morph).                                                                                                                                                                                                     |
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
- CI waits: `gh run list -R siliconcode-dev/RX-Material3E` gives the run
  id, `gh run watch <id> -R siliconcode-dev/RX-Material3E --exit-status`
  waits for it, and `gh run view <id> --log-failed` shows what failed.
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

## Notes for step 21 (icon button)

Not read yet: read upstream first, as always. Starting points: `IconButton.kt`
and `IconButtonDefaults.kt` (IconButton, FilledIconButton,
FilledTonalIconButton, OutlinedIconButton and their toggle versions) with
the icon button tokens (StandardIconButtonTokens, FilledIconButtonTokens,
FilledTonalIconButtonTokens, OutlinedIconButtonTokens and the size tokens
XSmallIconButtonTokens to XLargeIconButtonTokens, which step 22 needs).
`InteractionShapeController` (`internals/interaction-shape.ts`) is
shapeByInteraction for any number of shapes; `PressInteractionController`
takes `keys` (Space only for toggles); `motion/color.ts` animates colors as
Compose does if an icon button needs it.
