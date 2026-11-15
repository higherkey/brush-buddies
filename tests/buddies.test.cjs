const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../buddies.js'), 'utf8');
const key = 'brushBuddiesCollectionV1';

function setup(initial, broken = false) {
  const data = new Map(initial === undefined ? [] : [[key, initial]]);
  let date = [2026, 10, 13, 23, 59];
  const storage = {
    getItem(k) { if (broken) throw Error('blocked'); return data.get(k) ?? null; },
    setItem(k, v) { if (broken) throw Error('quota'); data.set(k, v); }
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : date)); }
  }
  const context = vm.createContext({ localStorage: storage, Date: Clock, Math: Object.assign(Object.create(Math), { random: () => 0 }) });
  vm.runInContext(source, context);
  return { api: context.BB_BUDDIES, data, context, nextDay() { date = [2026, 10, 14, 0, 1]; } };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('profile scopes keep guest and sibling collections separate', () => {
  const {api,context}=setup();
  api.complete('guest','fox');
  context.BB_PROFILE_SCOPE='parent:child-one';
  assert.equal(api.load().visits.fox,undefined);
  api.complete('one','cat');
  context.BB_PROFILE_SCOPE='parent:child-two';
  assert.deepEqual(plain(api.load().visits),{});
  context.BB_PROFILE_SCOPE='parent:child-one';
  assert.equal(api.load().visits.cat,1);
  context.BB_PROFILE_SCOPE='';
  assert.equal(api.load().visits.fox,1);
  context.BB_PROFILE_SCOPE='parent:child-two';
  api.completeInScope('late-one','fox','parent:child-one');
  assert.equal(context.BB_PROFILE_SCOPE,'parent:child-two');
  assert.equal(api.load().visits.fox,undefined);
  context.BB_PROFILE_SCOPE='parent:child-one';
  assert.equal(api.load().visits.fox,1);
});

test('standalone Node and browser exports expose distinct animals and valid homes', () => {
  const api = require('../buddies.js');
  assert.ok(api.catalog.length >= 60);
  for (const field of ['id', 'emoji', 'name']) assert.equal(new Set(api.catalog.map(b => b[field])).size, api.catalog.length);
  const sounds = new Set(['meow', 'squeak', 'koala', 'woof', 'yip', 'growl', 'chirp', 'hoot', 'roar', 'ribbit', 'trumpet', 'magic']);
  const scenes = new Set(['meadow', 'beach', 'snow', 'forest', 'sky', 'night', 'jungle', 'desert']);
  for (const id of ['cat', 'bunny', 'koala', 'dog', 'fox', 'bear', 'panda', 'penguin', 'owl', 'lion', 'frog', 'tiger', 'elephant', 'unicorn']) assert.equal(api.get(id).id, id);
  const stickerIds = new Set();
  for (const buddy of api.catalog) {
    assert.deepEqual(Object.keys(buddy).sort(), ['emoji', 'habitat', 'id', 'name', 'sound']);
    assert.ok(sounds.has(buddy.sound));
    const home = api.home(buddy.id);
    assert.equal(home.id, 'home-' + buddy.id);
    assert.ok(home.name && home.emoji && scenes.has(home.scene));
    assert.equal(home.backdrop.length, 3);
    assert.equal(home.stops.length, 4);
    assert.equal(home.stickers.length, 3);
    home.stops.forEach(stop => assert.ok(stop.name && stop.icon));
    home.stickers.forEach(sticker => { assert.ok(sticker.name && sticker.emoji && !stickerIds.has(sticker.id)); stickerIds.add(sticker.id); });
    home.backdrop[0] = 'changed';
    assert.notEqual(api.home(buddy.id).backdrop[0], 'changed');
  }
  assert.equal(api.home('unknown'), undefined);
  assert.equal(api.get('__proto__'), undefined);
  const browser = setup();
  vm.runInContext('window = globalThis;', browser.context);
  vm.runInContext(source, browser.context);
  assert.ok(browser.context.window.BB_BUDDIES.catalog.length >= 60);
});

