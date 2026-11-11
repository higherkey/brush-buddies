# Branch Notes: feat/custom-melodies-stage-sounds

Implements #4 (custom melodies and presets) and #5 (per-stage sound overrides).

## 1. Discoveries & Deviations
- "User-uploaded melodies" is implemented as typed note names (`C5 E5 G5 - E5`, `-` is a rest), validated live, saved in `customMelody` with a slow/normal/fast speed.
- Added presets Moonlight Mellow and Robo Groove. Rests (`0` in a melody) are skipped by the music engine.
- Each stage has a `sound` field: `""` uses the default music, `"silent"` mutes that stage, or a song key. Resolved in `stageSongKey()` and `stageIsSilent()`.
- Bumped the service worker cache to `v2` so installed copies pick up the new files, and the footer to `v0.3.0`.
- Verified in Chrome via Playwright: custom notes play, a silent stage plays 0 notes, another stage switches song, and the melody persists across reload.
- Preexisting bug, not fixed: tapping a stage in the track doesn't jump in Chrome, because `setPointerCapture` on the container retargets the click, so `closest(".zone")` finds nothing.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Fix the stage-tap jump bug above (use `elementFromPoint` in the click handler).

## 4. Deferred Items (4c)
- Real audio-file upload or MIDI import for melodies.
- Per-stage animal-sound overrides.
