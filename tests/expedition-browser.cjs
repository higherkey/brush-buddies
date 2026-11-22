const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

test('daily visitor, creek travel and three-session home progression', async () => {
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
    const context = await browser.newContext({ serviceWorkers: 'block', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.evaluate(() => localStorage.setItem('brushBuddiesSettingsV2', JSON.stringify({
      theme: 'cat', experience: 'adventure', storyText: false, musicOn: false, uiSounds: false,
      animalSounds: false, reducedMotion: true, breakSeconds: 0,
      stages: [{ id: 'a', name: 'Top teeth', icon: 'A', tip: 'Gentle circles.', seconds: 5 }]
    })));

    await page.evaluate(() => BB_BUDDIES.setDaily('rhinoceros'));
    await page.reload();
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>BB_BUDDIES.catalog.length),75);
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('brushBuddiesSettingsV2'));delete s.experience;localStorage.setItem('brushBuddiesSettingsV2',JSON.stringify(s));});
    await page.reload();
    assert.equal(await page.getAttribute('#app','data-mode'),'adventure');
    for(const mode of ['simple','adventure']){
      if(await page.getAttribute('#app','data-mode')!==mode)await page.click('#mode-toggle');
      let mobile;
      for(const width of [430,768,1200,1920]){
        await page.setViewportSize({width,height:844});
        const layout=await page.evaluate(()=>{
          const app=document.querySelector('#app'),box=app.getBoundingClientRect();
          return {width:box.width,center:box.x+box.width/2,columns:getComputedStyle(app).gridTemplateColumns,header:getComputedStyle(document.querySelector('.topbar')).display,font:getComputedStyle(document.querySelector('h1')).fontSize};
        });
        assert.ok(layout.width<=430,'mobile width cap in '+mode+' at '+width);
        assert.ok(Math.abs(layout.center-width/2)<1,'centered mobile canvas');
        if(!mobile)mobile=layout;
        assert.equal(layout.columns,mobile.columns,'no desktop grid');
        assert.equal(layout.header,mobile.header,'no desktop header');
        assert.equal(layout.font,mobile.font,'no desktop typography');
        await page.click('#settings-open');
        assert.ok((await page.locator('#settings-dialog').boundingBox()).width<=430,'mobile-width dialog');
        await page.click('#settings-close');
      }
    }
    await page.setViewportSize({width:390,height:844});
    const guest=await page.evaluate(()=>BrushBuddies.snapshot().buddy);
    assert.equal(await page.textContent('#buddy-name'),await page.evaluate(id=>BB_BUDDIES.get(id).name,guest));
    assert.ok(await page.locator('#buddy-name').evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.creek-scene').getBoundingClientRect().top),'animal name sits above the scene');
    assert.equal(guest,await page.evaluate(()=>BB_BUDDIES.daily()));
    assert.ok(await page.locator('.creek-scene').isVisible());
    const hero=await page.locator('#buddy-area').boundingBox();assert.ok(hero.height>=400);
    assert.equal(await page.locator('#adv-bugs,.adv-bug').count(),0);
    await page.evaluate(async()=>{
      await Promise.all(BB_BUDDIES.catalog.map(animal=>{const image=new Image();image.src='animals/'+animal.id+'.svg';return image.decode();}));
    });
    const habitats=await page.evaluate(()=>[...new Map(BB_BUDDIES.catalog.map(a=>[a.habitat,a])).values()]);
    const shapes=new Set();
    for(const colorScheme of ['light','dark']){
    await page.emulateMedia({colorScheme});
    await page.waitForFunction(scheme=>document.documentElement.dataset.scheme===scheme,colorScheme);
    for(const {width,height} of [{width:320,height:568},{width:360,height:800},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1200,height:900}]){
      await page.setViewportSize({width,height});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width+'px');
      for(const animal of habitats){
        for(const progress of [0,.5,1]){
          const result=await page.evaluate(({animal,progress})=>{
            BB_SCENE.render({...BrushBuddies.snapshot(),buddy:animal.id,buddyEmoji:animal.emoji,progress,phase:'running',calm:true},{...BB_BUDDIES.home(animal.id),habitat:animal.habitat});
            const svg=document.querySelector('.creek-scene'),a=svg.querySelector('.creek-avatar').getBoundingClientRect(),s=svg.getBoundingClientRect(),m=document.querySelector('#message').getBoundingClientRect();
            return {visible:a.left>=s.left-1&&a.right<=s.right+1&&a.top>=s.top-1&&a.bottom<=s.bottom+1&&a.bottom<m.top&&a.width>=32,habitat:svg.dataset.habitat,shapes:svg.querySelector('.creek-habitat-details')?.innerHTML};
          },{animal,progress});
          assert.ok(result.visible,animal.id+' stays visible at '+width+'px, progress '+progress);
          assert.equal(result.habitat,animal.habitat);
          assert.ok(result.shapes,'habitat scenery exists');shapes.add(result.shapes);
          if(colorScheme==='light'&&width===390&&progress===.5&&['cottage','polar','ocean','desert','bamboo'].includes(animal.habitat))await page.locator('.creek-scene').screenshot({path:path.join(root,'.local','habitat-'+animal.habitat+'.png')});
        }
      }
    }
    }
    assert.ok(shapes.size>=15,'habitats use distinct scenery geometry');
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('bb:render',{detail:BrushBuddies.snapshot()})));
    await page.click('#mode-toggle');
    assert.ok(await page.evaluate(()=>BB_BUDDIES.unlocked(BrushBuddies.snapshot().buddy)));
    await page.click('#settings-open');assert.equal(await page.locator('#theme-select option:disabled').count(),73);await page.click('#settings-close');
    await page.click('#mode-toggle');assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),guest);
    for(let visit=1;visit<=3;visit++){
      await page.click('#start-button');
      if(visit===1){const before=await page.getAttribute('.creek-avatar','transform');await page.waitForTimeout(2100);assert.notEqual(await page.getAttribute('.creek-avatar','transform'),before);await page.screenshot({path:(process.env.TEMP||require('os').tmpdir())+'/bbwork/shots/expedition-mobile.png',fullPage:true});}
      await page.waitForSelector('#treasure-dialog[open]',{timeout:12000});await page.click('#treasure-close');
      assert.equal(await page.evaluate(id=>BB_BUDDIES.load().visits[id],guest),visit);
    }
    assert.equal(await page.evaluate(id=>BB_BUDDIES.unlocked(id),guest), false, 'three trips open the home without earning the visitor');
    assert.ok(await page.evaluate(id=>BB_BUDDIES.homeUnlocked(id),guest));
    await page.click('#settings-open');
    assert.ok(await page.locator('#backup-import').isVisible(),'restore backup uses a reachable native input');
    const downloadReady = page.waitForEvent('download');
    await page.click('#backup-export');
    const download = await downloadReady;
    const backupPath = await download.path();
    await page.evaluate(()=>{const state=BB_BUDDIES.load();state.visits={};BB_BUDDIES.save(state);});
    await page.locator('#backup-import').setInputFiles(backupPath);
    await page.waitForFunction(()=>document.querySelector('#backup-status').textContent.includes('restored'));
    await page.click('#settings-close');
    assert.ok(await page.evaluate(id=>BB_BUDDIES.homeUnlocked(id),guest));
    await page.click('#start-button');
    assert.ok((await page.textContent('#adv-place')).includes(await page.evaluate(id=>BB_BUDDIES.home(id).name,guest)));
    await page.click('#pause-button');
    await page.setViewportSize({width:1200,height:900});await page.screenshot({path:(process.env.TEMP||require('os').tmpdir())+'/bbwork/shots/expedition-desktop.png',fullPage:true});
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
