/* Opt-in real-service verification; synthetic accounts contain no child data. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const factory = require('../neon-api.js');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../neon-config.js'), 'utf8'), context);
const config = context.window.BB_NEON;

function client() {
  const cookies = new Map();
  return factory(config, async (url, options) => {
    const response = await fetch(url, { ...options, headers: { ...options.headers, Origin: 'http://localhost:4173', Cookie: [...cookies].map(([k,v]) => k+'='+v).join('; ') } });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'); const i = pair.indexOf('=');
      cookies.set(pair.slice(0,i), pair.slice(i+1));
    }
    return response;
  });
}

test('real Neon accounts enforce ownership and deduplicate expedition inserts', { skip: !process.env.NEON_LIVE_TEST, timeout: 60000 }, async () => {
  const a = client(), b = client();
  const credentials = [0,1].map(() => ({ email: 'brush-test-'+crypto.randomUUID()+'@example.com', password: crypto.randomUUID()+'Aa1!', name: 'Synthetic account test' }));
  await a.auth('sign-up/email', credentials[0]);
  await b.auth('sign-up/email', credentials[1]);
  const sessionA = await a.auth('get-session');
  const sessionB = await b.auth('get-session');
  assert.ok(sessionA?.user?.id && sessionB?.user?.id);
  const baseline = { collection: { visits:{}, completed:[], credits:{} }, journal:{stickers:{},sessions:0,last:''} };
  const [profile] = await a.data('brush_profiles', {}, { display_name:'Synthetic child', baseline });
  assert.equal(profile.owner_id, sessionA.user.id);
  assert.deepEqual(await b.data('brush_profiles', { id:'eq.'+profile.id }), []);
  await assert.rejects(() => b.data('brush_profiles', {}, { owner_id:sessionA.user.id, display_name:'Forged owner', baseline }));
  const anonymous = await fetch(config.dataUrl+'/brush_profiles');
  assert.ok([401,403].includes(anonymous.status));
  const event = { profile_id:profile.id, session_id:crypto.randomUUID(), buddy_id:'fox', sticker_id:'home-fox-0' };
  await assert.rejects(() => b.data('brush_events', {}, event));
  await a.data('brush_events', { on_conflict:'profile_id,session_id' }, event);
  await a.data('brush_events', { on_conflict:'profile_id,session_id' }, event);
  const rows = await a.data('brush_events', { profile_id:'eq.'+profile.id });
  assert.equal(rows.length,1);
  assert.deepEqual(await b.data('brush_events', { profile_id:'eq.'+profile.id }), []);
  fs.mkdirSync('.local', {recursive:true});
  fs.writeFileSync('.local/synthetic-accounts.json', JSON.stringify({ credentials, users:[sessionA.user.id,sessionB.user.id], profileId:profile.id }));
  await a.auth('sign-out',{});
  await assert.rejects(() => a.data('brush_profiles'));
});
