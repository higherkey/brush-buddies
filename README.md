# Brush Buddies

A kid-friendly animal-themed toothbrushing timer hosted as a static site on GitHub Pages.

## Features

- 14 animal buddies with a quick switcher on the main screen
- Two experiences: a Simple timer, or Adventure Mode, where each brush is a short trip with sugar bugs to clean and stickers to collect in a Field Journal (switch with the 🗺️ button or in Buddy settings)

- Customizable brushing stages: rename, change emoji, edit reminders, set each stage duration, add or remove stages
- Tap a stage to jump to it; touch and hold a stage on the main screen to reorder it
- Separate settings submenus for Buddy, Stages, Timer & sounds, and Motion
- Configurable breaks between stages and independent sound toggles
- Local MediaPipe camera Assist: face-following mouth target, small-motion detection, calibration, adjustable target and local video replay; optional automatic pausing for manual brushes
- Preferences and stage definitions are saved locally in the browser
- A paper-and-field-guide inspired layout with clear, squared-off panels and large kid-friendly controls
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
~~~

CHROMIUM_EXECUTABLE can select an existing Chromium binary. The browser tests run actual bundled MediaPipe inference against a public MediaPipe portrait and synthetic motion, verify timer integration, local-only requests, offline restart and responsive layouts. The portrait is a test fixture, not training data. Real brushing accuracy and performance still require iPhone Safari, Android Chrome and installed-PWA sessions with manual/electric brushes, dim light, head motion and hand occlusion. Custom temporal models or optical flow remain possible later improvements if those measurements justify them.

## Sound and artwork

Animal calls and interface sounds are synthesized locally with the Web Audio API. Animal artwork uses Unicode emoji. No third-party audio or image assets are bundled or hotlinked.

## Run locally

Open `index.html` in a modern browser or serve the folder with a static web server. Camera access requires localhost or HTTPS.


## Install as an app (PWA)

Brush Buddies is a Progressive Web App. On a supported browser, use the browser's **Install app** or **Add to Home Screen** command to put it on your device's home screen. The standalone display mode opens without the normal browser chrome.

A service worker precaches the app shell so the timer can load offline after the first successful visit. App navigation is network-first when online and falls back to the cached page when offline. The worker only handles same-origin GET requests; it does not intercept camera streams or external requests. Camera motion detection continues to process frames locally and still requires camera permission.

The web app manifest and SVG icon provide the app name, launch location, colors, and install icon. Service worker registration requires HTTPS (GitHub Pages provides this) or localhost.

## Adventure Mode

Adventure Mode is optional and can be switched on or off at any time without resetting the timer.

- Each session your buddy visits a place: one of six shared destinations, or sometimes their own home spot.
- Each brushing stage is a stop on the trail. Sugar bugs fade away as the stage timer runs down.
- Finishing every stage awards a sticker for the Field Journal, with an occasional rare 🌟.
- It's picture-first by default. Turn on **Story text** in Buddy settings to add a short line at each stop.
- Journal progress is stored on the device under its own key, so "Reset settings" does not erase it.
