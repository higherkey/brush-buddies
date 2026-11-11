# Brush Buddies

A kid-friendly animal-themed toothbrushing timer hosted as a static site on GitHub Pages.

## Features

- 14 animal buddies with a quick switcher on the main screen
- Customizable brushing stages: rename, change emoji, edit reminders, set each stage duration, add or remove stages
- Tap a stage to jump to it; touch and hold a stage on the main screen to reorder it
- Separate settings submenus for Buddy, Stages, Timer & sounds, and Motion
- Configurable breaks between stages and independent sound toggles
- Optional local camera motion mode: the buddy dances while movement is detected and the timer pauses after movement stops
- Preferences and stage definitions are saved locally in the browser
- A paper-and-field-guide inspired layout with clear, squared-off panels and large kid-friendly controls
- Motion sampling only analyzes newly delivered camera frames to reduce unnecessary work on phones
- No build step or runtime dependencies

## Motion detection research and approach

The original detector compared average pixel differences between frames. That can miss small movements, reversals, and forward/back motion. The current version uses a lightweight block-matching optical-flow approach: it searches for the best local patch match in the next frame and measures displacement vectors. The magnitude of motion is measured separately from its direction, so a hand moving forward and then backward can still count as continuous movement.

This is a classical computer-vision technique and requires no trained model, external API, or cloud service.

### Open-source projects worth considering

- **OpenCV.js Lucas–Kanade optical flow**: tracks sparse feature points between frames using pyramidal optical flow. A good next step if we want a mature, battle-tested tracker. Official tutorial: https://docs.opencv.org/4.x/db/d7f/tutorial_js_lucas_kanade.html
- **OpenCV.js Farnebäck optical flow**: estimates dense motion vectors across the image. It can be more comprehensive but may be heavier on lower-end phones. Covered in the same OpenCV optical-flow tutorial.
- **MediaPipe Hand Landmarker**: detects and tracks 21 hand landmarks with a pretrained model, without us training anything. This is the more targeted option if we later want to follow the hand rather than general scene movement. It adds a model asset and runtime. Official guide: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js

The current implementation deliberately avoids downloading OpenCV, MediaPipe, model files, or other dependencies at runtime. If we later vendor OpenCV.js into the repository, it can also run locally without a CDN.

## Privacy

The camera feature uses browser camera permission and processes frames in memory on the user's device. It does not send images, video, landmarks, or motion measurements to a server. Frame analysis is skipped when the camera has not delivered a new frame. No remote model, CDN script, analytics endpoint, or external vision API is used. The camera stream is stopped when the user turns motion mode off or leaves the page. Camera access requires HTTPS (GitHub Pages) or localhost.

Motion tracking measures movement in the selected image region; it does not identify a toothbrush. Other movement in view may keep the timer active, and lighting, camera placement, and background texture can affect tracking.

## Sound and artwork

Animal calls and interface sounds are synthesized locally with the Web Audio API. Animal artwork uses Unicode emoji. No third-party audio or image assets are bundled or hotlinked.

## Run locally

Open `index.html` in a modern browser or serve the folder with a static web server. Camera access requires localhost or HTTPS.


## Install as an app (PWA)

Brush Buddies is a Progressive Web App. On a supported browser, use the browser's **Install app** or **Add to Home Screen** command to put it on your device's home screen. The standalone display mode opens without the normal browser chrome.

A service worker precaches the app shell so the timer can load offline after the first successful visit. App navigation is network-first when online and falls back to the cached page when offline. The worker only handles same-origin GET requests; it does not intercept camera streams or external requests. Camera motion detection continues to process frames locally and still requires camera permission.

The web app manifest and SVG icon provide the app name, launch location, colors, and install icon. Service worker registration requires HTTPS (GitHub Pages provides this) or localhost.

## Credits

Buddy emoji are drawn with the [Twemoji Mozilla](https://github.com/mozilla/twemoji-colr) font (Apache 2.0), which contains [Twemoji](https://github.com/jdecked/twemoji) artwork by Twitter, Inc. and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
