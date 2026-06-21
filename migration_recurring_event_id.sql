-- Stores the Google Calendar base recurring event ID for each instance.
-- Run in Supabase Dashboard → SQL Editor before deploying the updated sync function.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS recurring_event_id text;
