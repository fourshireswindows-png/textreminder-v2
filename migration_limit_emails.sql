-- Tracks whether warning emails have been sent this month.
-- Reset both columns to false at the start of each new month via a Supabase cron job,
-- or they reset naturally when the user's sent count drops back below the threshold.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS limit_email_sent_80   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS limit_email_sent_full boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text;

-- Optional: if email is already stored elsewhere (e.g. auth.users), you can populate it:
-- UPDATE profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id;
