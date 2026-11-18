# Toothpaws

Two-minute toothbrushing trails with an animal friend. A kid-friendly toothbrushing timer at **https://eight1fivedesign.com/toothpaws/**.

(Formerly Brush Buddies. The cache prefix and saved-data keys keep the old name so existing progress carries over.)

## Hosting

- This repository publishes to GitHub Pages at `higherkey.github.io/toothpaws/`.
- eight1fivedesign.com serves it at `/toothpaws/` through a Cloudflare Pages Function in the `eight-one-five-design` repository, which fetches each file from GitHub Pages at the edge. A merge here goes live on both addresses.
- `move-home.js` runs first on every page load. On `higherkey.github.io` it forwards to eight1fivedesign.com, carrying this device's guest progress (settings, buddies, journal) in the link once. On the new address it imports that progress only where nothing is saved yet, then clears the link. Signed-in profiles sync from the account service instead, which must list eight1fivedesign.com as a trusted domain.

## Features

- 14 animal buddies with a quick switcher on the main screen
- Two experiences: a Simple timer, or Adventure Mode, where each brush is a short trip with scenery to explore and stickers to collect in a Field Journal (switch with the 🗺️ button or in Buddy settings)

- Customizable brushing stages: rename, change emoji, edit reminders, set each stage duration, add or remove stages
- Tap a stage to jump to it; touch and hold a stage on the main screen to reorder it
- When every stage is done, one big **Brush again** button starts a fresh session; **Start over** restarts a session in progress
- Separate settings submenus for Buddy, Stages, Timer & sounds, and Motion
- Configurable breaks between stages and independent sound toggles
- Local MediaPipe camera Assist: face-following mouth target, small-motion detection, calibration, adjustable target and local video replay; optional automatic pausing for manual brushes
- Preferences and stage definitions are saved locally in the browser
- A warm, rounded Toothpaws look with large kid-friendly controls (see Brand below)
- Motion sampling only analyzes newly delivered camera frames to reduce unnecessary work on phones
- No build step; camera mode uses a pinned, locally bundled MediaPipe runtime and face model

## Camera Assist

Turn Camera on, keep your face and brushing hand visible, then press Start. **Assist is the default:** the timer runs normally while visible movement animates the buddy. Under Camera & brushing, optionally enable **Pause when movement stops** for manual brushes. This waits for sustained movement and pauses after about 2.5 seconds without fresh evidence. Electric brushes use Assist because their vibration may not be visible.

MediaPipe Face Landmarker 0.10.32 runs in a dedicated worker using a bundled model and WebAssembly. Upper-face landmarks stabilize a mouth/cheek crop at 128×96. The analyzer compares local tiles at roughly 100ms and 300ms intervals, normalizes uniform exposure changes, and requires sustained evidence. It does not implement optical flow or identify a toothbrush. Talking, head movement, occlusion, blur and changing light remain possible sources of error.

- **Calibrate:** hold still for two seconds, then brush normally for three seconds when prompted. Only observed frames advance calibration. A poor separation between stillness and brushing is rejected. Calibration is session-only and resets when the target, configuration or tracking continuity changes. Strict mode gives no timer credit during calibration.
- **Adjustable target:** choose it in Camera settings, then position and resize it using the sliders. The preview outlines the actual analyzed crop, including rotation when face tracking is used.
- **Tracking details:** inspect motion strength, tracking state and processing latency. These are diagnostic signals, not an accuracy or cleaning-quality score.
- **Local test video:** pick a local clip in Camera settings to replay it through the same worker. This replaces the camera stream. No clip is uploaded or saved by the app.

Only one frame is processed at a time, at up to 10 samples per second. Late results and results from an earlier configuration cannot resume the timer. Camera tracks and workers stop when switched off, on leaving/backgrounding the app, or on tracking failure. Camera Assist failures leave the normal timer available.

