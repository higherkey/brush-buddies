/* A portable backup while account storage is being connected. */
(() => {
  const collection = window.BB_BUDDIES;
  const journalKey = () => 'brushBuddiesAdventureV1' + (window.BB_PROFILE_SCOPE ? ':' + window.BB_PROFILE_SCOPE : '');
  const status = document.getElementById('backup-status');
  document.getElementById('backup-export').addEventListener('click', () => {
    try {
    const blob = new Blob([JSON.stringify({ version: 1, collection: collection.load(), journal: JSON.parse(localStorage.getItem(journalKey()) || '{}') })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'toothpaws-collection.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Backup downloaded. Keep it somewhere safe.';
    } catch {
      status.textContent = 'Backup could not be created. Check that browser storage is available.';
    }
  });
  document.getElementById('backup-import').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (window.BB_PROFILE_SCOPE) {
      status.textContent = 'Sign out to restore a guest backup, then create a profile and bring that collection.';
      event.target.value = '';
      return;
    }
    try {
      if (file.size > 1000000) throw new Error('too large');
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.collection || !data.journal || typeof data.journal !== 'object') throw new Error('invalid');
      if (data.journal.sessions !== undefined && (!Number.isSafeInteger(data.journal.sessions) || data.journal.sessions < 0)) throw new Error('invalid sessions');
      const current = collection.load();
      const credits = Object.fromEntries(Object.entries(data.collection.credits || {}).filter(([id, buddy]) => typeof id === 'string' && id.length > 0 && id.length <= 200 && collection.get(buddy)));
      const mergedCredits = { ...credits, ...current.credits };
      for (const animal of collection.catalog) {
        const incoming = data.collection.visits?.[animal.id];
        if (Number.isSafeInteger(incoming) && incoming >= 0) {
          const count = entries => Object.entries(entries || {}).filter(([session, id]) => id === animal.id && collection.isVisitCredit(session)).length;
          // shortcut: old backups lack session credits; preserve their largest snapshot until account migration.
          const newVisits = collection.newAdventureVisits(animal.id, { credits: mergedCredits });
          const legacyVisits = Math.max(
            (current.visits[animal.id] || 0) - collection.newAdventureVisits(animal.id, current),
            incoming - collection.newAdventureVisits(animal.id, { credits }),
            count(mergedCredits) - newVisits
          );
          current.visits[animal.id] = Math.min(Number.MAX_SAFE_INTEGER, legacyVisits + newVisits);
        }
      }
      current.credits = mergedCredits;
      current.completed = [...current.completed, ...(Array.isArray(data.collection.completed) ? data.collection.completed : [])];
      const journal = JSON.parse(localStorage.getItem(journalKey()) || '{}');
      const stickers = journal.stickers || {};
      for (const [id, n] of Object.entries(data.journal.stickers || {})) {
        if (/^[a-z0-9-]+$/.test(id) && Number.isSafeInteger(n) && n > 0) stickers[id] = Math.max(stickers[id] || 0, n);
      }
      localStorage.setItem(journalKey(), JSON.stringify({ ...journal, stickers, sessions: Math.max(Number.isSafeInteger(journal.sessions) ? journal.sessions : 0, data.journal.sessions || 0) }));
      collection.save(current);
      document.dispatchEvent(new Event('bb:progress-loaded'));
      status.textContent = 'Collection restored. Open the journal to see your buddies.';
    } catch {
      status.textContent = 'Could not restore that file. Choose a Toothpaws backup; your existing collection is kept.';
    }
    event.target.value = '';
  });
})();
