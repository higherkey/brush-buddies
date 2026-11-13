# Branch Notes: feat/adventure-mode

## 1. Discoveries & Deviations
- Camera revamp (0.7.0/cache v8): pinned local MediaPipe Face Landmarker 0.10.32 in a worker, upper-face-stabilized mouth crop, exposure-normalized local tiles at 100/300ms, sustained motion, quiet/brushing calibration, exact crop overlay, adjustable target and local clip replay. No handle marker. Assist defaults to a normal timer; strict auto-pause is optional for manual brushes; electric brushes use Assist. Existing Adventure work preserved.
- Current peer-review rerun: 38 analyzer/worker/transport tests, 39 real-browser camera assertions, 33 Adventure checks, and 40 responsive/accessibility/state/offline checks pass, including real bundled face inference, localized motion resume, calibration withholding strict credit, lifecycle cleanup, settings resets, offline model/WASM restart, local replay and 360–1440px layouts. Package SHA-512 verified and provenance/license bundled. Independent review defects were fixed and regression tested; final third review passed with zero actionable defects.
- Adds Adventure Mode (Phase 1) next to the existing Simple timer. The user's choices: picture-first with an optional "Story text" toggle, a quick top-bar map button plus a setting (no lock), and hybrid destinations (6 shared places plus one home per buddy).
- `app.js` stays the only owner of the timer. It sends `bb:render` (with a `snapshot()`), `bb:reset` and `bb:finish`, and exposes a read-only `window.BrushBuddies` (`snapshot`, `say`, `tone`). `adventure.js` tracks departures, stage changes and breaks from snapshots, which covers the camera path (`resumeMotion`), jumping between stages, and switching modes mid-session without more hooks.
- Script order is `adventure-data.js`, `adventure.js`, `camera-helper.js`, then `app.js` (all `defer`); listeners and camera transport exist before the first render.
- Mode and story text apply immediately. Saving only these preferences preserves the timer; other settings changes retain the existing reset behavior.
- Journal progress is stored under `brushBuddiesAdventureV1`, separate from settings, so "Reset settings" keeps it. Bad data falls back to an empty journal.
- Mobile top bar: the grid became `repeat(3, 1fr) 46px 46px` so the new map button fits on one row at 390px wide.
- The plain `.primary-button` and `.secondary-button` classes have no styles of their own (buttons are styled by context), so the treasure dialog reuses `.save-button` and adds a scoped outlined style.
- Current version is 0.7.0/cache `v8`; Adventure scripts retain 0.6.0 URLs and camera assets are included in the shell or cached on first camera use.
- Audit (independent reviewer, 8 findings): fixed a second sticker being awarded after jumping back to a stage once finished; narration repeating on camera resume (now keyed per stage and break); the treasure popup appearing in Simple mode (it now waits until Adventure is back); the map button's state not updating after "Reset settings"; the sparkles being pulled into the layout in adventure; buddy-name contrast on the scene (now on a paper tag); and the treasure pop never animating (now gated by a class on the dialog). Journal awards now serialize read/update/write with Web Locks on supported browsers. The journal reloads storage when opened; browsers without Web Locks use the synchronous fallback.
- Accepted trade-off: if Reset is pressed within about a second of finishing, the sticker is still kept (the child earned it), but the popup is skipped. Opacity-only fades still run with gentle animations on purpose.
- Verified with a local Playwright run (390px, service workers blocked): 33 of 33 checks pass and there are no page errors. Covered: simple-mode parity, switching modes mid-session without timer changes, bugs clearing, treasure and storage, journal, reload, reset keeping the journal, story narration with no repeat on resume, the settings select not resetting, bad stored data, one sticker per session, no popup in Simple mode, and dark plus reduced-motion screenshots.


- Current peer/design review: fixed concurrent-tab award loss, stale journals, reset on saving only mode/story preferences, and stale buddy home selection before departure. Added stop names to stage accessible labels, native-dialog focus restoration, and OS reduced-motion handling.
- Current verification: 33 existing browser checks plus 40 review checks pass in Chromium, including 360–1440px light/dark layouts, text contrast, keyboard dialogs, settings/stage edit behavior, actual concurrent tabs, and offline service-worker loading. No build script, CI workflow, or SonarCloud configuration exists in this repository.
- Sitewright audit executed: emoji prohibition conflicts with the approved animal/sticker design; existing backdrop blur and the 6KB stylesheet ceiling also fail. Recorded as project-specific exceptions, not a clean tool pass.

## 2. Blockers & Risks (4a)
- Camera manual validation remains: actual brushing on iPhone Safari, Android Chrome and installed PWA; dim light, head movement, hand occlusion, electric/manual brushes, two-minute responsiveness/heat/battery. Synthetic/browser checks do not establish real brushing accuracy.
- Optional external System One advisory was not run after automatic approval review rejected export; it does not block local peer review.
- Manual step: check on a real phone (touch, sound, the installed app picking up cache v8).

## 3. Quick Wins (4b)
- Peer-review fixes: missing frame comparisons clear sustained-motion evidence; strict camera resume preserves remaining inter-stage breaks. Both defects reproduced with failing regressions before fixes (detector test and real MediaPipe browser test).
- Done for camera: actual crop overlay instead of mismatched static target, calibration instructions, processing diagnostics, local replay, stale-result/configuration rejection, permission/worker cleanup, electric Assist, lazy offline model/WASM caching with extended cache-write lifetime.
- Done: stop names in stage `aria-label`s when story text is on; restored base labels in Simple mode.

## 4. Deferred Items (4c)
- Camera: benchmark face-relative optical flow and optional hand context if tile detection fails real sessions; custom toothbrush/temporal model only after held-out clip measurements justify it. No training or uploads added.
- Reward eligibility minimum: stages can be 5 seconds; consider a minimum brushing time before rewards. Suggested label: enhancement; size S (1–2 hours).
- Adventure progression: friendship hearts, unlockable destinations, morning/evening trips. Suggested label: enhancement; size L (2–4 days).
- Adventure extras: camera-boosted walking, buddy encounters, seasonal destinations. Suggested label: enhancement; size L (3–5 days).
