# Branch Notes: fix/visible-animal-habitats

## 1. Discoveries & Deviations
- Mobile-only correction: all modes and dialogs capped at 430px, centered in larger windows. Mobile rules are unconditional; removed the two-column desktop template and viewport-scaled heading. Added regressions comparing phone and 1920px layouts.
- Restored friendly names (original 14 retained; named all75). Animal name is now above the scene with journal metadata separate below it; IDs/unlocks unchanged.
- Live diagnosis: public site still served 0.8.0 because PR20 was unmerged; publishing tested 0.8.2/cache v11 is part of the fix.
- Two root causes: portrait SVG slice cropping hid the avatar at both path ends; newer native emoji (seal/jellyfish) rendered as missing glyphs. Camera now follows the animal; scene/narration have separate space.
- Habitat-based routes replace modulo-assigned shared scenery; keep existing unlocks, stickers and accounts unchanged.

- Bundled all 75 animal illustrations locally (Twemoji, pinned source SHA and per-file hashes, CC BY 4.0 attribution/license). Scene, Simple timer, buddy switcher and collection use SVG artwork; all assets precached (155KB total).
- Verified 67 unit tests and three browser suites (including 40 camera assertions). Touch/mobile DPR2 at 320×568, 360×800, 390×844, 430×932 and 844×390; light/dark, reduced motion, 15 habitats at start/middle/end, all75 assets decode. Phone/desktop and polar/ocean screenshots inspected. All three scene/layout stylesheets pass Sitewright audit.

## 2. Blockers & Risks (4a)
- Real iPhone/Android rendering and account cookie checks remain manual.

## 3. Quick Wins (4b)
- Done: remove germs from markup, rendering, audio, styles and product copy.
- Done: make the animal larger and easier to distinguish from every landscape.

## 4. Deferred Items (4c)
- None discovered.
