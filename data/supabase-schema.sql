-- ============================================================
-- Priority Citizenship V2 — Supabase Database Schema
-- Run this in your Supabase SQL Editor:
-- https://app.supabase.com → Your Project → SQL Editor
-- ============================================================

-- 1. LEADS TABLE (CRM)
CREATE TABLE IF NOT EXISTS public.leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  country     TEXT DEFAULT '',
  service     TEXT DEFAULT 'other',
  budget      TEXT DEFAULT '',
  message     TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  status      TEXT DEFAULT 'new',
  source      TEXT DEFAULT 'website',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BLOG POSTS
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  excerpt     TEXT DEFAULT '',
  content     TEXT DEFAULT '',
  category    TEXT DEFAULT 'general',
  published   BOOLEAN DEFAULT false,
  author      TEXT DEFAULT 'Priority Citizenship',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id          TEXT PRIMARY KEY,
  slot_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  service     TEXT DEFAULT 'general',
  message     TEXT DEFAULT '',
  slot_label  TEXT DEFAULT '',
  status      TEXT DEFAULT 'confirmed',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  message     TEXT DEFAULT '',
  subject     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  key         TEXT PRIMARY KEY,
  value       JSONB DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ANALYTICS
CREATE TABLE IF NOT EXISTS public.analytics (
  id          SERIAL PRIMARY KEY,
  type        TEXT NOT NULL,
  data        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DISABLE ROW LEVEL SECURITY (so anon key can read/write)
-- ============================================================
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- GRANT PERMISSIONS TO ANON ROLE
-- ============================================================
GRANT ALL ON public.leads TO anon, authenticated, service_role;
GRANT ALL ON public.blog_posts TO anon, authenticated, service_role;
GRANT ALL ON public.appointments TO anon, authenticated, service_role;
GRANT ALL ON public.activity_log TO anon, authenticated, service_role;
GRANT ALL ON public.settings TO anon, authenticated, service_role;
GRANT ALL ON public.analytics TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Done! Your data will now persist permanently.
