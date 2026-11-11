# Branch Notes: fix/stale-cache

## 1. Discoveries & Deviations
- Report: "Dark mode doesn't work, nothing changes" in Chrome. The live site works in a fresh Chrome (Dark applies, Match my device follows the OS).
- Likely cause (unconfirmed): GitHub Pages serves files with `Cache-Control: max-age=600`, so a browser can hold a new `index.html` (with the Appearance dropdown) next to an old `app.js` or `styles.css` (no handler or dark palette), so the dropdown shows but does nothing.
- Fix: version the CSS/JS URLs (`?v=0.4.2`) and make the service worker fetch with `cache: "no-cache"` so it always revalidates (cheap conditional request). Cache bumped to `v5`, footer `v0.4.2`. Verified over localhost: the service worker takes control, Dark applies, and it still loads offline.
- Release step: bump the `?v=` in `index.html` and `sw.js` with the footer version on each release.

## 2. Blockers & Risks (4a)
- Root cause not confirmed on the reporter's browser. If it persists after a hard refresh, collect browser version and any console errors.

## 3. Quick Wins (4b)
- Generate the version string from one place instead of three.

## 4. Deferred Items (4c)
- Pre-paint inline script to avoid a light flash in dark mode.

## 5. Clock as play/pause (follow-up)
- The timer ring is now a play/pause control (`role="button"`, tap, Enter, Space) that calls the same `start()` as the buttons, so it covers start, pause, resume and restart-after-done, including camera mode. The `aria-label` follows the state. Verified in Chrome: tap and keyboard toggle, time freezes while paused. Footer and `?v=` bumped to `0.4.3`.