test('starters and homes unlock at exactly three unique sessions, persisted across reloads', () => {
  const { api, data } = setup();
  assert.deepEqual(plain(api.available()), ['cat', 'bunny']);
  for (const id of ['cat', 'fox']) {
    assert.equal(api.homeUnlocked(id), false);
    for (let i = 1; i <= 3; i++) {
      const result = api.complete(id + i, id);
      assert.deepEqual(plain(result), { buddy: id, visits: i, unlocked: id === 'cat' || i === 3, homeUnlocked: i === 3 });
      assert.equal(api.complete(id + i, id).visits, i);
    }
  }
  assert.equal(api.complete('fox1', 'dog').visits, 0);
  assert.equal(api.complete('', 'fox'), null);
  assert.equal(api.complete('valid', 'unknown'), null);
  assert.equal(api.complete(5, 'fox'), null);
  const reloaded = setup(data.get(key)).api;
  assert.equal(reloaded.complete('fox3', 'fox').visits, 3);
  assert.equal(reloaded.unlocked('fox'), true);
  assert.equal(reloaded.unlocked('unknown'), false);
});

test('daily uses local calendar date, stays stable after unlock and reload, prefers locked buddies', () => {
  const fixture = setup();
  const id = fixture.api.daily();
  assert.equal(id, 'koala');
  assert.equal(fixture.api.load().daily.date, '2026-11-13');
  for (let i = 0; i < 3; i++) fixture.api.complete('daily' + i, id);
  assert.equal(fixture.api.daily(), id);
  assert.equal(setup(fixture.data.get(key)).api.daily(), id);
  fixture.nextDay();
  assert.equal(fixture.api.daily(), 'dog');
  const visits = Object.fromEntries(fixture.api.catalog.map(b => [b.id, 3]));
  fixture.api.save({ visits });
  assert.equal(fixture.api.daily(), 'dog');
});

test('malformed storage is sanitized with allowlisted safe counts and durable session history', () => {
  for (const raw of ['{', 'null', '42', '[]', '"bad"']) {
    assert.deepEqual(plain(setup(raw).api.load()), { visits: {}, daily: { date: '', buddy: '' }, completed: [] });
  }
  const bad = { visits: { cat: 3, bunny: -1, fox: 1.5, dog: '3', koala: Number.MAX_SAFE_INTEGER + 1, unknown: 999 },
    daily: { date: '2026-02-30', buddy: 'cat' }, completed: [null, 4, '', ' ', 'x'.repeat(201), 'one', 'one'] };
  const api = setup(JSON.stringify(bad)).api;
  assert.deepEqual(plain(api.load()), { visits: { cat: 3 }, daily: { date: '', buddy: '' }, completed: ['one'] });
  assert.equal(api.save({ daily: { date: '2026-11-13', buddy: 'unknown' } }).daily.buddy, '');
  api.save({ visits: { fox: Number.MAX_SAFE_INTEGER }, completed: Array.from({ length: 510 }, (_, i) => 's' + i) });
  assert.equal(api.load().completed.length, 510);
  assert.equal(api.load().completed[0], 's0');
  assert.equal(api.complete('new', 'fox').visits, Number.MAX_SAFE_INTEGER);
  assert.equal(api.load().completed.length, 511);
  assert.equal(api.load().completed.at(-1), 'new');
  assert.equal(api.complete('s0', 'dog').visits, 0);
});

test('daily rollover cannot overwrite completions from another tab', () => {
  const fixture = setup();
  fixture.api.daily();
  fixture.data.set(key, JSON.stringify({ visits: { fox: 3 }, completed: ['other-tab'] }));
  fixture.nextDay();
  fixture.api.daily();
  assert.equal(JSON.parse(fixture.data.get(key)).visits.fox, 3);
  assert.ok(fixture.api.unlocked('fox'));
});

test('unavailable storage retains in-memory progress without crashes', () => {
  const { api } = setup(undefined, true);
  assert.equal(api.daily(), 'koala');
  for (let i = 0; i < 3; i++) api.complete('s' + i, 'koala');
  assert.equal(api.load().visits.koala, 3);
  assert.equal(api.complete('s2', 'koala').visits, 3);
  assert.equal(api.homeUnlocked('koala'), true);
});
