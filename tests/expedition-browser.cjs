const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('daily visitor, creek travel and three-session unlock progression', async () => {
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
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>BB_BUDDIES.catalog.length),75);
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('brushBuddiesSettingsV2'));delete s.experience;localStorage.setItem('brushBuddiesSettingsV2',JSON.stringify(s));});
    await page.reload();
    assert.equal(await page.getAttribute('#app','data-mode'),'adventure');
    const guest=await page.evaluate(()=>BrushBuddies.snapshot().buddy);
    assert.equal(guest,await page.evaluate(()=>BB_BUDDIES.daily()));
    assert.ok(await page.locator('.creek-scene').isVisible());
    const hero=await page.locator('#buddy-area').boundingBox();assert.ok(hero.height>=400);
    await page.click('#mode-toggle');
    assert.ok(await page.evaluate(()=>BB_BUDDIES.unlocked(BrushBuddies.snapshot().buddy)));
    await page.click('#settings-open');assert.equal(await page.locator('#theme-select option:disabled').count(),73);await page.click('#settings-close');
    await page.click('#mode-toggle');assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),guest);
    for(let visit=1;visit<=3;visit++){
      await page.click('#start-button');
      if(visit===1){const before=await page.getAttribute('.creek-avatar','transform');await page.waitForTimeout(2100);assert.notEqual(await page.getAttribute('.creek-avatar','transform'),before);await page.screenshot({path:process.env.TEMP+'/bbwork/shots/expedition-mobile.png',fullPage:true});}
      await page.waitForSelector('#treasure-dialog[open]',{timeout:12000});await page.click('#treasure-close');
      assert.equal(await page.evaluate(id=>BB_BUDDIES.load().visits[id],guest),visit);
    }
    assert.ok(await page.evaluate(id=>BB_BUDDIES.unlocked(id),guest));
    const downloadReady = page.waitForEvent('download');
    await page.click('#backup-export');
    const download = await downloadReady;
    const backupPath = await download.path();
    await page.evaluate(()=>{const state=BB_BUDDIES.load();state.visits={};BB_BUDDIES.save(state);});
    await page.locator('#backup-import').setInputFiles(backupPath);
    await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('restored'));
    assert.ok(await page.evaluate(id=>BB_BUDDIES.homeUnlocked(id),guest));
    await page.click('#start-button');
    assert.ok((await page.textContent('#adv-place')).includes(await page.evaluate(id=>BB_BUDDIES.home(id).name,guest)));
    await page.click('#pause-button');
    await page.setViewportSize({width:1200,height:900});await page.screenshot({path:process.env.TEMP+'/bbwork/shots/expedition-desktop.png',fullPage:true});
    await page.reload();assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),guest);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(()=>{const state=BB_BUDDIES.load();state.visits.fox=2;state.credits={a:'fox',b:'fox'};state.completed=['a','b'];BB_BUDDIES.save(state);});
    await page.locator('#backup-import').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,collection:{visits:{fox:2},completed:['a','b']},journal:{sessions:2,stickers:{}}}))});
    await page.waitForFunction(()=>document.querySelector('#backup-import').value==='');
    assert.equal(await page.evaluate(()=>BB_BUDDIES.load().visits.fox),2);
    const incoming = { name:'other-device.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({version:1,collection:{visits:{fox:1},credits:{c:'fox'},completed:['c']},journal:{sessions:1,stickers:{}}})) };
    for(let i=0;i<2;i++){
      await page.locator('#backup-import').setInputFiles(incoming);
      await page.waitForFunction(()=>BB_BUDDIES.load().visits.fox===3);
      assert.equal(await page.evaluate(()=>BB_BUDDIES.load().visits.fox),3);
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
