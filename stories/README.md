# Toothpaws Storybook — authoring and unlock rules

## What is here

- [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) defines personality, background, motivation, growth challenge, and environment for **all 75 animal buddies**, with the browser-readable profiles in [characters.js](characters.js).
- [story-library.js](story-library.js) generates a **first trail story for every buddy** (roughly five minutes aloud, using each buddy's route, stops, and initial sticker). These first drafts follow a consistent framework and can be replaced by fully authored manuscripts over time.
- Five fully authored home stories live in `01-*.md` through `05-*.md`. They are available after that buddy's **first completed home adventure**.
- The app reads unlocked chapters from **existing per-buddy completed visits**. There is no separate unlock database, profile migration, or special timer requirement.

## Progression

| Completed adventures with that buddy | What happens |
| --- | --- |
| 0 | No stories readable yet |
| 1 | The buddy's first trail story unlocks |
| 2 | Another trail story may unlock here, if authored |
| 3 | The buddy and home route unlock for future trips; this third trip was still on the trail |
| 4 | First trip at home is complete; an available home manuscript unlocks |
| 5+ | Additional trail/home chapters can unlock here as we write them |

Story rewards and collectible goals are deliberately aligned. On a chapter-unlocking visit, the app gives the matching sticker when that route has one. The rare-sticker chance remains for other visits.

## Add a new authored story

1. Pick a buddy ID from `buddies.js` and reread their entry in `CHARACTER_BIBLE.md`.
2. Use `story-library.js` to verify the route for the intended chapter. For trips 1–3, use the habitat **trail**; after that, the **home**. Respect the exact destination name, stop order, and a sticker name from the appropriate destination.
3. Write a Markdown manuscript in this folder with `# Title`, then **Buddy**, **Destination**, **Stops**, **Goal item**, **Read-aloud time**, and a story of roughly **600–750 words**. Feelings, challenges, agency, and gentle endings should suit young children.
4. Add an entry to `authoredChapters` in `story-library.js`:
   `buddyId: [{ path: 'filename.md', title: 'Your title', goal: 'Exact Sticker Name', kind: 'trail', unlockAfter: 2 }]`
   If the buddy already has an entry, append to its array instead. Use a **unique milestone number** for each chapter with that buddy. Home manuscripts must be at visit 4 or later. An authored trail manuscript with `unlockAfter: 1` **replaces** the generated starter story for that buddy.
5. Add the Markdown file to `APP_SHELL` in `sw.js` if it should read offline, and increment the cache version. If updating JS/CSS, also update their versioned references in `index.html` and `sw.js`.
6. Run `npm test`, then manually check the Stories tab, reward screen, returning to an old story, and guest/account profile switching.

### Continuity and progression

Keep character temperaments and environments stable; allow growth without abruptly changing who a buddy is. Let each chapter introduce a new problem and a tiny lesson. Avoid making stories sound like a test or reward that encourages children to brush longer than their normal session. A child can always reread an already unlocked story.

A new chapter should appear **only after its specified completed adventure**. Do not show its title or content as an unlocked choice before that point. The catalog may show a locked chapter milestone without revealing plot details.

### Current location caveat

The original five manuscripts are **home** adventures, not first visits. First and second trips use the buddy's habitat trail. The app now uses special named home destinations from `adventure-data.js` for the original 14 buddies, rather than silently substituting a generic home, so these manuscripts match the in-app stops.
