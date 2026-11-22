const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const achievements = require('../achievements.js');
const buddies = require('../buddies.js');

test('every non-starter has one distinct discovery and all treasure rules point to in-game stickers', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../adventure-data.js'), 'utf8'), context);
  const { shared, homes } = context.window.BB_ADVENTURE_DATA;
  const stickers = new Set([...shared, ...Object.values(homes)].flatMap(place => place.stickers.map(sticker => sticker.id)));
  assert.deepEqual(achievements.rules.map(rule => rule.id).sort(), buddies.catalog
    .filter(buddy => !buddies.starters.includes(buddy.id)).map(buddy => buddy.id).sort());
  const hooks = new Set();
  for (const rule of achievements.rules) {
    assert.ok(rule.hint);
    if (rule.host) assert.ok(buddies.get(rule.host));
    if (rule.action) {
      assert.equal(hooks.has(rule.action), false);
      hooks.add(rule.action);
    }
    if (rule.sticker) {
      assert.ok(stickers.has(rule.sticker), rule.sticker);
      assert.ok(rule.story.includes(buddies.nickname(rule.id)), rule.id);
    }
  }
});

test('milestones and collectibles require their own evidence', () => {
  for (const [brushes, count] of [[0, 0], [1, 1], [4, 1], [5, 2], [14, 2], [15, 3], [30, 4]]) {
    const result = achievements.earned({ brushes }, { 'home-cat-yarn': 1 });
    assert.equal(result.filter(rule => rule.metric === 'brushes').length, count);
    assert.ok(result.some(rule => rule.id === 'mouse'));
    assert.equal(result.some(rule => rule.id === 'duck'), false);
  }
});

test('trail encounters require the right host, distance, and special conditions', () => {
  const unlocked = id => id === 'butterfly';
  assert.equal(achievements.encounter('bunny', .24, unlocked, {}), undefined);
  assert.equal(achievements.encounter('bunny', .25, unlocked, {}).id, 'frog');
  assert.equal(achievements.encounter('cat', .60, unlocked, {}).id, 'raccoon');
  assert.equal(achievements.encounter('owl', .55, unlocked, { dark: false }), undefined);
  assert.equal(achievements.encounter('owl', .55, unlocked, { dark: true }).id, 'bat');
  assert.equal(achievements.encounter('bear', .80, unlocked, { rest: true }).id, 'snail');
});
