const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateSnapshot, materialize } = require('../account-progress.js');

const snapshot = () => ({
  collection: { visits: {}, completed: [], credits: {} },
  journal: { stickers: {}, sessions: 0, last: '' }
});
const event = (session_id = 'device-a:1', buddy_id = 'cat', sticker_id = 'cat-star') => ({ session_id, buddy_id, sticker_id });

test('CommonJS and browser expose only the pure API', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(require.resolve('../account-progress.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context.window.BB_ACCOUNT_PROGRESS).sort(), ['materialize', 'validateSnapshot']);
  assert.deepEqual(Object.keys(require('../account-progress.js')).sort(), ['materialize', 'validateSnapshot']);
});

test('validation returns independent data, retains legacy totals and excludes daily', () => {
  const input = snapshot();
  input.collection.visits.cat = 8;
  input.collection.daily = { date: '2026-11-13', buddy: 'fox' };
  input.journal = { stickers: { 'rare-star': 3 }, sessions: 8, last: 'home-cat' };
  const before = structuredClone(input);
  const output = validateSnapshot(input, ['cat', 'fox']);
  assert.equal(output.collection.visits.cat, 8);
  assert.deepEqual(output.journal, input.journal);
  assert.equal(Object.hasOwn(output.collection, 'daily'), false);
  output.collection.visits.cat++;
  output.journal.stickers['rare-star']++;
  assert.deepEqual(input, before);
  assert.deepEqual(validateSnapshot(snapshot(), new Set(['cat'])), snapshot());
});

test('duplicates count exactly once and replay never mutates inputs', () => {
  const baseline = snapshot();
  const events = [event(), event(), event('device-a:2')];
  const before = structuredClone({ baseline, events });
  const result = materialize(baseline, events);
  assert.deepEqual(result, {
    collection: { visits: { cat: 2 }, completed: ['device-a:1', 'device-a:2'], credits: { 'device-a:1': 'cat', 'device-a:2': 'cat' } },
    journal: { stickers: { 'cat-star': 2 }, sessions: 2, last: '' }
  });
  assert.deepEqual({ baseline, events }, before);
  assert.deepEqual(materialize(result, events), result);
});

test('different device event unions converge, including incremental replay', () => {
  const a = [event('a:1'), event('a:2', 'fox', 'fox-leaf')];
  const b = [event('a:1'), event('b:1')];
  const forward = materialize(snapshot(), [...a, ...b]);
  const reverse = materialize(snapshot(), [...b, ...a]);
  assert.deepEqual(forward.collection.visits, { cat: 2, fox: 1 });
  assert.deepEqual(reverse.collection.visits, forward.collection.visits);
  assert.deepEqual(reverse.journal, forward.journal);
  assert.deepEqual(new Set(reverse.collection.completed), new Set(forward.collection.completed));
  assert.deepEqual(reverse.collection.credits, forward.collection.credits);
  assert.deepEqual(materialize(materialize(snapshot(), a), b), forward);
});

test('either baseline completed or credits prevents all double counting', () => {
  const baseline = snapshot();
  baseline.collection = { visits: { cat: 7 }, completed: ['old-completed'], credits: { 'old-credit': 'cat' } };
  baseline.journal = { stickers: { 'cat-star': 7 }, sessions: 7, last: 'home-cat' };
  const result = materialize(baseline, [event('old-completed'), event('old-credit'), event('new')]);
  assert.equal(result.collection.visits.cat, 8);
  assert.equal(result.journal.stickers['cat-star'], 8);
  assert.equal(result.journal.sessions, 8);
  assert.equal(result.journal.last, 'home-cat');
  assert.deepEqual(result.collection.completed, ['old-completed', 'new']);
});

test('unknown catalog animals, fields and malformed snapshots throw', () => {
  const unknown = snapshot();
  unknown.collection.visits.dragon = 1;
  assert.throws(() => validateSnapshot(unknown, ['cat']), TypeError);
  unknown.collection.visits = {};
  unknown.collection.credits.session = 'dragon';
  assert.throws(() => validateSnapshot(unknown, ['cat']), TypeError);
  for (const value of [null, [], {}, { ...snapshot(), extra: true }]) assert.throws(() => validateSnapshot(value), TypeError);
  const changes = [
    s => { s.collection.visits = []; },
    s => { s.collection.completed = 'session'; },
    s => { s.collection.completed = [null]; },
    s => { s.collection.credits = null; },
    s => { s.journal.last = 1; },
    s => { s.journal.last = 'x'.repeat(65); },
    s => { s.journal.stickers = []; },
    s => { s.collection.visits.Cat = 1; },
    s => { s.collection.visits['x'.repeat(65)] = 1; },
    s => { s.journal.stickers['x'.repeat(101)] = 1; },
    s => { s.collection.completed = ['x'.repeat(201)]; }
  ];
  for (const change of changes) {
    const input = snapshot();
    change(input);
    assert.throws(() => validateSnapshot(input), TypeError);
  }
  for (const n of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null]) {
    for (const field of ['visits', 'stickers', 'sessions']) {
      const input = snapshot();
      if (field === 'visits') input.collection.visits.cat = n;
      else if (field === 'stickers') input.journal.stickers.star = n;
      else input.journal.sessions = n;
      assert.throws(() => validateSnapshot(input), TypeError);
    }
  }
});

