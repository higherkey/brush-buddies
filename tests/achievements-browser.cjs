const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('timer milestones, hidden actions, trail taps, and collectible stories work in the app', async () => {
  const root = path.resolve(__dirname, '..');
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    fs.readFile(file, (error, contents) => {
      if (error) return response.writeHead(404).end();
      response.setHeader('Content-Type', types[path.extname(file)] || 'text/html');
      response.end(contents);
    });
  });

  let browser;
  try {
    await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
    const page = await browser.newPage({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Denied in test', 'NotAllowedError'));
    });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => {
      localStorage.setItem('brushBuddiesSettingsV2', JSON.stringify({
        theme: 'cat', experience: 'simple', musicOn: false, uiSounds: false,
        animalSounds: false, reducedMotion: true, breakSeconds: 0,
        stages: [{ id: 'a', name: 'Top teeth', icon: 'A', tip: 'Gentle circles.', seconds: 5 }]
      }));
      BB_BUDDIES.setDaily('cat');
    });
    await page.reload();
    await page.clock.install();
    const unlocked = id => page.evaluate(id => BB_BUDDIES.unlocked(id), id);
    const waitUnlocked = id => page.waitForFunction(id => BB_BUDDIES.unlocked(id), id);
    const finish = async () => {
      await page.click('#start-button');
      await page.clock.runFor(5100);
      await page.waitForFunction(() => BrushBuddies.snapshot().phase === 'done');
    };

    await page.click('#simple-journal-open');
    assert.match(await page.locator('.buddy-card', { hasText: 'Scout the Puppy' }).innerText(), /0\/1/);
    await page.click('#journal-close');
    await page.click('#start-button');
    await page.clock.runFor(2000);
    await page.click('#reset-button');
    assert.equal(await unlocked('dog'), false);
    for (let brush = 1; brush <= 5; brush++) {
      await finish();
      await page.waitForFunction(count => BB_BUDDIES.metrics(BB_BUDDIES.load(), {}).brushes === count, brush);
      await waitUnlocked('dog');
      if (brush < 5) assert.equal(await unlocked('koala'), false);
    }
    await waitUnlocked('koala');
    await waitUnlocked('cow');
    assert.equal(await page.evaluate(() => localStorage.getItem('brushBuddiesAdventureV1')), null);

    await page.click('#settings-open');
    await page.selectOption('#appearance-select', 'dark');
    await waitUnlocked('lizard');
    await page.click('#settings-close');
    await page.click('#motion-toggle');
    await waitUnlocked('owl');
    await page.evaluate(() => document.querySelector('#studio-link').addEventListener('click', event => event.preventDefault(), { once: true }));
    await page.click('#studio-link');
    await waitUnlocked('eagle');

    await page.click('#mode-toggle');
    await page.click('#start-button');
    assert.ok(await page.locator('#trail-encounter').isHidden());
    await page.clock.runFor(1200);
    assert.ok(await page.locator('#trail-encounter').isVisible());
    assert.equal(await unlocked('ladybug'), false);
    await page.click('#trail-encounter');
    await waitUnlocked('ladybug');
    await page.clock.runFor(5000);
    await page.click('#treasure-close');
    for (let trip = 2; trip <= 4; trip++) {
      await finish();
      await page.clock.runFor(800);
      await page.click('#treasure-close');
      if (trip < 4) assert.equal(await unlocked('mouse'), false);
    }
    await waitUnlocked('mouse');
    await page.click('#journal-open');
    await page.click('#journal-tab-stories');
    await page.getByRole('button', { name: 'A Blanket for Milo' }).click();
    assert.match(await page.textContent('#story-reader-body'), /Tobee.*Milo the Mouse/);
    await page.reload();
    const discovered = ['dog', 'koala', 'lizard', 'owl', 'eagle', 'ladybug', 'mouse'];
    for (const buddy of discovered) assert.equal(await unlocked(buddy), true);
    await page.click('#settings-open');
    const downloadReady = page.waitForEvent('download');
    await page.click('#backup-export');
    const backup = await (await downloadReady).path();
    await page.evaluate(() => BB_BUDDIES.save({}));
    assert.equal(await unlocked('ladybug'), false);
    await page.locator('#backup-import').setInputFiles(backup);
    await page.waitForFunction(() => document.querySelector('#backup-status').textContent.includes('restored'));
    for (const buddy of discovered) assert.equal(await unlocked(buddy), true);
    assert.equal(await page.evaluate(() => BB_BUDDIES.load().visits.cat), 4);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
