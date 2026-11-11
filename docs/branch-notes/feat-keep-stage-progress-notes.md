# Branch Notes: feat/keep-stage-progress

## 1. Discoveries & Deviations
- Jumping to a stage used to reset it to its full time (even tapping the current stage), so an accidental tap lost progress.
- Each stage's remaining time is now saved by stage id (`stageProgress`), so reordering is safe. Switching away saves it, and returning restores it.
- "Time left" and the ring now count every stage's saved time, not just the stages after the current one.
- When a stage finishes, the app goes to the next stage that still has time (wrapping around) and only finishes when none are left. Before, it finished after the last stage in the list, which would silently skip a stage you had left partway.
- A finished stage shows as done. Re-selecting it restarts it at full time as a redo, but leaving it without brushing keeps it finished.
- Editing a stage's seconds clears its saved progress. Reset, and closing settings with Save (which resets), clear all progress. Footer `v0.5.0`.
- Verified in Chrome with 5-second stages: partial times restored on switching back (3s and 4s), the total left stayed consistent, the finished-order flow was S2, then S0, then S1, then done, and reset restored all.

## 2. Blockers & Risks (4a)
- Behaviour change: skipped stages are now revisited before finishing.

## 3. Quick Wins (4b)
- Show partial progress on each stage chip.
- Fix stage-tap jump in Chrome (pointer capture retargets the click), which this feature depends on for taps.

## 4. Deferred Items (4c)
- Persist progress across page reloads.
