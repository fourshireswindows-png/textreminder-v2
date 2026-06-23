-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Add phones array column to calendar_events (supports multiple phone numbers per appointment)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS phones TEXT[] DEFAULT '{}';

-- Make external_id nullable so manual appointments don't need a fake Google ID
ALTER TABLE calendar_events ALTER COLUMN external_id DROP NOT NULL;
