# Branch Notes: feat/animal-expeditions

## 1. Discoveries & Deviations
- Neon accounts: email/password sign-in and recovery; independent child accounts or parent-owned nickname profiles. Explicit guest import; profile-scoped local storage and append-only reward events. No frontend secrets or stored login tokens.
- Managed REST avoids the SDK's unused server/React dependencies and failing audit. Runtime remains dependency-free; npm test and lockfile added for repeatable verification.
- Verified live: owner isolation, unauthorized writes denied, duplicate inserts ignored; real-browser login/profile isolation, offline retry, new-device recovery, held-lock profile changes and same-profile offline tabs.
- Adventure becomes the default, with a large SVG creek journey, daily visiting animal and 75-animal collection. Two starter animals; three completed expeditions fill an entry and unlock selection plus the animal home.
- Preserve existing sticker storage; collection uses its own validated local key. Existing explicitly selected Simple mode remains available.
- Sitewright tokens and typography generated before UI edits. Emoji animals remain approved artwork; navigation uses text/native controls.

- Verification: 66 account/collection/camera/animation unit tests pass; browser checks cover default mode, stable daily visitor, 73 locked options, creek travel, three-session unlocks, home location, backup/restore and persistence. Existing Adventure and 40-assertion camera browser suites pass.
- Both new stylesheets pass Sitewright audit with zero errors. Inspected mobile and desktop screenshots; existing emoji/main-stylesheet audit exceptions remain.
- Backup merging tracks session-to-animal credits so distinct sessions combine and repeated imports do not double-credit. Legacy backups without this ledger retain maximum snapshot counts.
- Data review fixes: separate daily record prevents rollover overwriting visits; retain completion IDs for deduplication; include generated home stickers alongside legacy pages; validate backup session counts before writes.

## 2. Blockers & Risks (4a)
- Neon project cold-dawn-39068207 provisioned with managed Auth + Data API; schema applied and real RLS/browser tests passed. Live email delivery and Safari/installed-PWA cookie behavior remain manual.
- Real-device camera/touch/audio validation remains manual.

## 3. Quick Wins (4b)
- Live-test cleanup: removed only the 12 synthetic example.com accounts created for verification and their test profiles; no real accounts were touched.
- Account fixes: merge outboxes under reward lock, capture completion ownership before waiting, refresh persisted queue before upload; no cross-profile reward transfer or false synced status.
- Environment: C: full; moved only task-owned temporary Playwright dependencies to ignored Z: task storage. New caches/artifacts use Z:.
- Done: animal changes update destinations; distinguish daily guest from unlocked selectable buddies.

## 4. Deferred Items (4c)
- Same-site Auth proxy/custom domain if Safari cookie testing requires it. Candidate: deployment / size S; needs device evidence first.