Requires HTTPS or localhost and a current browser with workers, OffscreenCanvas and createImageBitmap. The runtime, model and both SIMD/non-SIMD WASM variants are bundled under vendor/mediapipe (about 26.4 MB total). The model and selected WASM variant are downloaded from this site's own origin on first camera use, then cached for offline camera use. The basic timer installs without eagerly downloading the model/WASM.

## Privacy

Camera frames and landmarks remain in memory on the user's device. The worker returns only movement results and target geometry to the page. No video, landmarks, clip files or movement measurements are uploaded. There is no remote inference API or CDN runtime dependency. Browser camera permission may persist, but active capture ends when the helper stops.

## Camera verification

Run deterministic analyzer, worker and transport tests with Node:

~~~sh
node --test tests/camera-motion.test.cjs tests/camera-worker.test.cjs tests/camera-helper.test.cjs
~~~

Install Playwright in a separate tools directory, point PLAYWRIGHT_MODULE at that installed package if needed, then run:

~~~sh
node --test tests/camera-browser.cjs
node --test tests/adventure-browser.cjs
~~~

CHROMIUM_EXECUTABLE can select an existing Chromium binary. The browser tests run actual bundled MediaPipe inference against a public MediaPipe portrait and synthetic motion, verify timer integration, local-only requests, offline restart and responsive layouts. The portrait is a test fixture, not training data. Real brushing accuracy and performance still require iPhone Safari, Android Chrome and installed-PWA sessions with manual/electric brushes, dim light, head motion and hand occlusion. Custom temporal models or optical flow remain possible later improvements if those measurements justify them.

## Sound and artwork

Animal calls and interface sounds are synthesized locally with the Web Audio API. Animal artwork is locally bundled Twemoji SVGs (CC BY 4.0; attribution in animals/README.md and the app footer). No third-party artwork is hotlinked.

## Brand

- **Name:** Toothpaws: teeth plus paws. Every brush is a short trip with an animal friend.
- **Mark:** a paw print whose big pad is a tooth, with orange toe beans and a mint sparkle. Source is `icon.svg`; `icons/icon-maskable.svg` is the padded version for Android's adaptive icons and `icons/icon-full.svg` the full-bleed version for iOS. The PNGs in `icons/` are rendered from these.
- **Palette:** Pine `#1d4a3a`, Leaf `#2f8a5f`, Mint `#a8ebcf`, Sunrise `#ff8a4c`, Cream `#fffaf0`. Each buddy keeps its own accent for the timer ring and the active stage.
- **Type:** Fredoka for the wordmark, headings and timer; Nunito for body text. Both are bundled in `fonts/` (SIL Open Font License, see the license files there) and cached for offline use.
- **Share preview:** `og-image.png` (1200×630) is used for link previews.
- **Styles:** `brand.css` loads last and holds the palette, type and component shapes for light and dark mode.

## Run locally

Open `index.html` in a modern browser or serve the folder with a static web server. Camera access requires localhost or HTTPS.


## Install as an app (PWA)

Toothpaws is a Progressive Web App. On a supported browser, use the browser's **Install app** or **Add to Home Screen** command to put it on your device's home screen. The standalone display mode opens without the normal browser chrome.

A service worker precaches the app shell so the timer can load offline after the first successful visit. App navigation is network-first when online and falls back to the cached page when offline. The worker only handles same-origin GET requests; it does not intercept camera streams or external requests. Camera motion detection continues to process frames locally and still requires camera permission.

The web app manifest, SVG icon and PNG icons (including maskable versions) provide the app name, launch location, colors, and install icon. Service worker registration requires HTTPS (GitHub Pages provides this) or localhost.

## Adventure Mode

Adventure Mode is optional and can be switched on or off at any time without resetting the timer.

