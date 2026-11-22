/* Hidden tools edit the active profile; account ownership is enforced by Neon. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const buddies = window.BB_BUDDIES;
  const accounts = window.BB_ACCOUNTS;
  const dialog = $('progress-dialog');
  const status = text => { $('progress-status').textContent = text; };
  let capture, draft, daily, undo, busy = false;
  const stickers = new Map();
  const data = window.BB_ADVENTURE_DATA;
  [...data.shared, ...Object.values(data.homes), ...buddies.catalog.map(a => buddies.home(a.id))].forEach(place => {
    place.stickers.forEach(sticker => stickers.set(sticker.id, sticker));
  });
  stickers.set('rare-star', { id: 'rare-star', name: 'Shooting Star' });
  buddies.catalog.forEach(animal => {
    $('progress-animal').add(new Option(animal.name, animal.id));
    $('progress-daily').add(new Option(animal.name, animal.id));
  });
  stickers.forEach(sticker => $('progress-sticker').add(new Option(sticker.name + ' · ' + sticker.id, sticker.id)));

  async function action(work) {
    busy = true;
    const controls = [...dialog.querySelectorAll('button,input,select')];
    controls.forEach(control => { control.disabled = true; });
    try { await work(); } catch (error) { status(error.message); }
    finally { busy = false; controls.forEach(control => { control.disabled = !capture && control.id !== 'progress-close'; }); $('progress-undo').disabled = !undo; }
  }
  function showDraft() {
    $('progress-visits').value = draft.collection.visits[$('progress-animal').value] || 0;
    $('progress-sticker-count').value = draft.journal.stickers[$('progress-sticker').value] || 0;
    $('progress-trips').value = draft.journal.sessions;
    $('progress-daily').value = daily;
  }
  function count(input) {
    const value = input.valueAsNumber;
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Use whole numbers of zero or more.');
    return value;
  }
  $('progress-unlock').addEventListener('submit', async event => {
    event.preventDefault();
    if ($('progress-code').value.trim().toLowerCase() !== 'brush-admin') {
      $('progress-unlock-status').textContent = 'That tool code was not recognized.';
      return;
    }
    $('progress-code').value = '';
    $('progress-unlock-status').textContent = '';
    $('settings-dialog').close();
    dialog.showModal();
    await action(async () => {
      status('Loading current profile…');
      capture = await accounts.capture();
      draft = structuredClone(capture.snapshot);
      daily = buddies.daily();
      undo = null;
      $('progress-profile').textContent = capture.profileName;
      showDraft();
      status('Changes stay in this form until you save.');
    });
    if (!capture) $('progress-save').disabled = true;
  });
  $('progress-animal').addEventListener('change', () => {
    $('progress-visits').value = draft.collection.visits[$('progress-animal').value] || 0;
  });
  $('progress-sticker').addEventListener('change', () => {
    $('progress-sticker-count').value = draft.journal.stickers[$('progress-sticker').value] || 0;
  });
  for (const [id, update] of [
    ['progress-visits', value => { draft.collection.visits[$('progress-animal').value] = value; }],
    ['progress-sticker-count', value => { draft.journal.stickers[$('progress-sticker').value] = value; }],
    ['progress-trips', value => { draft.journal.sessions = value; }]
  ]) $(id).addEventListener('change', event => {
    try { update(count(event.target)); status('Unsaved changes.'); }
    catch (error) { status(error.message); }
  });
  $('progress-daily').addEventListener('change', event => { daily = event.target.value; });
  $('progress-reroll').addEventListener('click', () => {
    const locked = buddies.catalog.filter(animal => !buddies.unlocked(animal.id, draft.collection) && animal.id !== daily);
    const pool = locked.length ? locked : buddies.catalog.filter(animal => animal.id !== daily);
    daily = pool[Math.floor(Math.random() * pool.length)].id;
    $('progress-daily').value = daily;
    status('New visitor chosen. Save to use them today.');
  });
  $('progress-unlock-all').addEventListener('click', () => {
    buddies.catalog.forEach(animal => { draft.collection.visits[animal.id] = Math.max(3 + buddies.newAdventureVisits(animal.id, draft.collection), draft.collection.visits[animal.id] || 0); });
    showDraft();
    status('All animals and homes will unlock when you save.');
  });
  $('progress-form').addEventListener('submit', event => {
    event.preventDefault();
    action(async () => {
      if (!capture) throw new Error('Close and reopen tools to load your profile.');
      count($('progress-visits')); count($('progress-sticker-count')); count($('progress-trips'));
      const before = { snapshot: capture.snapshot, daily: buddies.daily() };
      const saved = await accounts.edit(capture, draft);
      capture = saved;
      draft = structuredClone(saved.snapshot);
      undo = { ...before, expected: saved };
      buddies.setDaily(daily);
      window.BrushBuddies.refreshCollection();
      showDraft();
      status(capture.scope ? 'Progress saved to your account. Today’s visitor is saved on this device.' : 'Progress and today’s visitor saved on this device.');
    });
  });
  $('progress-undo').addEventListener('click', () => action(async () => {
    const previous = undo;
    if (!previous) return;
    capture = await accounts.edit(previous.expected, previous.snapshot);
    draft = structuredClone(capture.snapshot);
    undo = null;
    daily = previous.daily;
    buddies.setDaily(daily);
    window.BrushBuddies.refreshCollection();
    showDraft();
    status('Previous progress restored.');
  }));
  $('progress-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { capture = draft = undo = null; $('settings-open').focus(); });
})();
