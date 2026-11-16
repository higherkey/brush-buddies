# Branch Notes: feat/profile-progress-tools

## 1. Discoveries & Deviations
- Hidden progress tools edit only the active guest or owned account profile; the entry code is a UI shortcut, not authentication.
- Daily visitors are randomly chosen and persisted for the local calendar day; jellyfish has no default priority.
- Fixed stale visitors in apps left open overnight and Simple settings overriding Adventure; avoid consecutive-day repeats and preserve active trips during normal rollover.
- Current-profile editing uses Neon owner RLS, column-limited PATCH, revision CAS and server revision trigger. Preserve credited sessions during edits/undo; fresh baseline on sync carries changes across devices. Migration 002 applied to the verified dedicated project.
- Home now prioritizes the visitor, scene and timer: single Settings header action, compact mode switch, clearer visitor/unlock copy, smaller buttons, subtle camera/music row, backups in Settings and collapsible credits. Mobile cap remains 430px.
- Verified 72 unit tests, four local browser suites (including 40 camera assertions), and live Neon API/browser ownership, cross-device edit/undo, stale revision and offline rejection checks. Independent security and mobile design reviewers report no remaining actionable defects.

## 2. Blockers & Risks (4a)
- Physical-phone/PWA cookie checks remain manual. No configured SonarCloud or PR CI; runtime suites and Pages deployment are the gates.

## 3. Quick Wins (4b)
- Remove the animal's white badge while preserving portrait camera/path fixes.
- Included one-save undo, cancel-without-save, stale-reward protection and server-denied anonymous/cross-owner/identity updates.
- Made backup restore keyboard accessible and rolled back partial local-storage writes. Removed task-created synthetic accounts/profiles after live checks.
- Included keyboard-reachable backup restore and rollback if device writes fail partway through a progress edit.
- Sitewright stylesheet audits pass. HTML audit retains existing animal/stage emoji by product choice; its four-field lead-form cap does not apply to the six-field progress editor.

## 4. Deferred Items (4c)
- None.
