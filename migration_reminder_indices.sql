-- Add reminder_sent_indices to track which schedule slots have fired per event.
-- Run this in Supabase Dashboard → SQL Editor before deploying the updated edge function.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS reminder_sent_indices jsonb NOT NULL DEFAULT '[]'::jsonb;
