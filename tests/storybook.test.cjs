const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const buddies = require('../buddies.js');
const characters = require('../stories/characters.js');
const create = require('../stories/story-library.js');

const root = path.join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'adventure-data.js'), 'utf8'), context);
const data = context.window.BB_ADVENTURE_DATA;
const stories = create(buddies, data, characters);

test('every one of the 75 buddies has a distinct character bible and a first story', () => {
  assert.equal(buddies.catalog.length, 75);
  assert.equal(characters.all.length, 75);
  assert.equal(new Set(characters.all.map(p => p.id)).size, 75);
  for (const animal of buddies.catalog) {
    const profile = characters.get(animal.id);
    assert.ok(profile, animal.id + ' has a profile');
    for (const field of ['personality', 'background', 'environment', 'motivation', 'challenge'])
      assert.ok(profile[field].length >= 20, animal.id + ' has ' + field);
    const chapters = stories.chaptersFor(animal.id);
    assert.equal(chapters[0].unlockAfter, 1);
    assert.equal(chapters[0].kind, 'trail');
    assert.ok(chapters[0].title.includes(buddies.nickname(animal.id)));
    const words = chapters[0].text.split(/\s+/).length;
    assert.ok(words >= 550 && words <= 770, animal.id + ' read-aloud length ' + words);
  }
  assert.deepEqual(stories.chaptersFor('unknown'), []);
});

test('story trails, ordered stops and sticker goals match actual adventure routes', () => {
  for (const animal of buddies.catalog) {
    const trail = stories.destinationFor(animal.id, 0);
    const first = stories.chaptersFor(animal.id)[0];
    assert.equal(first.destination, trail.name);
    assert.equal(first.destinationId, trail.id);
    assert.deepEqual(first.stops, trail.stops.map(stop => stop.name));
    assert.ok(trail.stickers.some(st => st.name === first.goal));
    assert.equal(first.goal, trail.stickers[0].name);
    for (const stop of first.stops) assert.ok(first.text.includes(stop));
    assert.ok(first.text.includes(first.goal));
    assert.equal(stories.destinationFor(animal.id, 1).id, trail.id);
    const home = stories.destinationFor(animal.id, 3);
    assert.equal(home.id, 'home-' + animal.id);
    const special = data.homes[animal.id];
    if (special) assert.equal(home.name, special.name);
    else assert.equal(home.name, buddies.home(animal.id).name);
  }
});

test('chapters are earned from completed visits only, never by opening a page', () => {
  for (const animal of buddies.catalog) {
    const id = animal.id;
    assert.deepEqual(stories.unlocked(id, 0), []);
    assert.equal(stories.unlockedAt(id, 1).length, 1);
    assert.equal(stories.unlocked(id, 1).length, 1);
    assert.equal(stories.unlocked(id, 2).length, 1);
    assert.equal(stories.unlocked(id, 3).length, 1);
    const fourth = stories.unlockedAt(id, 4);
    assert.equal(fourth.length, ['cat', 'bunny', 'dog', 'fox', 'penguin'].includes(id) ? 1 : 0);
    assert.equal(stories.unlocked(id, 100).length, stories.chaptersFor(id).length);
    assert.equal(stories.rewardFor(id, 1, stories.destinationFor(id, 0)).name,
      stories.chaptersFor(id)[0].goal);
  }
});

test('five home manuscripts unlock after first home visit and promise their actual collectible', () => {
  for (const id of ['cat', 'bunny', 'dog', 'fox', 'penguin']) {
    const home = stories.destinationFor(id, 3);
    const chapter = stories.chaptersFor(id)[1];
    assert.equal(chapter.unlockAfter, 4);
    assert.deepEqual(chapter.stops, home.stops.map(stop => stop.name));
    assert.ok(home.stickers.some(st => st.name === chapter.goal));
    assert.equal(stories.rewardFor(id, 1, home), null);
    assert.equal(stories.rewardFor(id, 4, home).name, chapter.goal);
    const manuscript = fs.readFileSync(path.join(root, chapter.path), 'utf8');
    for (const stop of chapter.stops) assert.ok(manuscript.includes(stop), id + ': ' + stop);
    assert.ok(manuscript.includes(chapter.goal), id + ' goal');
  }
});

test('browser creates storybook when dependency scripts load in index order', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const order = ['buddies.js', 'adventure-data.js', 'stories/characters.js', 'stories/story-library.js', 'adventure.js'];
  const offsets = order.map(name => html.indexOf('src="' + name + '?'));
  assert.ok(offsets.every(x => x >= 0));
  assert.deepEqual(offsets, offsets.slice().sort((a, b) => a - b));
  for (const id of ['journal-tab-stories', 'journal-stories', 'story-reader-dialog', 'story-reader-done', 'treasure-story'])
    assert.ok(html.includes('id="' + id + '"'), id);
  const sandbox = { window: {} };
  for (const filename of order.slice(0, -1)) {
    vm.runInNewContext(fs.readFileSync(path.join(root, filename), 'utf8'), sandbox, { filename });
  }
  assert.equal(sandbox.window.BB_STORYBOOK.catalog.length, 75);
  assert.equal(sandbox.window.BB_STORYBOOK.chaptersFor('cat').length, 2);
});
