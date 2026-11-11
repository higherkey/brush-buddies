# Branch Notes: feat/dark-theme

Stacked on `fix/text-visibility` (#9). Retarget to `main` after #9 merges.

## 1. Discoveries & Deviations
- There was no dark theme, so the browser (Via) force-darkened the light page and made it dim. Added a real one plus `<meta name="color-scheme" content="light dark">` so browsers don't force-darken.
- Light hard-coded colours (borders, surfaces, grid, panels, highlight, done state, error) became tokens with the same light values. `html[data-scheme="dark"]` overrides them with a bright palette (ink `#f4f8f5` on `#213533`). Per-buddy tints (`--accent-soft`, `--buddy-bg`, `--buddy-glow`, `--ring`) derive from each buddy's accent in dark.
- New Appearance setting (Match my device / Light / Dark) in the Buddy tab, saved as `appearance`. Applied via `data-scheme` on `<html>` and a `prefers-color-scheme` listener. Also updates the `theme-color` meta.
- Bug found (also present in #9): the settings `<dialog>` sits outside `#app`, so `--accent-strong` and `--accent-text` were undefined there and the Save button lost its background. Tokens are now declared on `:root, #app`.
- Verified in Chrome: contrast scan (canvas-normalised, since `color-mix` computes to `color(srgb ...)`) of all text across 7 themes plus all four settings tabs, in dark and light at 360px and 1024px: 0 failures, no overflow. Override persists across reload.
- Service worker cache bumped to `v3`; footer `v0.4.0`.

## 2. Blockers & Risks (4a)
- Not tested in Via itself. If Via still dims the page, choose Appearance > Dark.

## 3. Quick Wins (4b)
- Fix stage-tap jump (pointer capture retargets the click).

## 4. Deferred Items (4c)
- Pre-paint inline script to avoid a light flash on load in dark mode.
