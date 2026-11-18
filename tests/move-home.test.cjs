const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'move-home.js'), 'utf8');
const storage = initial => {
  const map = new Map(Object.entries(initial));
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), map };
};
function run(href, initial = {}) {
  const url = new URL(href);
  const localStorage = storage(initial);
  const location = { hostname: url.hostname, hash: url.hash, pathname: url.pathname, search: url.search, replaced: null, replace(to) { this.replaced = to; } };
  const history = { replaced: null, replaceState(_s, _t, to) { this.replaced = to; } };
  vm.runInNewContext(source, { location, localStorage, history, JSON, encodeURIComponent, decodeURIComponent });
  return { location, history, localStorage };
}

test('the old GitHub Pages address forwards guest progress to the new home', () => {
  const { location } = run('https://higherkey.github.io/toothpaws/', {
    brushBuddiesCollectionV1: '{"visits":{"fox":2}}', brushBuddiesAdventureV1: '{"sessions":5}', otherAppKey: 'not ours'
  });
  assert.ok(location.replaced.startsWith('https://eight1fivedesign.com/toothpaws/#move='));
  const data = JSON.parse(decodeURIComponent(location.replaced.split('#move=')[1]));
  assert.deepEqual(Object.keys(data).sort(), ['brushBuddiesAdventureV1', 'brushBuddiesCollectionV1'], 'only Toothpaws keys travel');
});

test('with nothing saved, the old address forwards without a payload', () => {
  assert.equal(run('https://higherkey.github.io/brush-buddies/').location.replaced, 'https://eight1fivedesign.com/toothpaws/');
});

test('the new home imports progress once and never overwrites its own', () => {
  const payload = encodeURIComponent(JSON.stringify({ brushBuddiesCollectionV1: 'old', brushBuddiesAdventureV1: 'moved', evil: 'x' }));
  const { localStorage, history, location } = run('https://eight1fivedesign.com/toothpaws/#move=' + payload, { brushBuddiesCollectionV1: 'newer' });
  assert.equal(location.replaced, null, 'no redirect on the new home');
  assert.equal(localStorage.getItem('brushBuddiesCollectionV1'), 'newer');
  assert.equal(localStorage.getItem('brushBuddiesAdventureV1'), 'moved');
  assert.equal(localStorage.getItem('evil'), null);
  assert.equal(history.replaced, '/toothpaws/', 'the hand-off is removed from the address bar');
});

test('a damaged hand-off link is ignored and the app still starts', () => {
  const { localStorage } = run('https://eight1fivedesign.com/toothpaws/#move=%7Bnot-json');
  assert.equal(localStorage.map.size, 0);
});

test('local development is left alone', () => {
  const { location, history } = run('http://localhost:8123/index.html');
  assert.equal(location.replaced, null);
  assert.equal(history.replaced, null);
});
