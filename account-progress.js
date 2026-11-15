/* Pure account snapshot validation and session replay. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BB_ACCOUNT_PROGRESS = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MAX_EVENTS = 20000;
  const unsafe = new Set(['__proto__', 'prototype', 'constructor']);

  function fail() { throw new TypeError('Malformed account progress'); }

  function record(value, fields, optional = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) fail();
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || unsafe.has(key) || !('value' in descriptor)) fail();
      if (fields && !fields.includes(key) && !optional.includes(key)) fail();
    }
    if (fields && fields.some(key => !Object.hasOwn(value, key))) fail();
  }

  function id(value, limit, pattern) {
    if (typeof value !== 'string' || !value.trim() || value.length > limit || unsafe.has(value)) fail();
    if (pattern && !pattern.test(value)) fail();
    return value;
  }

  function animal(value, catalog) {
    id(value, 64, /^[a-z]+(?:-[a-z]+)*$/);
    if (catalog && !catalog.has(value)) fail();
    return value;
  }

  function sticker(value) { return id(value, 100, /^[a-z0-9]+(?:-[a-z0-9]+)*$/); }
  function session(value) { return id(value, 200); }
  function count(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail();
    return value;
  }

  function validateSnapshot(data, catalogIds) {
    let catalog;
    if (catalogIds !== undefined) {
      if (!Array.isArray(catalogIds) && !(catalogIds instanceof Set)) fail();
      catalog = new Set(catalogIds);
      for (const value of catalog) animal(value);
    }
    record(data, ['collection', 'journal']);
    record(data.collection, ['visits', 'completed', 'credits'], ['daily']);
    record(data.journal, ['stickers', 'sessions', 'last']);
    record(data.collection.visits);
    record(data.collection.credits);
    record(data.journal.stickers);
    if (!Array.isArray(data.collection.completed)) fail();
    const visits = {};
    for (const [key, value] of Object.entries(data.collection.visits)) visits[animal(key, catalog)] = count(value);
    const completed = [];
    for (const value of data.collection.completed) completed.push(session(value));
    const credits = {};
    for (const [key, value] of Object.entries(data.collection.credits)) credits[session(key)] = animal(value, catalog);
    const stickers = {};
    for (const [key, value] of Object.entries(data.journal.stickers)) stickers[sticker(key)] = count(value);
    if (typeof data.journal.last !== 'string' || data.journal.last.length > 64) fail();
    if (data.journal.last) id(data.journal.last, 64, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    // Daily selection belongs to the current profile and is deliberately not synced.
    return {
      collection: { visits, completed: [...new Set(completed)], credits },
      journal: { stickers, sessions: count(data.journal.sessions), last: data.journal.last }
    };
  }

  function materialize(baseline, events) {
    const result = validateSnapshot(baseline);
    if (!Array.isArray(events) || events.length > MAX_EVENTS) fail();
    const seen = new Set([...result.collection.completed, ...Object.keys(result.collection.credits)]);
    for (const event of events) {
      record(event, ['session_id', 'buddy_id', 'sticker_id']);
      const sessionId = session(event.session_id);
      const buddyId = animal(event.buddy_id);
      const stickerId = sticker(event.sticker_id);
      if (seen.has(sessionId)) continue;
      seen.add(sessionId);
      result.collection.visits[buddyId] = count((result.collection.visits[buddyId] || 0) + 1);
      result.collection.completed.push(sessionId);
      result.collection.credits[sessionId] = buddyId;
      result.journal.stickers[stickerId] = count((result.journal.stickers[stickerId] || 0) + 1);
      result.journal.sessions = count(result.journal.sessions + 1);
    }
    return result;
  }

  return { validateSnapshot, materialize };
}));
