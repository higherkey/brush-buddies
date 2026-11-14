const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Detector } = require('../camera-motion.js');

function crop(step = 0, amplitude = 0, exposure = 0) {
  const pixels = new Uint8Array(32 * 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) {
    pixels[y * 32 + x] = 90 + ((x * 7 + y * 11) % 55) + exposure
      + (x >= 12 && x < 16 && y >= 12 && y < 16 ? (step % 2 ? amplitude : -amplitude) : 0);
  }
  return pixels;
}
function run(detector, amplitude, options = {}, from = 0, to = 1400) {
  const results = [];
  for (let now = from; now <= to; now += 100) results.push(detector.update(crop(now / 100, amplitude), 32, 24, now, options));
  return results;
}

test('missing comparison frames restart sustained movement evidence', () => {
  const detector = new Detector();
  const times = [0, 100, 200, 650, 750];
  const results = times.map((now, i) => detector.update(crop(i, 8), 32, 24, now, {}));
  assert.equal(results[3].state, 'uncertain');
  assert.equal(results[4].active, false);
});

test('still crops and uniform exposure changes stay idle for either brush type', () => {
  // Arrange / Act
  for (const brushType of ['manual', 'electric']) {
    const detector = new Detector();
    const results = [];
    for (let now = 0; now < 2000; now += 100) results.push(detector.update(crop(0, 0, now % 200 ? 30 : 0), 32, 24, now, { brushType }));
    // Assert
    assert.ok(results.every(result => !result.active));
    assert.equal(results.at(-1).state, 'idle');
  }
});

test('sustained localized motion activates only after 300ms of evidence', () => {
  const detector = new Detector();
  const results = run(detector, 8);
  assert.ok(results.slice(0, 4).every(result => !result.active));
  assert.ok(results.slice(4).some(result => result.active && result.state === 'brushing'));
  assert.ok(results.every(result => result.score >= 0 && result.score <= 1));
});

test('invalid frames and long gaps erase all previous motion evidence', () => {
  const detector = new Detector();
  assert.equal(run(detector, 8).at(-1).active, true);
  assert.equal(detector.update(crop(), 32, 24, 1500, { valid: false }).state, 'uncertain');
  assert.equal(detector.update(crop(16, 8), 32, 24, 1600).active, false);
  assert.equal(run(detector, 8, {}, 1700, 2300).at(-1).active, true);
  assert.equal(detector.update(crop(30, 8), 32, 24, 3000).active, false);
  assert.equal(detector.update(crop(), 32, 24, 3000).active, false);
});

test('sensitivity has ordered thresholds for tiny local motion', () => {
  const results = ['high', 'medium', 'low'].map(sensitivity => run(new Detector(), 2, { sensitivity }).at(-1));
  assert.equal(results[0].active, true);
  assert.equal(results[2].active, false);
  assert.ok(Number(results[0].active) >= Number(results[1].active));
});

test('calibration observes quiet and brushing phases without awarding activity', () => {
  const detector = new Detector();
  detector.calibrate(0);
  const results = [];
  for (let now = 0; now <= 5200; now += 100) results.push(detector.update(crop(now / 100, now > 2000 ? 8 : 0), 32, 24, now));
  assert.ok(results.some(result => result.calibration === 'quiet'));
  assert.ok(results.some(result => result.calibration === 'brushing'));
  assert.ok(results.some(result => result.calibration === 'complete'));
  assert.ok(results.filter(result => result.state === 'calibrating').every(result => !result.active));
  assert.equal(run(detector, 8, {}, 5300, 6200).at(-1).active, true);
});

test('calibration rejects absent brushing contrast and cannot advance on missing frames', () => {
  const detector = new Detector();
  detector.calibrate(0);
  assert.equal(detector.update(crop(), 32, 24, 6000).calibration, 'quiet');
  assert.equal(detector.update(crop(), 32, 24, 12000, { valid: false }).calibration, 'quiet');
  const results = run(detector, 0, {}, 12100, 17300);
  assert.equal(results.at(-1).calibration, 'failed');
  assert.ok(results.every(result => !result.active));
});

test('uniform exposure gain is suppressed without suppressing local motion', () => {
  const detector = new Detector();
  const results = [];
  for (let now = 0; now <= 1600; now += 100) {
    const pixels = crop();
    if (now % 200) for (let index = 0; index < pixels.length; index++) pixels[index] = Math.round(pixels[index] * 1.3);
    results.push(detector.update(pixels, 32, 24, now, { sensitivity: 'high' }));
  }
  assert.ok(results.every(result => !result.active));
  assert.ok(results.at(-1).score < 0.003);
});

test('malformed inputs reset evidence and reset clears calibration', () => {
  const detector = new Detector();
  for (const [pixels, width, height, now] of [[null, 32, 24, 0], [crop(), 0, 24, 1], [crop(), 32.5, 24, 2], [crop(), 32, 24, NaN], [new Uint8Array(1), 32, 24, 3]]) {
    assert.equal(detector.update(pixels, width, height, now).state, 'uncertain');
  }
  detector.calibrate(0);
  detector.reset();
  assert.equal(detector.update(crop(), 32, 24, 10).calibration, 'none');
});

test('a single short local movement cannot satisfy sustained motion', () => {
  const detector = new Detector();
  const results = [];
  for (let now = 0; now <= 1500; now += 100) results.push(detector.update(crop(1, now === 300 ? 12 : 0), 32, 24, now));
  assert.ok(results.every(result => !result.active));
});

test('calibration rejects brushing indistinguishable from quiet noise', () => {
  const detector = new Detector();
  detector.calibrate(0);
  const results = run(detector, 5, {}, 0, 5100);
  assert.equal(results.at(-1).calibration, 'failed');
  assert.ok(results.every(result => !result.active));
});

test('browser UMD build exposes BrushMotion without dependencies', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../camera-motion.js'), 'utf8'), context);
  assert.equal(vm.runInContext('typeof BrushMotion.Detector', context), 'function');
});
