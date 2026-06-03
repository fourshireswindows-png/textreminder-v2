# TextReminder — Working State (confirmed 03 Jun 2026)

## What was fixed to get here

### Root cause
The Supabase CLI was linked to the wrong project (`eoznfympnigexjkcnkck`, inactive).
All previous function deploys were going to the wrong project.
The correct project is `fxzfaxlhhypiigcmlasx`.

### Fix applied
1. Relinked CLI: `supabase link --project-ref fxzfaxlhhypiigcmlasx`
2. Deployed both functions with `--no-verify-jwt` so cron jobs can call them without a JWT

---

## Cron jobs (Supabase SQL — pg_cron)

### Job 1 — Sync Google Calendar (every 10 minutes)
```sql
SELECT cron.alter_job(
  job_id := 1,
  command := $$
    select net.http_post(
      url := 'https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/sync-google-calendar',
      headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO"}'::jsonb,
      body := json_build_object('user_id', id)::jsonb
    )
    from profiles
    where google_refresh_token is not null
  $$
);
```

### Job 2 — Send Reminders (every 30 minutes)
```sql
SELECT cron.alter_job(
  job_id := 2,
  command := $$
    select net.http_post(
      url := 'https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/send-reminders',
      headers := '{"Content-Type":"application/json","apikey":"sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
```

---

## Deploy commands (run from project folder)
```
cd C:\Users\darry\OneDrive\Desktop\textreminder-site
supabase functions deploy sync-google-calendar --no-verify-jwt
supabase functions deploy send-reminders --no-verify-jwt
```

---

## How the system works

1. Google Calendar event created by user
2. `sync-google-calendar` runs every 10 min → writes events to `calendar_events` table
3. User adds phone number to event via Upcoming page
4. `send-reminders` runs every 30 min → finds events where:
   - `reminder_sent = false`
   - `start_time` is within 24 hours ±1 hour from now
   - `phone` is not null
5. SMS sent via SMS Works API
6. `reminder_sent` set to `true`

---

## Active profile
- User: darryltab85@gmail.com
- Profile ID: 3733f5f1-e2ea-40a8-a8a7-518fd967a79e
- Google Calendar: connected

---

## If sync stops working — diagnostic steps
1. Check `last_synced` in calendar_events — should update every 10 min
2. Run: `SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 1;`
3. If 401: redeploy with `--no-verify-jwt`
4. If wrong project error: run `supabase link --project-ref fxzfaxlhhypiigcmlasx` first
