-- ══════════════════════════════════════════
-- TextReminder Database Schema
-- Run this in your Supabase SQL editor
-- ══════════════════════════════════════════

-- Profiles (one per user account)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  plan TEXT DEFAULT 'trial',         -- trial | pro | annual
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  message_template TEXT DEFAULT 'Hi {name}, just a reminder your appointment is tomorrow at {time}. Any questions call {business_phone}. Reply STOP to opt out.',
  reminder_hours INTEGER DEFAULT 24, -- hours before appointment to send
  channels JSONB DEFAULT '{"sms": true, "email": false, "whatsapp": false}',
  calendar_provider TEXT,            -- google | apple | outlook
  calendar_token JSONB,              -- encrypted OAuth tokens
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  resend_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders log
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  appointment_time TIMESTAMPTZ NOT NULL,
  venue TEXT,
  service TEXT,
  channel TEXT NOT NULL,             -- sms | email | whatsapp
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',     -- pending | sent | delivered | failed
  sent_at TIMESTAMPTZ,
  calendar_event_id TEXT,
  twilio_sid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar events cache (pulled from connected calendar)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,         -- Google/Apple/Outlook event ID
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  attendees JSONB,                   -- [{name, email, phone}]
  location TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_id UUID REFERENCES reminders(id),
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, external_id)
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own calendar events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
