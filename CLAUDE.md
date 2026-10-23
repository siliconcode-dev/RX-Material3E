# RX-Material3E: notes for Claude Code

Read **HANDOFF.md** first. It has where the project stands, how to set up the
tools (including the Kotlin reference build), the gotchas and the prepared
notes for the next step. Then ROADMAP.md (the 79-step plan and every decision
so far) and COMPONENTS.md (the catalog).

## The project

A hand port (never auto-translated) of Material 3 and Material 3 Expressive to
framework-free web components, published to npm as `@rx-m3e/tokens` and
`@rx-m3e/web` (elements are `rx-*`). Jetpack Compose Material3 is the primary
source, MDC Android the second. Built with Lit 3 and TypeScript in an npm
workspace monorepo. Live demo: https://rxmaterial3e.dpdns.org/

## Working with the owner

- The owner is a Mechanical Manager at RSGT Bangladesh, not a front-end
  developer. Explain results in plain words; keep replies short and concrete,
  with more explanation only when it is needed.
- Always write in the humanizer style (the `humanizer` skill): plain, direct,
  no AI tells (no "not X but Y", no staged openers, no forced triads, no
  hype, no bold-label lists where prose works). This applies to replies,
  docs and commit messages.
- **One roadmap step at a time.** Do the step, verify it, commit, push, wait
  for CI, report, then stop and wait for "Go ahead with step N". Never start
  the next step on your own.
- "Upstream code first, then ours": read the Compose sources (and tokens) for
  the step in full before writing anything, then port by hand.
- Extreme care for fidelity: the owner wants a 1:1 copy of Compose behaviour,
  checked against Google's real code where possible (see "Golden tests" in
  HANDOFF.md).
- When the owner reports a visual problem, reproduce it first (Playwright,
  frame by frame), then check upstream to see what Compose really does.

## Every step

1. Read the upstream Kotlin (and its tokens) fully.
2. Port by hand into `packages/web/src/<area>/`, with Apache-2.0 headers
   naming the Kotlin files.
3. Tests in `packages/web/test/`: tests hold their **own copy** of Compose's
   values (never import the list under test); golden-compare against Google's
   Kotlin when the logic is numeric; add each new element tag to
   `test/upgrade.test.ts`.
4. Sabotage check: break the code on purpose in several ways and confirm the
   tests fail; add tests for anything not caught.
5. Demo page `demo/<page>.html` + `.ts`, listed in `demo/pages.ts`.
   Screenshots with Playwright at desktop, dark and 375px mobile; check no
   console errors and no horizontal scroll. Send screenshots to the owner.
6. Docs: tick the step in ROADMAP.md (and add a "Decisions so far" bullet),
   the row in COMPONENTS.md, a README section, and "Steps 1 to N of 79 done".
7. `npm run lint`, `npm run format:check`, `npm run typecheck`,
   `npm run build`, `npm test`, all clean.
8. Commit on `claude/material-design-web-components-fre1r7` with a clear
   message ending in the attribution lines from the session's system
   reminder (no model names in repo files), fast-forward `main` to it, push
   both, wait for CI, report.

## Commands

```sh
npm install
npm run dev          # demo at http://localhost:5173/demo/
npm run build        # library to packages/web/dist and demo to dist-site/
npm test             # Vitest browser mode, Playwright Chromium
npm run lint && npm run format:check && npm run typecheck
npm run tokens:fetch # sparse-clone androidx into .cache/ (see HANDOFF.md to pin the commit)
npm run tokens       # regenerate packages/tokens from .cache
```
