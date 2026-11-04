# Brush Buddies

A kid-friendly, animal-themed toothbrushing timer hosted as a static site on GitHub Pages.

## Files

- `index.html` — accessible app structure and settings dialog
- `styles.css` — responsive layout, animations, and animal color themes
- `app.js` — timer, preferences, random buddy selection, sound effects, and optional local camera motion detection

## Features

- Random animal buddy on every page load by default, or choose a favorite
- 14 animal themes: cat, bunny, koala, dog, fox, bear, panda, penguin, owl, lion, frog, tiger, elephant, and unicorn
- Configurable brushing duration from 1 to 5 minutes
- 30-second brushing sections with configurable 0, 3, 5, or 10 second breaks
- Independent animal-call and interface sound toggles
- Animation and reduced-motion settings
- Optional camera-based motion detection: detected movement makes the buddy dance; a lack of movement pauses the timer
- Motion detection runs locally in the browser using a small in-memory canvas frame comparison; no video, images, or motion data are uploaded, streamed, or sent to an API
- Camera is off by default, requires an explicit user action and browser permission, and can be stopped at any time
- Preferences saved locally in the browser
- Responsive design and no build step or runtime dependencies

## Privacy and camera behavior

The optional motion feature uses the browser's `getUserMedia` camera permission and performs frame-difference motion analysis entirely on the user's device. It does not use a cloud vision service, external AI model, analytics endpoint, or remote processing. Frames are reduced to a small grayscale sample in memory and are not saved. Camera tracks are stopped when the user turns the feature off or leaves the page. The camera preview is displayed locally so the user can see what the browser is analyzing.

Motion detection is a general visual movement signal, not toothbrush recognition. Other movement in the camera view can keep the timer active, and poor lighting or a still camera view can affect detection. Use the sensitivity setting to adjust detection. A secure HTTPS origin (such as GitHub Pages) and browser camera permission are required.

## Sound and asset notes

Animal calls and interface sounds are synthesized locally with the browser's built-in Web Audio API. They are original, generated sound effects—not downloaded recordings—so the project does not bundle or hotlink third-party sound files. The animal artwork uses Unicode emoji, and the app uses system fonts. No external asset license or attribution is required for bundled media because there are no bundled third-party media assets.

## Run locally

Open `index.html` in a modern browser or serve this folder with a local static web server. Camera access requires localhost or HTTPS. Sound playback begins after the user interacts with the page, as required by modern browser autoplay policies.

## Deployment

The repository's GitHub Pages deployment is configured in the repository settings. No custom GitHub Actions workflow is required; GitHub Pages handles deployment automatically.
