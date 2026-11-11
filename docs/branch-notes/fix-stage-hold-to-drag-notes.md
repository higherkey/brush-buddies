# Branch Notes: fix/stage-hold-to-drag

## 1. Discoveries & Deviations
- Reordering stages needed only a small move after pressing, so it fired on accidental swipes. It now needs a press-and-hold of 380 ms (both the stage chips and the settings drag handle). Moving more than 10 px before the hold finishes cancels it, so scrolling and swipes are untouched.
- This also fixes the old tap bug: the pointer was captured on press, which redirected the click away from the chip, so tapping never jumped in Chrome. Nothing is captured now until the hold completes.
- Feedback: the dragged item gets the dashed outline (re-applied after each re-render), the phone vibrates briefly where supported, and the buddy says it picked the stage up. Touch scrolling is blocked only while dragging. Hint and handle label now say "Hold and drag". Footer `v0.5.1`.
- Verified in Chrome with a real mouse: tap jumps, quick drag does not reorder, hold-drag reorders without also jumping, tap works right after a drag, and the same for the settings handle. Not tested on a real touchscreen.

## 2. Blockers & Risks (4a)
- Touch hold-and-drag (vibration, scroll lock, no context menu) is untested on a device.

## 3. Quick Wins (4b)
- None open.

## 4. Deferred Items (4c)
- Keyboard reordering (move up/down buttons).
