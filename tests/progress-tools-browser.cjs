const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

test('mobile tools edit and undo guest progress without losing newer rewards',async()=>{
  const root=path.resolve(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-11-15T12:00:00')});
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('brushBuddiesSettingsV2'));Object.assign(s,{musicOn:false,animalSounds:false,uiSounds:false});localStorage.setItem('brushBuddiesSettingsV2',JSON.stringify(s));BB_BUDDIES.setDaily('jellyfish');});
    await page.reload();assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),'jellyfish');
    await page.clock.setSystemTime(new Date('2026-11-16T12:00:00'));
    await page.click('#start-button');assert.notEqual(await page.evaluate(()=>BrushBuddies.snapshot().buddy),'jellyfish','overnight app updates visitor');
    await page.click('#reset-button');const visitor=await page.evaluate(()=>BB_BUDDIES.daily());
    await page.click('#settings-open');await page.selectOption('#theme-select','bunny');await page.click('#settings-save');
    assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),visitor);
    assert.equal(await page.locator('.creek-avatar-badge').count(),0);
    assert.equal(await page.getAttribute('.creek-buddy','width'),'64');
    assert.equal(await page.textContent('#visitor-label'),"Today's visitor");
    assert.match(await page.textContent('#buddy-status'),/0\/3 trips to open .*’s home/);
    assert.equal(await page.locator('.topbar button').count(),1,'only settings in header');
    assert.equal(await page.locator('.collection-save #backup-export').count(),0);
    assert.ok((await page.locator('#start-button').boundingBox()).height<=49,'compact primary button');
    async function openTools(code='brush-admin'){
      await page.click('#settings-open');
      if(!await page.locator('.progress-entry').evaluate(el=>el.open))await page.locator('.progress-entry summary').click();
      await page.fill('#progress-code',code);await page.locator('#progress-unlock button').click();
    }
    await openTools('wrong');assert.match(await page.textContent('#progress-unlock-status'),/not recognized/);
    await page.fill('#progress-code','brush-admin');await page.locator('#progress-unlock button').click();
    await page.waitForFunction(()=>!document.querySelector('#progress-save').disabled);
    assert.equal(await page.textContent('#progress-profile'),'Guest on this device');
    assert.ok((await page.locator('#progress-dialog').boundingBox()).width<=430);
    await page.selectOption('#progress-animal','fox');await page.fill('#progress-visits','3');
    await page.fill('#progress-trips','42');await page.selectOption('#progress-sticker','home-fox-0');
    await page.fill('#progress-sticker-count','7');await page.selectOption('#progress-daily','turtle');
    assert.equal(await page.evaluate(()=>BB_BUDDIES.unlocked('fox')),false);
    await page.click('#progress-save');await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('saved on this device'));
    assert.equal(await page.evaluate(()=>BB_BUDDIES.homeUnlocked('fox')),true);
    assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),'turtle');
    assert.deepEqual(await page.evaluate(()=>{const j=JSON.parse(localStorage.getItem('brushBuddiesAdventureV1'));return[j.sessions,j.stickers['home-fox-0']];}),[42,7]);
    await page.screenshot({path:path.join(root,'.local/progress-tools-mobile.png')});
    await page.click('#progress-undo');await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('restored'));
    assert.equal(await page.evaluate(()=>BB_BUDDIES.unlocked('fox')),false);
    assert.equal(await page.evaluate(()=>BrushBuddies.snapshot().buddy),visitor);
    await page.click('#progress-unlock-all');await page.click('#progress-save');
    await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('saved on this device'));
    assert.equal(await page.evaluate(()=>BB_BUDDIES.available().length),75);
    await page.click('#progress-close');await page.reload();assert.equal(await page.evaluate(()=>BB_BUDDIES.available().length),75);
    await openTools();await page.waitForFunction(()=>!document.querySelector('#progress-save').disabled);
    await page.selectOption('#progress-animal','fox');await page.fill('#progress-visits','0');await page.click('#progress-close');
    assert.equal(await page.evaluate(()=>BB_BUDDIES.unlocked('fox')),true,'cancel preserves progress');
    await openTools();await page.waitForFunction(()=>!document.querySelector('#progress-save').disabled);
    await page.evaluate(()=>BB_BUDDIES.complete('another-tab','fox'));await page.click('#progress-save');
    await page.waitForFunction(()=>/changed|reopen/i.test(document.querySelector('#progress-status').textContent));
    assert.equal(await page.evaluate(()=>BB_BUDDIES.load().visits.fox),4);
    await page.click('#progress-close');
    await openTools();await page.waitForFunction(()=>!document.querySelector('#progress-save').disabled);
    await page.selectOption('#progress-animal','fox');await page.fill('#progress-visits','9');
    await page.evaluate(()=>{const set=Storage.prototype.setItem;let fail=true;Storage.prototype.setItem=function(key,value){if(key==='brushBuddiesAdventureV1'&&fail){fail=false;throw new Error('quota');}return set.call(this,key,value);};});
    await page.click('#progress-save');await page.waitForFunction(()=>document.querySelector('#progress-status').textContent.includes('Device storage'));
    assert.equal(await page.evaluate(()=>BB_BUDDIES.load().visits.fox),4,'partial storage failure restores the previous collection');
    await page.click('#progress-close');
    await page.screenshot({path:path.join(root,'.local/transparent-animal-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
