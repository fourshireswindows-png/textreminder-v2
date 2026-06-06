-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Adds recurring manual appointment support to calendar_events

-- Mark whether an event was added manually (vs synced from Google/Apple calendar)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Groups all occurrences of a recurring appointment together
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurring_group_id UUID;

-- How many days between each occurrence (e.g. 7 = weekly, 14 = fortnightly)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurring_interval_days INTEGER;

-- The chosen end date (NULL means "until cancelled" — created up to 60 days ahead)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurring_end_date DATE;

-- Index so deleting/querying all events in a recurring group is fast
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurring_group
  ON calendar_events(recurring_group_id)
  WHERE recurring_group_id IS NOT NULL;
