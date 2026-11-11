# Branch Notes: fix/text-visibility

## 1. Discoveries & Deviations
- Measured contrast: `--muted` was 3.56:1 on the page background, hard-coded greys ranged 2.8 to 4.1:1, and several theme accents (such as cat) fell below 4.5:1. White Start/Pause text on the light accent was only 2.1 to 2.8:1.
- Fix is token-based: darkened `--muted` and the hard-coded greys and green, added `--accent-text` and `--accent-strong` on `#app` (mixed from each theme's `--accent-dark` and `--ink`, so each theme stays readable), and used them for accent-coloured text and the Start/Pause buttons.
- Raised every font size below 0.75rem to 0.75rem. Quick buttons now wrap onto two lines at narrow widths instead of ellipsizing.
- Verified in Chrome with a contrast scan of all rendered text across six themes at 360px and 1024px (0 failures other than aria-hidden decorative shapes) and no horizontal overflow.
- Zero `!important`, zero inline styles.

## 2. Blockers & Risks (4a)
- None. The scan skipped the settings dialog while closed; its text uses the same tokens.

## 3. Quick Wins (4b)
- Fix stage-tap jump (pointer capture retargets the click).

## 4. Deferred Items (4c)
- Re-scan the open settings dialog and dark-theme variants if any are added.
