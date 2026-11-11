# Branch Notes: fix/pwa-install-id

## 1. Discoveries & Deviations
- Report: in Chrome, Install offers "Create shortcut" and says the app is already installed.
- Chrome's own check (CDP `getAppManifest` and `getInstallabilityErrors`) shows the live manifest is valid and installable (the only error was that the test browser is incognito). The manifest never changed since it was added (`id: "./"`), so "already installed" is Chrome matching a leftover install record by manifest `id`.
- Fix: changed the manifest `id` to `/brush-buddies/app` so Chrome treats it as a new app and offers a real Install. An existing old install stays as a separate entry and has to be removed by hand.
- Also added PNG icons (192, 512 any, 512 maskable, generated from `icon.svg` into `icons/`), kept the SVG as `any`, added an `apple-touch-icon`, and precached the icons (cache `v6`). Previously the SVG was marked `any maskable` together, which installers discourage.
- Verified locally with a real service worker: manifest parses with 0 errors, the new id and 4 icons are read, and the icons are cached. Real installation was not exercised, because the test browser is incognito.
- No version bump here, to avoid conflicting with #15 (auto-merge checked).

## 2. Blockers & Risks (4a)
- If Chrome still says it's installed after the deploy, remove the old app at `chrome://apps` (right-click, Remove) and, on Windows, uninstall it from Settings > Apps.

## 3. Quick Wins (4b)
- Add an in-app Install button using `beforeinstallprompt`.

## 4. Deferred Items (4c)
- Screenshots in the manifest for the richer install dialog.

## 5. Correction (fix/pwa-install-id-2)
- #16 merged with only the notes and icon files: the manifest, `index.html` and `sw.js` edits were un-staged by a stash and never committed. The live manifest still had `id: "./"`. This follow-up applies those edits for real (new id, PNG icons in the manifest, `apple-touch-icon`, icon precache, cache `v6`) and bumps the footer and `?v=` to `0.5.2`.
- Lesson: check `git show --stat` of the commit before opening the PR.
