const { test } = require('node:test');
const assert = require('node:assert/strict');
const factory = require('../neon-api.js');
const config = { authUrl:'https://auth.example.test', dataUrl:'https://data.example.test' };
test('managed sign-in sends credentials to Auth with secure-cookie support', async () => {
  const api = factory(config, async (url, options) => {
    assert.equal(url, config.authUrl+'/sign-in/email');
    assert.equal(options.credentials,'include');
    assert.equal(options.cache,'no-store');
    assert.deepEqual(JSON.parse(options.body),{email:'a@example.test',password:'only-in-request'});
    return {ok:true,status:200,json:async()=>({user:{id:'a'}})};
  });
  assert.deepEqual(await api.auth('sign-in/email',{email:'a@example.test',password:'only-in-request'}),{user:{id:'a'}});
});
test('data queries obtain short-lived JWT and encode profile filters', async () => {
  let calls=0;
  const api=factory(config,async(url,options)=>{
    if(calls++===0){assert.equal(url,config.authUrl+'/token');return {ok:true,status:200,json:async()=>({token:'short-lived'})};}
    assert.equal(options.headers.Authorization,'Bearer short-lived');
    assert.equal(new URL(url).searchParams.get('profile_id'),'eq.profile');
    return {ok:true,status:200,json:async()=>[]};
  });
  assert.deepEqual(await api.data('brush_events',{profile_id:'eq.profile'}),[]);
  assert.equal(calls,2);
});
test('expired login and forbidden data fail without returning private server details', async () => {
  const api=factory(config,async()=>({ok:false,status:401,json:async()=>({secret:'never display'})}));
  await assert.rejects(()=>api.data('brush_profiles'),/Sign in again/);
  await assert.rejects(()=>api.data('unknown'),/Unknown/);
});

test('owned profile PATCH forwards CAS filters and requests the committed row', async () => {
  const body = { baseline: { collection: {}, journal: {} }, revision: 8 };
  const api = factory(config, async (url, options) => {
    if (url === config.authUrl + '/token') return { ok:true, status:200, json:async()=>({token:'short-lived'}) };
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer short-lived');
    assert.equal(options.headers.Prefer, 'return=representation');
    assert.deepEqual(JSON.parse(options.body), body);
    const query = new URL(url).searchParams;
    assert.equal(query.get('id'), 'eq.profile');
    assert.equal(query.get('revision'), 'eq.7');
    return { ok:true, status:200, json:async()=>[{id:'profile', ...body}] };
  });
  assert.deepEqual(await api.data('brush_profiles', {id:'eq.profile', revision:'eq.7'}, body, 'PATCH'), [{id:'profile', ...body}]);
});

test('profile CAS misses stay empty and failed PATCH never reports success', async () => {
  let status = 200;
  const api = factory(config, async url => url === config.authUrl + '/token'
    ? {ok:true, status:200, json:async()=>({token:'short-lived'})}
    : {ok:status === 200, status, json:async()=>[]});
  assert.deepEqual(await api.data('brush_profiles', {revision:'eq.0'}, {revision:1}, 'PATCH'), []);
  status = 403;
  await assert.rejects(() => api.data('brush_profiles', {}, {revision:1}, 'PATCH'), /could not complete/);
});

test('data rejects event PATCH and unsupported verbs before authenticating', async () => {
  const api = factory(config, async () => assert.fail('Rejected operations must not fetch credentials'));
  for (const method of ['PUT', 'DELETE', 'HEAD', 'patch', '']) {
    await assert.rejects(() => api.data('brush_profiles', {}, {}, method), /Unsupported/);
  }
  await assert.rejects(() => api.data('brush_events', {}, {}, 'PATCH'), /Unsupported/);
  await assert.rejects(() => api.data('unknown', {}, {}, 'PATCH'), /Unknown/);
});

test('progress migration grants only owned baseline/revision updates with bounded locks', () => {
  const sql = require('node:fs').readFileSync(require.resolve('../db/002-progress-tools.sql'), 'utf8')
    .replace(/--[^\r\n]*/g, '').replace(/\s+/g, ' ').trim();
  assert.match(sql, /^BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s';/);
  assert.match(sql, /ADD COLUMN revision integer NOT NULL DEFAULT 0 CHECK \(revision >= 0\)/);
  assert.match(sql, /FOR UPDATE TO authenticated USING \(owner_id = auth.user_id\(\)\) WITH CHECK \(owner_id = auth.user_id\(\)\)/);
  assert.deepEqual(sql.match(/\bGRANT\b[^;]+;/g), ['GRANT UPDATE (baseline, revision) ON public.brush_profiles TO authenticated;']);
  assert.doesNotMatch(sql, /brush_events|\b(?:DROP|TRUNCATE|DELETE|DISABLE|SECURITY DEFINER)\b/i);
  assert.match(sql, /COMMIT;$/);
  assert.match(sql, /NEW\.revision <> OLD\.revision \+ 1/);
  assert.match(sql, /CREATE TRIGGER brush_progress_revision BEFORE UPDATE/);
});
