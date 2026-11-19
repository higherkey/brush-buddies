const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Node {
  constructor(tag) { this.tag = tag; this.attributes = {}; this.children = []; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  appendChild(c) { this.children.push(c); return c; }
  insertBefore(c) { this.children.unshift(c); return c; }
  replaceChildren(...c) { this.children = c; }
}
function load(file) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../' + file), 'utf8'), { window, document: { createElementNS: (_ns, tag) => new Node(tag) } });
  return window;
}
const { BB_SECTIONS } = load('adventure-sections.js');
const { BB_AVATAR } = load('adventure-avatar.js');
const storage = { getItem: () => null, setItem() {} };
const buddies = require('../buddies.js');
const collection = typeof buddies.home === 'function' ? buddies : buddies;
const habitats = [...new Map(collection.catalog.map(a => [a.habitat, a])).values()];

test('every habitat walk has one section per stage, built from its stops', () => {
  for (const animal of habitats) {
    const home = collection.home(animal.id);
    for (const count of [2, 4, 6]) {
      const track = BB_SECTIONS.build(new Node('g'), { stops: home.stops, count, habitat: animal.habitat, seed: 12345 });
      assert.equal(track.goals.length, count, animal.habitat + ' has one goal per stage');
      assert.ok(track.end > track.start && track.width >= track.end, 'the walk fits in the world');
      for (let i = 1; i < track.forms.length; i++) {
        assert.notEqual(track.forms[i], track.forms[i - 1], `${animal.habitat}: sections ${i - 1} and ${i} use different paths`);
      }
      for (let x = track.start; x <= track.end; x += 25) {
        const y = track.yAt(x);
        assert.ok(y >= 265 && y <= 410, `${animal.habitat}: path stays in its band at x=${x} (y=${y})`);
      }
    }
  }
});

test('stop names choose matching set pieces', () => {
  const kinds = { 'Sheltered Nook': 'nook', 'Watering Hole': 'water', 'Sheltered Ledge': 'ledge', 'Leafy Branch': 'tree', 'Reed Bed': 'marsh', 'Flower Bed': 'flowers', 'Rainbow Bridge': 'bridge', 'Moonlit Flight': 'flight', 'Seaweed Garden': 'sea', 'Sandy Burrow': 'beach', 'Cave Entrance': 'rock', 'Grassland Trail': 'trail' };
  for (const [name, kind] of Object.entries(kinds)) assert.equal(BB_SECTIONS.kindOf(name), kind, name);
});

test('every animal in the catalog has a whole body', () => {
  for (const animal of collection.catalog) {
    assert.ok(BB_AVATAR.ids.includes(animal.id), animal.id + ' has a body plan');
    const group = new Node('g');
    const head = new Node('image');
    const rig = BB_AVATAR.build(group, animal.id, head);
    assert.doesNotThrow(() => { rig.pose(0, true); rig.pose(10, true); rig.pose(10, false); }, animal.id + ' can move and rest');
    assert.ok(group.children.length > 0, animal.id + ' draws a body');
  }
});
