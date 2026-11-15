const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// SQL contract checks only: these do not execute PostgreSQL or prove RLS behavior.
const source = fs.readFileSync(require.resolve('../db/001-accounts.sql'), 'utf8');
const sql = source.replace(/--[^\r\n]*/g, '').replace(/\s+/g, ' ').trim();
const profiles = sql.match(/CREATE TABLE public\.brush_profiles \((.*?)\);/)[1];
const events = sql.match(/CREATE TABLE public\.brush_events \((.*?)\);/)[1];
const policies = [...sql.matchAll(/CREATE POLICY (\w+) ON public\.(\w+) (.*?);/g)];

test('migration is additive, transactional and bounds lock and statement waits', () => {
  assert.match(sql, /^BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s';/);
  assert.match(sql, /COMMIT;$/);
  assert.equal((sql.match(/CREATE TABLE /g) || []).length, 2);
  assert.doesNotMatch(sql, /\b(?:DROP|TRUNCATE|SECURITY DEFINER|CREATE ROLE|CREATE FUNCTION)\b/i);
  assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE FROM|IF NOT EXISTS)\b/i);
});

test('profiles use generated UUIDs, text Neon ownership and timestamp defaults', () => {
  assert.match(profiles, /\bid uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
  assert.match(profiles, /\bowner_id text NOT NULL DEFAULT auth\.user_id\(\)/);
  assert.doesNotMatch(sql, /auth\.uid\(/);
  for (const table of [profiles, events]) {
    assert.match(table, /\bcreated_at timestamptz NOT NULL DEFAULT now\(\)/);
  }
});

test('profile names must already be trimmed and contain 1 to 40 characters', () => {
  assert.match(profiles, /display_name text NOT NULL CHECK \(display_name = btrim\(display_name\) AND char_length\(display_name\) BETWEEN 1 AND 40\)/);
});

test('baseline defaults to a snapshot with required object children and a byte limit', () => {
  const baseline = profiles.match(/baseline jsonb NOT NULL DEFAULT '([^']+)'::jsonb/);
  assert.ok(baseline);
  assert.deepEqual(JSON.parse(baseline[1]), { collection: {}, journal: {} });
  assert.match(profiles, /jsonb_typeof\(baseline\) = 'object'/);
  for (const key of ['collection', 'journal']) {
    // Ordinary equality permits missing keys through PostgreSQL CHECK's NULL semantics.
    assert.ok(profiles.includes(`AND jsonb_typeof(baseline -> '${key}') IS NOT DISTINCT FROM 'object'`));
  }
  assert.match(profiles, /AND octet_length\(baseline::text\) <= 500 \* 1024/);
});

test('events cascade with profiles and deduplicate sessions per profile', () => {
  assert.match(events, /profile_id uuid NOT NULL REFERENCES public\.brush_profiles\(id\) ON DELETE CASCADE/);
  assert.match(events, /session_id text NOT NULL CHECK \(char_length\(session_id\) BETWEEN 1 AND 200\)/);
  assert.match(events, /PRIMARY KEY \(profile_id, session_id\)/);
  assert.doesNotMatch(events, /\bUNIQUE\b/);
});

test('buddy IDs are letters and sticker IDs also allow numbered home stickers', () => {
  assert.ok(events.includes("buddy_id text NOT NULL CHECK (buddy_id ~ '^[a-z-]{1,64}$')"));
  assert.ok(events.includes("sticker_id text NOT NULL CHECK (sticker_id ~ '^[a-z0-9-]{1,100}$')"));
});

test('exactly four owner-scoped policies enable only authenticated SELECT and INSERT', () => {
  assert.equal(policies.length, 4);
  assert.deepEqual(policies.map(policy => policy[1]).sort(), [
    'brush_events_insert', 'brush_events_select', 'brush_profiles_insert', 'brush_profiles_select'
  ]);
  for (const table of ['brush_profiles', 'brush_events']) {
    assert.ok(sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`));
    for (const [operation, clause] of [['SELECT', 'USING'], ['INSERT', 'WITH CHECK']]) {
      const policy = policies.find(item => item[1] === `${table}_${operation.toLowerCase()}`);
      assert.equal(policy[2], table);
      const condition = table === 'brush_profiles'
        ? 'owner_id = auth.user_id()'
        : 'EXISTS ( SELECT 1 FROM public.brush_profiles AS profile WHERE profile.id = brush_events.profile_id AND profile.owner_id = auth.user_id() )';
      assert.equal(policy[3], `FOR ${operation} TO authenticated ${clause} (${condition})`);
    }
  }
  assert.doesNotMatch(sql, /DISABLE ROW LEVEL SECURITY|BYPASSRLS/i);
});

test('broad defaults and guest access are revoked; only SELECT and INSERT are granted', () => {
  const revoke = 'REVOKE ALL PRIVILEGES ON TABLE public.brush_profiles, public.brush_events FROM PUBLIC, authenticated;';
  const grant = 'GRANT SELECT, INSERT ON TABLE public.brush_profiles, public.brush_events TO authenticated;';
  assert.ok(sql.includes(revoke));
  assert.ok(sql.includes(grant));
  assert.ok(sql.indexOf(revoke) < sql.indexOf(grant));
  assert.match(sql, /FOR guest_role IN SELECT rolname FROM pg_roles WHERE rolname IN \('anonymous', 'anon'\) LOOP/);
  assert.match(sql, /EXECUTE format\('REVOKE ALL PRIVILEGES ON TABLE public\.brush_profiles, public\.brush_events FROM %I', guest_role\); END LOOP;/);
  assert.deepEqual(sql.match(/\bGRANT\b[^;]+;/g), [grant]);
});