test('malformed events throw even after valid events or when already credited', () => {
  const baseline = materialize(snapshot(), [event()]);
  const before = structuredClone(baseline);
  for (const invalid of [null, [], {}, { ...event(), extra: 1 }, event('', 'cat'), event('x', 'Cat'), event('x', 'cat', ''), event('x'.repeat(201)), event('x', 'x'.repeat(65)), event('x', 'cat', 'x'.repeat(101)), event('device-a:1', 'cat', null)]) {
    assert.throws(() => materialize(baseline, [event('valid'), invalid]), TypeError);
  }
  for (const invalid of [null, {}, new Array(1), Array(20001).fill(event())]) assert.throws(() => materialize(baseline, invalid), TypeError);
  assert.deepEqual(baseline, before);
});

test('limits accept boundary IDs and 20000 events; counter overflow throws', () => {
  const events = Array.from({ length: 20000 }, (_, i) => event(String(i)));
  assert.equal(materialize(snapshot(), events).journal.sessions, 20000);
  const result = materialize(snapshot(), [event('s'.repeat(200), 'a'.repeat(64), 's'.repeat(100))]);
  assert.equal(result.journal.sessions, 1);
  for (const field of ['visits', 'stickers', 'sessions']) {
    const baseline = snapshot();
    if (field === 'visits') baseline.collection.visits.cat = Number.MAX_SAFE_INTEGER;
    else if (field === 'stickers') baseline.journal.stickers['cat-star'] = Number.MAX_SAFE_INTEGER;
    else baseline.journal.sessions = Number.MAX_SAFE_INTEGER;
    assert.throws(() => materialize(baseline, [event()]), TypeError);
  }
});

test('prototype pollution, inherited payloads and accessors are rejected', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    for (const path of ['visits', 'credits', 'stickers']) {
      const input = snapshot();
      const parent = path === 'stickers' ? input.journal : input.collection;
      parent[path] = JSON.parse(`{"${key}":${path === 'credits' ? '"cat"' : '1'}}`);
      assert.throws(() => validateSnapshot(input), TypeError);
    }
    assert.throws(() => materialize(snapshot(), [event(key)]), TypeError);
    assert.throws(() => materialize(snapshot(), [event('s', key, 'star')]), TypeError);
    assert.throws(() => materialize(snapshot(), [event('s', 'cat', key)]), TypeError);
  }
  assert.throws(() => validateSnapshot(Object.create(snapshot())), TypeError);
  const input = snapshot();
  Object.defineProperty(input.collection.visits, 'cat', { enumerable: true, get() { assert.fail('getter ran'); } });
  assert.throws(() => validateSnapshot(input), TypeError);
  assert.equal(Object.prototype.polluted, undefined);
  assert.deepEqual(materialize(snapshot(), [event('toString')]).collection.credits, { toString: 'cat' });
});
