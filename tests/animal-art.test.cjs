const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const animals = require('../buddies.js').catalog;
test('every animal has safe, locally bundled and offline-cached artwork with provenance', () => {
  const root = path.resolve(__dirname,'..');
  const source = JSON.parse(fs.readFileSync(path.join(root,'animals/source.json'),'utf8'));
  const worker = fs.readFileSync(path.join(root,'sw.js'),'utf8');
  assert.equal(Object.keys(source.files).length,animals.length);
  assert.equal(source.license,'CC-BY-4.0');
  for(const animal of animals){
    const svg=fs.readFileSync(path.join(root,'animals',animal.id+'.svg'),'utf8');
    assert.match(svg,/<svg\b/);
    assert.doesNotMatch(svg,/<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:)/i);
    assert.equal(crypto.createHash('sha256').update(svg).digest('hex'),source.files[animal.id].sha256);
    assert.ok(worker.includes('"./animals/'+animal.id+'.svg"'),animal.id+' is cached offline');
  }
  assert.ok(fs.existsSync(path.join(root,'animals/LICENSE-GRAPHICS.txt')));
});
