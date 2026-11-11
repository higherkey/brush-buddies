# Branch Notes: fix/stable-main-button

## 1. Discoveries & Deviations
- Start was a wide button, but the Pause/Resume button that replaced it was a fixed 64px square, so the control row jumped on every state change.
- Start and Pause/Resume now share one rule (`flex: 1`, max 280px) and show a label ("Ⅱ Pause" / "▶ Resume"). Measured in Chrome at 360px and 1024px: the main button and Reset keep identical position and size in ready, running, paused and resumed states.
- Footer and `?v=` bumped to `0.4.4`, cache `v5`.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Fix stage-tap jump (pointer capture retargets the click).

## 4. Deferred Items (4c)
- Pre-paint inline script to avoid a light flash in dark mode.
