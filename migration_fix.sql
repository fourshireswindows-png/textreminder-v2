-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- 1. Add Google OAuth token columns to profiles (Edge Function needs these)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- 2. Add phone column to calendar_events (for the "Add phone" feature on Upcoming page)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Add location column to calendar_events (so event locations show up)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS location TEXT;
