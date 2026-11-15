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
