(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.BB_NEON_API;
  const progress = window.BB_ACCOUNT_PROGRESS;
  let user = null, profile = null, events = [], generation = 0, syncing = false;
  let pending = false;
  const message = text => { $('account-status').textContent = text; };
  const scoped = base => base + (window.BB_PROFILE_SCOPE ? ':' + window.BB_PROFILE_SCOPE : '');
  const cacheKey = () => 'brushAccount:' + window.BB_PROFILE_SCOPE;
  const locked = work => navigator.locks ? navigator.locks.request('brushBuddiesAdventureV1', work) : Promise.resolve(work());

  function snapshot() {
    const collection = window.BB_BUDDIES.load();
    const journal = JSON.parse(localStorage.getItem(scoped('brushBuddiesAdventureV1')) || '{"stickers":{},"sessions":0,"last":""}');
    return progress.validateSnapshot({ collection: { visits: collection.visits, completed: collection.completed, credits: collection.credits || {} }, journal: { stickers: journal.stickers || {}, sessions: journal.sessions || 0, last: journal.last || '' } });
  }
  function apply(snapshot) {
    const checked = progress.validateSnapshot(snapshot);
    window.BB_BUDDIES.save(checked.collection);
    localStorage.setItem(scoped('brushBuddiesAdventureV1'), JSON.stringify(checked.journal));
  }
  function remember() {
    // All callers hold the reward lock, including the synchronous bb:reward listener.
    const cached = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
    events = [...new Map([...(cached?.events || []), ...events].map(event => [event.session_id, event])).values()];
    localStorage.setItem(cacheKey(), JSON.stringify({ profile, events }));
  }
  function showUser() {
    $('account-login').hidden = !!user;
    $('account-profiles').hidden = !user;
    $('account-summary').textContent = user ? 'Signed in · choose a brushing profile' : 'Save your buddies across devices';
    $('account-open').textContent = user ? 'Account & profiles' : 'Sign in / Save progress';
  }
  async function listProfiles() {
    const ownUser = user?.id;
    const rows = await api.data('brush_profiles', { select: 'id,owner_id,display_name,baseline', order: 'created_at.asc' });
    if (user?.id !== ownUser) return;
    const select = $('account-profile');
    select.replaceChildren(new Option('Choose a profile', ''));
    rows.forEach(row => select.add(new Option(row.display_name, row.id)));
    select._profiles = rows;
    message(rows.length ? 'Choose your profile to load its collection.' : 'Create a profile for yourself or a child.');
  }
  async function sync() {
    if (!profile || !user) return;
    if (syncing) { pending = true; return; }
    syncing = true;
    const turn = generation, selected = profile;
    const current = () => turn === generation && selected === profile;
    try {
      message('Saving collection…');
      let localEvents;
      await locked(() => { if (current()) { remember(); localEvents = events.slice(); } });
      if (!current()) return;
      if (localEvents.length) await api.data('brush_events', { on_conflict: 'profile_id,session_id' }, localEvents.map(event => ({ ...event, profile_id: selected.id })));
      const remote = [];
      for (let offset = 0; offset < 20000; offset += 1000) {
        const page = await api.data('brush_events', { select: 'session_id,buddy_id,sticker_id', profile_id: 'eq.' + selected.id, order: 'session_id.asc', limit: '1000', offset: String(offset) });
        if (!current()) return;
        remote.push(...page);
        if (page.length < 1000) break;
        if (offset === 19000) throw new Error('Collection is too large to load here. Your saved collection is unchanged.');
      }
      if (!current()) return;
      await locked(() => {
        if (!current()) return;
        events = [...new Map([...remote, ...events].map(event => [event.session_id, event])).values()];
        remember();
        apply(progress.materialize(selected.baseline, events));
        const saved = new Set(remote.map(event => event.session_id));
        if (events.some(event => !saved.has(event.session_id))) pending = true;
      });
      if (!current()) return;
      message(pending ? 'Saving new expedition…' : 'Collection saved to your account · ' + selected.display_name);
    } catch (error) {
      if (current()) message('Not synced. Your device copy is kept. ' + error.message);
    } finally {
      syncing = false;
      if (pending) { pending = false; sync(); }
    }
  }
  async function choose(selected) {
    if (!user || selected.owner_id !== user.id) throw new Error('Choose a profile from your own account.');
    progress.validateSnapshot(selected.baseline);
    await locked(() => {
    const nextScope = user.id + ':' + selected.id;
    const cached = JSON.parse(localStorage.getItem('brushAccount:' + nextScope) || 'null');
    const nextEvents = cached?.profile?.id === selected.id && Array.isArray(cached.events) ? cached.events : [];
    const nextSnapshot = progress.materialize(selected.baseline, nextEvents);
    generation++;
    profile = selected;
    window.BB_PROFILE_SCOPE = nextScope;
    events = nextEvents;
    apply(nextSnapshot);
    remember();
    window.BrushBuddies.refreshCollection();
    $('account-profile').value = selected.id;
    $('account-open').textContent = 'Account · ' + selected.display_name;
    });
    await sync();
  }
  async function checkedSession() {
    const session = await api.auth('get-session');
    user = session?.user || null;
    showUser();
    if (user) await listProfiles();
  }
  async function action(work) {
    const controls = [...$('account-dialog').querySelectorAll('button,input,select')];
    controls.forEach(control => { control.disabled = true; });
    try { await work(); } catch (error) { message(error.message); }
    finally { controls.forEach(control => { control.disabled = false; }); }
  }
  $('account-open').addEventListener('click', () => {
    $('account-dialog').showModal();
    if (!user) action(checkedSession);
  });
  $('account-close').addEventListener('click', () => $('account-dialog').close());
  $('account-dialog').addEventListener('close', () => $('account-open').focus());
  $('account-login').addEventListener('submit', event => {
    event.preventDefault();
    const intent = event.submitter?.value;
    action(async () => {
      const password = $('account-password').value;
      const email = $('account-email').value.trim();
      const token = new URL(location.href).searchParams.get('token');
      try {
        if (token && new URL(location.href).searchParams.get('reset') === 'true') {
          await api.auth('reset-password', { token, newPassword: password });
          history.replaceState(null, '', location.pathname);
          message('Password changed. Sign in with your new password.');
          return;
        }
        await api.auth(intent === 'create' ? 'sign-up/email' : 'sign-in/email', { email, password, ...(intent === 'create' ? { name: 'Brush Buddies account' } : {}) });
        await checkedSession();
        if (!user) message('Check your email to finish creating your account, then sign in.');
      } finally { $('account-password').value = ''; }
    });
  });
  $('account-forgot').addEventListener('click', () => {
    if (!$('account-email').reportValidity()) return;
    action(async () => {
    await api.auth('request-password-reset', { email: $('account-email').value.trim(), redirectTo: location.origin + location.pathname + '?reset=true' });
    message('If that account exists, a password-reset link will arrive by email.');
    });
  });
  $('account-create-profile').addEventListener('submit', event => {
    event.preventDefault();
    action(async () => {
      const name = $('account-profile-name').value.trim();
      if (!name || name.length > 40) throw new Error('Use a nickname between 1 and 40 characters.');
      const baseline = $('account-import').checked ? snapshot() : { collection: { visits: {}, completed: [], credits: {} }, journal: { stickers: {}, sessions: 0, last: '' } };
      const rows = await api.data('brush_profiles', {}, { display_name: name, baseline });
      await listProfiles();
      await choose(rows[0]);
      $('account-profile-name').value = '';
      $('account-import').checked = false;
    });
  });
  $('account-profile').addEventListener('change', event => {
    const selected = event.target._profiles.find(row => row.id === event.target.value);
    if (selected) action(() => choose(selected));
  });
  $('account-sync').addEventListener('click', sync);
  $('account-signout').addEventListener('click', () => action(async () => {
    await api.auth('sign-out', {});
    await locked(() => {
    generation++;
    user = profile = null;
    events = [];
    window.BB_PROFILE_SCOPE = '';
    window.BB_BUDDIES.load();
    window.BrushBuddies.refreshCollection();
    });
    showUser();
    message('Signed out. Account collections stay separate from this guest collection.');
  }));
  document.addEventListener('bb:reward', event => {
    const { profile_scope, ...reward } = event.detail;
    if (!profile_scope) return;
    if (!profile || profile_scope !== window.BB_PROFILE_SCOPE) {
      const key = 'brushAccount:' + profile_scope;
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (!cached?.profile) return;
      cached.events = [...new Map([...(cached.events || []), reward].map(item => [item.session_id, item])).values()];
      localStorage.setItem(key, JSON.stringify(cached));
      message('Expedition kept for the previous profile. Select that profile to sync it.');
      return;
    }
    events.push(reward);
    try { remember(); } catch { message('Device storage is unavailable. Keep this page open until syncing finishes.'); }
    sync();
  });
  window.addEventListener('online', sync);
  window.addEventListener('focus', sync);
  showUser();
  message('Guest mode · sign in to protect your collection.');
})();
