-- Requires Neon Data API setup (authenticated role and auth schema).
-- auth.user_id() returns text; auth.uid() returns uuid:
-- https://neon.com/docs/auth/authentication-flow#data-api-integration
-- https://neon.com/docs/data-api/access-control#api-roles
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.brush_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL DEFAULT auth.user_id(),
  display_name text NOT NULL
    CHECK (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 40),
  baseline jsonb NOT NULL DEFAULT '{"collection":{},"journal":{}}'::jsonb
    CHECK (
      jsonb_typeof(baseline) = 'object'
      AND jsonb_typeof(baseline -> 'collection') IS NOT DISTINCT FROM 'object'
      AND jsonb_typeof(baseline -> 'journal') IS NOT DISTINCT FROM 'object'
      AND octet_length(baseline::text) <= 500 * 1024
    ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brush_events (
  profile_id uuid NOT NULL REFERENCES public.brush_profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 1 AND 200),
  buddy_id text NOT NULL CHECK (buddy_id ~ '^[a-z-]{1,64}$'),
  sticker_id text NOT NULL CHECK (sticker_id ~ '^[a-z0-9-]{1,100}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, session_id)
);

ALTER TABLE public.brush_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brush_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY brush_profiles_select ON public.brush_profiles
  FOR SELECT TO authenticated
  USING (owner_id = auth.user_id());

CREATE POLICY brush_profiles_insert ON public.brush_profiles
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.user_id());

CREATE POLICY brush_events_select ON public.brush_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brush_profiles AS profile
    WHERE profile.id = brush_events.profile_id AND profile.owner_id = auth.user_id()
  ));

CREATE POLICY brush_events_insert ON public.brush_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brush_profiles AS profile
    WHERE profile.id = brush_events.profile_id AND profile.owner_id = auth.user_id()
  ));

-- Clear any broad Data API default grants before granting append-only access.
REVOKE ALL PRIVILEGES ON TABLE public.brush_profiles, public.brush_events FROM PUBLIC, authenticated;
DO $$
DECLARE
  guest_role text;
BEGIN
  FOR guest_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anonymous', 'anon') LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.brush_profiles, public.brush_events FROM %I', guest_role);
  END LOOP;
END;
$$;
GRANT SELECT, INSERT ON TABLE public.brush_profiles, public.brush_events TO authenticated;

COMMIT;
