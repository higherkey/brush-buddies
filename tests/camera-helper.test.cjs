const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const rafs = new Map();
  const workers = [];
  const bitmaps = [];
  const results = [];
  const errors = [];
  function timer(callback, delay, repeat = false) {
    const id = nextId++;
    timers.set(id, { callback, at: now + delay, delay, repeat });
    return id;
  }
  class Worker {
    constructor(url) { this.url = url; this.messages = []; this.terminations = 0; workers.push(this); }
    postMessage(message, transfer) { this.messages.push({ ...message, transfer }); }
    terminate() { this.terminations++; }
    emit(data) { this.onmessage?.({ data }); }
    error() { this.onerror?.({ message: 'worker failure' }); }
  }
  const context = vm.createContext({
    window: {}, Worker, performance: { now: () => now },
    setTimeout: (callback, delay) => timer(callback, delay), clearTimeout: id => timers.delete(id),
    setInterval: (callback, delay) => timer(callback, delay, true), clearInterval: id => timers.delete(id),
    requestAnimationFrame: callback => { const id = nextId++; rafs.set(id, callback); return id; },
    cancelAnimationFrame: id => rafs.delete(id),
    createImageBitmap: () => new Promise((resolve, reject) => bitmaps.push({ resolve, reject })),
  });
  vm.runInContext(fs.readFileSync(require.resolve('../camera-helper.js'), 'utf8'), context);
  const camera = new context.window.BrushCamera(result => results.push(result), error => errors.push(error));
  const video = { readyState: 2, currentTime: 0 };
  async function flush() { await Promise.resolve(); await Promise.resolve(); }
  async function start() {
    const pending = camera.start(video);
    workers.at(-1).emit({ type: 'ready' });
    await pending;
    return workers.at(-1);
  }
  async function frame(time) {
    now = time;
    video.currentTime += 0.1;
    const queued = Array.from(rafs.values());
    rafs.clear();
    queued.forEach(callback => callback(now));
    await flush();
  }
  async function resolveBitmap(index = bitmaps.length - 1) {
    const bitmap = { closes: 0, close() { this.closes++; } };
    bitmaps[index].resolve(bitmap);
    await flush();
    return bitmap;
  }
  async function advance(time) {
    while (true) {
      const due = Array.from(timers.entries()).filter(([, value]) => value.at <= time).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      const [id, value] = due;
      now = value.at;
      if (value.repeat) value.at += value.delay;
      else timers.delete(id);
      value.callback();
      await flush();
    }
    now = time;
    await flush();
  }
  return { camera, workers, timers, rafs, bitmaps, results, errors, video, start, frame, resolveBitmap, advance, flush };
}

test('ready clears startup timeout and stop cleans transport resources', async () => {
  const h = harness();
  const worker = await h.start();

  assert.equal(worker.messages[0].type, 'init');
  assert.equal(Array.from(h.timers.values()).some(timer => timer.delay === 30000), false);
  assert.equal(h.rafs.size, 1);
  h.camera.stop();
  assert.equal(worker.terminations, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.rafs.size, 0);
});

for (const failure of ['message', 'event', 'timeout']) {
  test(`startup ${failure} rejects and cleans worker and timers`, async () => {
    const h = harness();
    const pending = h.camera.start(h.video);
    const rejected = assert.rejects(pending, /helper|load|long/i);
    const worker = h.workers[0];

    if (failure === 'message') worker.emit({ type: 'error', message: 'helper failed to load' });
    else if (failure === 'event') worker.error();
    else await h.advance(30000);
    await rejected;

    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
    assert.equal(h.errors.length, 0);
  });
}

test('stop rejects pending startup and ignores stale ready messages', async () => {
  const h = harness();
  const pending = h.camera.start(h.video);
  const rejected = assert.rejects(pending, /canceled/i);
  const worker = h.workers[0];

  h.camera.stop();
  worker.emit({ type: 'ready' });
  await rejected;

  assert.equal(worker.terminations, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.rafs.size, 0);
});

test('stopping during bitmap creation closes stale bitmap without transport', async () => {
  const h = harness();
  const worker = await h.start();
  await h.frame(100);

  h.camera.stop();
  const bitmap = await h.resolveBitmap();

  assert.equal(bitmap.closes, 1);
  assert.equal(worker.messages.filter(message => message.type === 'frame').length, 0);
  assert.equal(h.errors.length, 0);
});

test('only one bitmap or worker frame is in flight at once', async () => {
  const h = harness();
  const worker = await h.start();
  await h.frame(100);
  await h.frame(200);
  assert.equal(h.bitmaps.length, 1);
  const bitmap = await h.resolveBitmap();
  await h.frame(300);

  const frames = worker.messages.filter(message => message.type === 'frame');
  assert.equal(frames.length, 1);
  assert.equal(frames[0].transfer[0], bitmap);
  worker.emit({ type: 'result', now: 100, active: true });
  await h.frame(400);
  assert.equal(h.bitmaps.length, 2);
  h.camera.stop();
  await h.resolveBitmap();
});

for (const operation of ['configure', 'calibrate', 'reset']) {
  test(`${operation} discards obsolete pending worker results`, async () => {
    const h = harness();
    const worker = await h.start();
    await h.frame(100);
    await h.resolveBitmap();

    h.camera[operation]({ sensitivity: 'high' });
    worker.emit({ type: 'result', now: 100, active: true });

    assert.equal(h.results.length, 0);
    await h.frame(200);
    await h.resolveBitmap();
    worker.emit({ type: 'result', now: 200, active: false });
    assert.equal(h.results.length, 1);
    assert.equal(worker.messages.at(-2).type, operation === 'calibrate' ? 'calibrate' : 'reset');
    h.camera.stop();
  });
}

test('results older than 750ms cannot report brushing', async () => {
  const h = harness();
  const worker = await h.start();
  await h.frame(100);
  await h.resolveBitmap();

  await h.advance(851);
  worker.emit({ type: 'result', now: 100, active: true, state: 'brushing' });

  assert.equal(h.results.at(-1).active, false);
  assert.equal(h.results.at(-1).state, 'uncertain');
  assert.equal(h.results.at(-1).reason, 'stale-frame');
  assert.equal(h.results.at(-1).latency, 751);
  h.camera.stop();
});

for (const failure of ['bitmap', 'message', 'event', 'timeout']) {
  test(`frame ${failure} failure stops once and ignores stale worker errors`, async () => {
    const h = harness();
    const worker = await h.start();
    await h.frame(100);

    if (failure === 'bitmap') { h.bitmaps[0].reject(new Error('bitmap failure')); await h.flush(); }
    else {
      await h.resolveBitmap();
      if (failure === 'message') worker.emit({ type: 'error', message: 'frame failure' });
      else if (failure === 'event') worker.error();
      else await h.advance(8100);
    }
    worker.error();
    worker.emit({ type: 'error', message: 'late frame error' });

    assert.equal(h.errors.length, 1);
    assert.equal(worker.terminations, 1);
    assert.equal(h.timers.size, 0);
    assert.equal(h.rafs.size, 0);
  });
}