- Each session follows your buddy's habitat trail; three completed trips unlock their own home route.
- Each brushing stage is a stop on the trail. Your buddy moves through their habitat as the stage timer runs down.
- Finishing every stage awards a sticker for the Field Journal, with an occasional rare 🌟.
- It's picture-first by default. Turn on **Story text** in Buddy settings to add a short line at each stop.
- Journal progress is separate from timer settings, so "Reset settings" does not erase it. Sign in to save the collection across devices.

## Animal expeditions

Adventure is the default for new settings. Each local calendar day chooses a visiting buddy from the locked collection. Cat and Bunny are starter choices; the 75-animal field journal unlocks each visitor and its habitat after three completed sessions. Unlocked animals can be chosen in Simple mode or from the collection for another adventure. Switching animals updates the journey immediately. Existing stickers are preserved.

The creek avatar follows completed brushing time, with reduced-motion support. Collection backup/restore is available because clearing browser storage can erase guest progress. Neon accounts save completed expeditions across devices. One account can own a single profile or separate child profiles. Guest progress is imported only when explicitly checked while creating a profile.

Verify progression with `node --test tests/buddies.test.cjs` and, with the same Playwright environment as above, `node --test tests/expedition-browser.cjs`.

## Neon accounts

The dedicated Brush Buddies Neon project uses managed Auth and the authenticated Data API. Public endpoints are in neon-config.js; no API key or database password belongs in frontend code. db/001-accounts.sql is the additive schema already applied to the project. RLS restricts profiles and append-only expedition events to their owner.

Sign in with email/password, then create or select a nickname profile. Profile switches reset the current timer. Account collections and guest progress use separate local keys. Completed sessions are queued on the device, deduplicated by session ID in Neon, and retried when online or through Sync now. Do not clear an offline device until syncing succeeds. Backup imports go into guest mode and can be brought into a new profile.

Auth calls are lazy: camera/timer-only use makes no account-service requests. Managed cookies are secure and HTTP-only, and short-lived database JWTs stay in memory. Password reset uses Neon's email flow. Cross-site-cookie restrictions (especially Safari/installed PWAs) and email delivery still need real-device verification; a same-site Auth domain/proxy may be needed where browser policy blocks the managed cookie.

Run npm test for deterministic tests. Live-service tests require explicit NEON_LIVE_TEST=1: node --test tests/accounts-live.cjs, followed by node --test tests/accounts-browser.cjs with the Playwright environment described above. They create synthetic accounts using example.com addresses; test credentials are stored only in ignored .local/ for the follow-on browser test. Never run the schema migration against an unrelated database.

Adventure scenery follows each animal’s habitat (15 illustrated environments). The portrait camera follows the buddy across the entire path; narration sits below the scene, and germs are no longer shown.

The mobile layout is capped at 430px on every screen. Today's visitor is labeled above the animal; three trips unlock that buddy and its home. Visitors change with the local calendar day, including when the app stays open overnight, without interrupting an active trip. Consecutive days avoid the same visitor. Camera and music controls sit beneath the timer; collection backups are in Settings.

## Current-profile progress tools

Open **Settings → Advanced tools**, enter **brush-admin**, then choose **Open progress tools**. Edit animal visits (three unlocks its home), sticker counts, total trips, and today's visitor. Changes are drafts until saved. Unlock all animals and Undo last save are available. Saving starts a fresh timer.

The code reveals editing controls; it is not an authentication secret. Guest edits affect only this device. Signed-in edits require a selected owned profile and a successful sync, and are saved to that account. Today's visitor stays device-local. Older edits are rejected if progress changed, including changes on another device. Existing completed-session IDs are preserved so syncing cannot award them twice.

Apply `db/002-progress-tools.sql` after migration 001 before deploying this version. It adds a revision column, owner-only updates limited to progress and revision, and a trigger requiring revisions to advance exactly once; profile identity and expedition events remain protected. Verify with `npm test`, `tests/progress-tools-browser.cjs`, and the opt-in account suites above (run `accounts-live.cjs` first to create a fresh fixture).
