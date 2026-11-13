/* Run with PLAYWRIGHT_MODULE pointing to an installed playwright package. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

test('real MediaPipe worker, camera UI, timer integration, offline assets and mobile layout', { timeout: 180000 }, async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const filename = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(filename, (error, content) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
      res.end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  let checks = 0;
  const check = (condition, label) => { assert.ok(condition, label); checks++; };
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const errors = [];
    const external = [];
    context.on('request', request => { if (!request.url().startsWith(origin) && !request.url().startsWith('blob:')) external.push(request.url()); });
    await context.addInitScript(() => {
      window.__cameraMode = 'still';
      window.__tracks = [];
      navigator.mediaDevices.getUserMedia = async () => {
        if (window.__holdPermission) await new Promise(resolve => { window.__releasePermission = resolve; });
        const image = new Image(); image.src = '/tests/fixtures/portrait.jpg';
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d');
        let frame = 0;
        const draw = () => {
          ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 640, 480);
          if (window.__cameraMode !== 'blank') ctx.drawImage(image, 140, 0, 360, 480);
          if (window.__cameraMode === 'motion') {
            ctx.fillStyle = frame % 2 ? '#fff' : '#111'; ctx.fillRect(300, 300, 35, 20);
          }
          frame++;
        };
        draw();
        const id = setInterval(draw, 100);
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(id); stop(); };
        window.__tracks.push(track);
        return stream;
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    check(await page.locator('#motion-auto-pause').isChecked() === false, 'Assist defaults to normal timer');
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true', null, { timeout: 45000 });
    await page.waitForFunction(() => document.querySelector('#motion-diagnostics').textContent.includes('Face tracked'), null, { timeout: 15000 });
    check(true, 'real bundled MediaPipe detects the public portrait in the worker');
    if (process.env.CAMERA_SCREENSHOT) await page.screenshot({ path: process.env.CAMERA_SCREENSHOT, fullPage: true });
    await page.locator('#start-button').click();
    await page.waitForTimeout(3000);
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'running', 'Assist keeps timer running on still face');
    await page.evaluate(() => { window.__cameraMode = 'blank'; });
    await page.waitForFunction(() => document.querySelector('#motion-status').textContent.includes('Bring your face'));
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'running', 'Assist continues during face loss');
    await page.locator('#motion-calibrate').click();
    check(await page.locator('#motion-status').textContent().then(t => t.includes('Hold still')), 'calibration gives quiet phase instruction');
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#motion-target').selectOption('manual');
    check(await page.locator('#manual-target-controls').isVisible(), 'manual controls visible');
    await page.locator('#motion-target-size').fill('80');
    await page.locator('#motion-target-size').dispatchEvent('change');
    await page.locator('#motion-auto-pause').check();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.BrushBuddies.snapshot().phase === 'motion-paused', null, { timeout: 8000 });
    check(true, 'strict mode pauses on no motion');
    await page.evaluate(() => { window.__cameraMode = 'motion'; });
    await page.waitForFunction(() => window.BrushBuddies.snapshot().phase === 'running', null, { timeout: 8000 });
    check(true, 'localized motion resumes armed timer through real worker');
    await page.locator('#motion-calibrate').click();
    await page.waitForTimeout(700);
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'motion-paused', 'strict calibration cannot resume from queued motion');
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#motion-sensitivity').selectOption('high');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.BrushBuddies.snapshot().phase === 'running', null, { timeout: 8000 });
    await page.locator('#pause-button').click();
    await page.waitForTimeout(600);
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'paused', 'user pause is not overridden by motion');
    await page.locator('.zone').nth(1).click();
    await page.waitForTimeout(800);
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase !== 'running', 'stage selection cannot override user pause');
    check(await page.locator('#pause-button-label').textContent() === 'Start brushing', 'unarmed strict target offers an explicit start');
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#motion-brush-type').selectOption('electric');
    check(await page.locator('#motion-auto-pause').isDisabled(), 'electric brush cannot enable strict motion gating');
    await page.keyboard.press('Escape');
    await page.locator('#motion-toggle').click();
    check(await page.evaluate(() => window.__tracks.every(track => track.readyState === 'ended')), 'camera off stops every track');
    check(await page.locator('#camera-view').isHidden(), 'camera preview hidden after off');
    await page.locator('#start-button').click();
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true');
    await page.evaluate(() => window.__tracks.at(-1).dispatchEvent(new Event('ended')));
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'running', 'Assist camera failure does not pause normal timer');
    check(await page.evaluate(() => window.__tracks.every(track => track.readyState === 'ended')), 'camera failure releases all tracks');
    await page.locator('#reset-button').click();
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#motion-brush-type').selectOption('manual');
    await page.locator('#motion-auto-pause').check();
    await page.keyboard.press('Escape');
    await page.evaluate(() => { window.__cameraMode = 'blank'; });
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true');
    await page.locator('#pause-button').click(); // arm strict wait
    await page.locator('#pause-button').click(); // user pauses strict wait
    await page.locator('#motion-toggle').click();
    await page.locator('#pause-button').click();
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'running', 'camera off while strict wait paused resumes a normal timer');
    await page.locator('#reset-button').click();
    await page.evaluate(() => { window.__holdPermission = true; });
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => typeof window.__releasePermission === 'function');
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.__holdPermission = false; window.__releasePermission(); });
    await page.waitForTimeout(300);
    check(await page.evaluate(() => window.__tracks.every(track => track.readyState === 'ended')), 'late camera permission result is released after pagehide');
    check(await page.locator('#motion-toggle').getAttribute('aria-pressed') === 'false', 'canceled startup cannot reopen camera');
    const clip = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 320, 240);
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.start();
      for (let i = 0; i < 6; i++) { ctx.fillRect(i, 0, 10, 10); await new Promise(resolve => setTimeout(resolve, 100)); }
      recorder.stop(); await stopped; stream.getTracks().forEach(track => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
    });
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#motion-replay').setInputFiles({ name: 'local-test.webm', mimeType: 'video/webm', buffer: Buffer.from(clip) });
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true');
    await page.waitForFunction(() => document.querySelector('#motion-diagnostics').textContent.includes('Local test video'));
    check(await page.evaluate(() => document.querySelector('#motion-preview').srcObject === null), 'local replay uses no camera stream');
    await page.locator('#settings-open').click();
    await page.locator('[data-panel="motion-panel"]').click();
    await page.locator('#settings-reset').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('#motion-status').textContent.includes('Bring your face'));
    check(await page.locator('#motion-target').inputValue() === 'auto', 'Settings Reset updates active worker target');
    await page.locator('#motion-toggle').click();
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-status').textContent.includes('permission was denied'));
    check(await page.locator('#motion-toggle').isEnabled(), 'permission denial leaves Camera control usable');
    await page.locator('#start-button').click();
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'running', 'normal timer works after denied camera permission');
    await page.locator('#reset-button').click();
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const cache = await caches.open(keys.find(key => key.startsWith('brush-buddies-shell-')));
      return (await cache.keys()).map(request => new URL(request.url).pathname);
    });
    check(cached.includes('/vendor/mediapipe/face_landmarker.task'), 'model cached after successful camera use');
    check(cached.some(p => p.endsWith('.wasm')), 'WASM cached for offline tracking');
    await context.setOffline(true);
    await page.reload();
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true', null, { timeout: 45000 });
    check(true, 'real worker starts offline after first camera use');
    await page.locator('#motion-toggle').click();
    await context.setOffline(false);
    for (const width of [360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow at ' + width);
      await page.locator('#settings-open').click();
      await page.locator('[data-panel="motion-panel"]').click();
      check(await page.evaluate(() => document.querySelector('#settings-dialog').scrollWidth <= document.querySelector('#settings-dialog').clientWidth), 'camera controls fit at ' + width);
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => {
      const key = 'brushBuddiesSettingsV2';
      const settings = JSON.parse(localStorage.getItem(key));
      Object.assign(settings, { motionAutoPause: true, motionBrushType: 'manual', motionTarget: 'manual', motionTargetSize: 0.8, breakSeconds: 3,
        stages: ['a', 'b'].map(id => ({ id, name: id, icon: 'A', tip: 'Gentle circles.', seconds: 5 })) });
      localStorage.setItem(key, JSON.stringify(settings));
    });
    await page.reload();
    await page.evaluate(() => { window.__cameraMode = 'motion'; });
    await page.locator('#motion-toggle').click();
    await page.waitForFunction(() => document.querySelector('#motion-toggle').getAttribute('aria-pressed') === 'true');
    await page.locator('#pause-button').click();
    await page.waitForFunction(() => window.BrushBuddies.snapshot().phase === 'break');
    await page.locator('#pause-button').click();
    await page.locator('#pause-button').click();
    await page.waitForFunction(() => window.BrushBuddies.snapshot().phase !== 'motion-wait');
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).phase === 'break', 'strict camera resume preserves unfinished break');
    await page.waitForFunction(() => window.BrushBuddies.snapshot().stageIndex === 1);
    check((await page.evaluate(() => window.BrushBuddies.snapshot())).stageLeft === 5, 'resumed break advances without brushing the previous stage again');
    check(external.length === 0, 'no external requests from camera runtime: ' + external.join(','));
    check(errors.length === 0, 'no page errors: ' + errors.join(','));
    console.log('Browser assertions passed: ' + checks);
    await context.close();
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
