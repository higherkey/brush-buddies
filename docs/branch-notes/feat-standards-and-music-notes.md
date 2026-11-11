# Branch Notes: feat/standards-and-music

Earlier work (chiptune music, UI standards, footer link) merged via PRs #1-#3. This round is the follow-up.

## 1. Discoveries & Deviations
- Music now follows the timer: it plays only while the phase is `running` or `break`, and stops on pause, reset, done, camera wait and tab hide.
- Driven by `syncMusic()`, called at the end of `render()`, so every phase change starts or stops it with no extra hooks.
- The music button is now a persisted on/off preference (a mute switch). It was a manual play button that reset to off on every load.
- Renamed the setting `musicEnabled` to `musicOn` (default `true`), so earlier saved `false` values do not silence it.
- Removed the visibility handler that force-disabled music. The existing pause-on-hide path already stops it.
- Footer version set to `v0.2.0`.
- Verified in Chrome via Playwright with an oscillator counter: 0 notes idle, paused, reset and muted; about 9 notes per second while running.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- None open. Stage-to-stage transition playback is covered by the running/break sync.

## 4. Deferred Items (4c)
- Custom user-uploaded melodies or additional audio synthesis presets.
- Per-stage sound overrides.
