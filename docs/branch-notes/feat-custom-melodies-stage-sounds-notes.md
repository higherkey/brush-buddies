# Branch Notes: feat/custom-melodies-stage-sounds

Implements #4 (custom melodies and presets) and #5 (per-stage sound overrides).

## 1. Discoveries & Deviations
- "User-uploaded melodies" is implemented as typed note names (`C5 E5 G5 - E5`, `-` is a rest), validated live, saved in `customMelody` with a slow/normal/fast speed.
- Added presets Moonlight Mellow and Robo Groove. Rests (`0` in a melody) are skipped by the music engine.
- Each stage has a `sound` field: `""` uses the default music, `"silent"` mutes that stage, or a song key. Resolved in `stageSongKey()` and `stageIsSilent()`.
- Bumped the service worker cache to `v2` so installed copies pick up the new files, and the footer to `v0.3.0`.
- Verified in Chrome via Playwright: custom notes play, a silent stage plays 0 notes, another stage switches song, and the melody persists across reload.
- Preexisting bug, not fixed: tapping a stage in the track doesn't jump in Chrome, because `setPointerCapture` on the container retargets the click, so `closest(".zone")` finds nothing.
- Fixed the discordant, piercing music: stage key shifts now move melody, bass, harmony and percussion together (the bass used to stay put, so stage 3's +4 semitones clashed). Harmony is now an octave or fifth, the break bass is no longer a detuned fourth, and notes above 880 Hz fold down an octave.
- Added a shared low-pass filter (2 kHz) and replaced the 1960/2340 Hz square percussion with a soft triangle tick tied to the key.
- Added variety: each pass of the song cycles through four arrangements (square, triangle and doubled leads, busier bass, harmony and percussion dropouts). Measured at stage 3: 59, 53, 48 and 90 notes per pass, max 988 Hz (was 2340).

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Fix the stage-tap jump bug above (use `elementFromPoint` in the click handler).

## 4. Deferred Items (4c)
- Real audio-file upload or MIDI import for melodies.
- Per-stage animal-sound overrides.
