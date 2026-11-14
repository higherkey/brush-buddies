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
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
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
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
