# Brush Buddies

A kid-friendly, animal-themed toothbrushing timer hosted as a static site on GitHub Pages.

## Files

- `index.html` — accessible app structure and settings dialog
- `styles.css` — responsive layout, animations, and animal color themes
- `app.js` — timer, preferences, random buddy selection, and sound effects
- `.github/workflows/pages.yml` — deploys the site from `main`

## Features

- Random animal buddy on every page load by default, or choose a favorite
- 14 animal themes: cat, bunny, koala, dog, fox, bear, panda, penguin, owl, lion, frog, tiger, elephant, and unicorn
- Configurable brushing duration from 1 to 5 minutes
- 30-second brushing sections with configurable 0, 3, 5, or 10 second breaks
- Independent animal-call and interface sound toggles
- Animation and reduced-motion settings
- Preferences saved locally in the browser
- Responsive design and no build step or runtime dependencies

## Sound and asset notes

Animal calls and interface sounds are synthesized locally with the browser's built-in Web Audio API. They are original, generated sound effects—not downloaded recordings—so the project does not bundle or hotlink third-party sound files. The animal artwork uses Unicode emoji, and the app uses system fonts. No external asset license or attribution is required for bundled media because there are no bundled third-party media assets.

## Run locally

Open `index.html` in a modern browser, or serve this folder with any static web server. Sound playback begins after the user interacts with the page, as required by modern browser autoplay policies.

## Deployment

The GitHub Actions workflow in `.github/workflows/pages.yml` deploys the repository root to GitHub Pages on every push to `main`. Set the repository's Pages source to **GitHub Actions**.
