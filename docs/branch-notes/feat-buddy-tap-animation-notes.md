# Branch Notes: feat/buddy-tap-animation

## 1. Discoveries & Deviations
- Tapping or clicking the buddy plays a squash-and-bounce (`buddyPoke`) and the animal sound. The animation runs on the `#buddy` wrapper so it doesn't clash with the idle animation on `.buddy-emoji`.
- Respects settings: "Gentle animations" uses a small scale pulse, and turning animations off skips the bounce but keeps the sound (which follows the animal-sounds setting).
- Rapid taps restart the animation. The `animationend` handler ignores bubbled events from child animations.
- Verified in Chrome: class and animation applied on tap and cleared on finish, gentle variant, and sound on every tap, with no errors. Footer `v0.4.1`.

## 2. Blockers & Risks (4a)
- None. Not tested on a real touch device.

## 3. Quick Wins (4b)
- Make the buddy keyboard-reachable (it is `role="img"`, so only pointer users get the reaction).
- Fix stage-tap jump (pointer capture retargets the click).

## 4. Deferred Items (4c)
- Per-animal tap reactions (a hop for the bunny, a wiggle for the dog).
