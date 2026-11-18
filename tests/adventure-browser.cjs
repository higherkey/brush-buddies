const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('live story preference and open journal update during a brushing session', async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => localStorage.setItem('brushBuddiesSettingsV2', JSON.stringify({
      theme: 'cat', experience: 'adventure', storyText: false, musicOn: false, uiSounds: false,
      animalSounds: false, reducedMotion: true, breakSeconds: 0,
      stages: [{ id: 'a', name: 'Top teeth', icon: 'A', tip: 'Gentle circles.', seconds: 5 }]
    })));
    await page.reload();
    await page.click('#start-button');
    await page.click('#settings-open');
    await page.check('#story-text');
    await page.click('#settings-close');
    const message = await page.textContent('#message');
    assert.ok(message.includes('Gentle circles.') && message !== 'Gentle circles.', 'enabling story text displays the current story and tip');
    await page.click('#journal-open');
    assert.match(await page.textContent('#journal-summary'), /0 trips/);
    await page.waitForSelector('#treasure-dialog[open]', { timeout: 12000 });
    await page.click('#treasure-close');
    assert.ok(await page.locator('#journal-dialog').evaluate(dialog => dialog.open));
    assert.match(await page.textContent('#journal-summary'), /1 trip$/);
    assert.equal(await page.locator('.sticker.found').count(), 1);
    await page.click('#journal-close');
    assert.equal(await page.textContent('#start-button-label'), 'Brush again', 'a finished session offers Brush again');
    assert.ok(await page.locator('#start-button').isVisible(), 'Brush again is visible');
    assert.ok(await page.locator('#reset-button').isHidden(), 'Start over steps aside once finished');
    assert.equal(await page.getAttribute('#timer-ring', 'aria-label'), 'Brush again');
    await page.click('#start-button');
    assert.equal(await page.evaluate(() => BrushBuddies.snapshot().phase), 'running', 'Brush again starts a fresh session');
    assert.ok(await page.locator('#reset-button').isVisible(), 'Start over returns during a session');
    const fits = await page.evaluate(() => {
      const ring = document.querySelector('#timer-ring').getBoundingClientRect();
      const caption = document.querySelector('#time-caption').getBoundingClientRect();
      return caption.left >= ring.left && caption.right <= ring.right && caption.height < 20;
    });
    assert.ok(fits, 'the timer caption stays on one line inside the small adventure ring');
    await page.click('#pause-button');
    const visitor = await page.evaluate(() => BB_BUDDIES.daily());
    await page.click('#journal-open');
    await page.click('#journal-tab-buddies');
    assert.ok(await page.locator('#journal-list').isHidden(), 'the Buddies tab replaces the sticker pages');
    await page.locator('.buddy-card', { hasText: 'Bubbles the Bunny' }).click();
    assert.equal(await page.evaluate(() => BrushBuddies.snapshot().buddy), 'bunny');
    await page.click('#journal-open');
    await page.click('#journal-tab-buddies');
    assert.ok(await page.locator('.buddy-card.visitor').isEnabled(), "today's visitor can be chosen again");
    await page.locator('.buddy-card.visitor').click();
    assert.equal(await page.evaluate(() => BrushBuddies.snapshot().buddy), visitor, 'choosing the visitor brings them back');
    assert.equal(await page.textContent('#visitor-label'), "Today's visitor");
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
