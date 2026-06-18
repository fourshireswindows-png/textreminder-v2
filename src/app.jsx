/*
 * TextReminder — src/App.jsx  (rebuilt: top nav, mobile-first)
 *
 * SUPABASE SQL SETUP — run once in the Supabase SQL editor:
 *
 * CREATE TABLE IF NOT EXISTS contacts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *   name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, notes TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE TABLE IF NOT EXISTS reminders (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *   contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
 *   contact_name TEXT NOT NULL, contact_phone TEXT NOT NULL,
 *   message TEXT NOT NULL, scheduled_for TIMESTAMPTZ NOT NULL,
 *   status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE TABLE IF NOT EXISTS settings (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
 *   business_name TEXT DEFAULT '', phone_number TEXT DEFAULT '',
 *   message_template TEXT DEFAULT 'Hi {name}, reminder from {business}: your appointment is on {date} at {time}. Reply STOP to opt out.',
 *   reminder_hours INTEGER DEFAULT 24,
 *   google_calendar_connected BOOLEAN DEFAULT FALSE,
 *   google_calendar_email TEXT DEFAULT '',
 *   plan TEXT DEFAULT 'free',
 *   created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own settings" ON settings FOR ALL USING (auth.uid() = user_id);
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  'https://fxzfaxlhhypiigcmlasx.supabase.co',
  'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO'
)

// ─── Google Calendar OAuth constants ─────────────────────────────────────────
const GOOGLE_CLIENT_ID = '508681493155-5msuj56461c0tv3midh9tv05lmese9pd.apps.googleusercontent.com'
const GOOGLE_REDIRECT  = 'https://www.textreminder.co.uk/auth/calendar/callback'
const GOOGLE_SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly'
const EDGE_FN          = 'https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/google-calendar-callback'

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  pink:      '#ec4899',
  pinkDark:  '#db2777',
  purple:    '#a855f7',
  navy:      '#0f172a',
  navyMid:   '#1e293b',
  bg:        '#f8fafc',
  border:    '#e2e8f0',
  text:      '#0f172a',
  muted:     '#64748b',
  mutedLight:'#94a3b8',
  success:   '#10b981',
  error:     '#ef4444',
  warning:   '#f59e0b',
}

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'free',         name: 'Free',         price: 0,   annualPrice: 0,    reminders: 20,   popular: false,
    features: ['20 SMS reminders/month','Google Calendar sync','Up to 20 contacts','Basic templates','Message log'] },
  { id: 'starter',      name: 'Starter',      price: 15,  annualPrice: 150,  reminders: 100,  popular: false,
    features: ['100 SMS reminders/month','Google Calendar sync','Unlimited contacts','Custom templates','Message log','Email support'] },
  { id: 'professional', name: 'Professional', price: 29,  annualPrice: 290,  reminders: 200,  popular: true,
    features: ['200 SMS reminders/month','Google Calendar sync','Unlimited contacts','Custom templates','Priority delivery','Delivery reports','Priority support'] },
  { id: 'business',     name: 'Business',     price: 55,  annualPrice: 550,  reminders: 400,  popular: false,
    features: ['400 SMS reminders/month','Everything in Pro','Multiple calendars','API access','Dedicated account manager','Custom sender ID'] },
  { id: 'enterprise',   name: 'Enterprise',   price: 249, annualPrice: 2490, reminders: 2000, popular: false,
    features: ['2,000 SMS reminders/month','Everything in Business','Dedicated account manager','Custom integrations','SLA guarantee','Custom sender ID'] },
]

// ─── Global styles ────────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { font-family: 'DM Sans', sans-serif; background: #f8fafc; color: #0f172a;
        -webkit-font-smoothing: antialiased; }
      a { text-decoration: none; color: inherit; }
      button { font-family: inherit; cursor: pointer; border: none; background: none; }
      input, textarea, select { font-family: inherit; }

      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #f1f5f9; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

      .btn-primary {
        background: #ec4899; color: #fff; border: none; border-radius: 8px;
        padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
        transition: background 0.15s, box-shadow 0.15s;
        display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
      }
      .btn-primary:hover { background: #db2777; box-shadow: 0 4px 12px rgba(236,72,153,0.35); }
      .btn-primary:active { opacity: 0.9; }
      .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

      .btn-secondary {
        background: transparent; color: #0f172a;
        border: 1.5px solid #e2e8f0; border-radius: 8px;
        padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
      }
      .btn-secondary:hover { border-color: #a855f7; background: #faf5ff; }
      .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }

      .btn-ghost {
        background: transparent; color: #64748b; border: none; border-radius: 8px;
        padding: 8px 12px; font-size: 14px; font-weight: 500; cursor: pointer;
        transition: background 0.15s, color 0.15s;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .btn-ghost:hover { background: #f1f5f9; color: #0f172a; }

      .inp, .input {
        width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px;
        padding: 10px 14px; font-size: 14px; background: #fff; color: #0f172a; outline: none;
        transition: border-color 0.15s, box-shadow 0.15s; font-family: 'DM Sans', sans-serif;
      }
      .inp:focus, .input:focus { border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236,72,153,0.08); }
      .inp::placeholder, .input::placeholder { color: #94a3b8; }
      textarea.inp { resize: vertical; }
      select.inp {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px;
      }

      .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
      .lbl { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }

      @keyframes fadeIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin    { to { transform: rotate(360deg); } }
      .fade-in  { animation: fadeIn  0.22s ease; }
      .slide-up { animation: slideUp 0.25s ease; }

      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th { padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700;
        color: #64748b; border-bottom: 2px solid #e2e8f0; background: #f8fafc; white-space: nowrap; }
      .data-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      .data-table tbody tr:hover { background: #f8fafc; }
      .data-table tbody tr:last-child td { border-bottom: none; }

      .pill { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
        cursor: pointer; border: 1px solid #e2e8f0; background: #fff; color: #64748b; transition: all 0.15s; }
      .pill:hover { border-color: #a855f7; color: #a855f7; }
      .pill-active { background: #0f172a; color: #fff; border-color: #0f172a; }

      @media (max-width: 640px) {
        .hide-mobile { display: none !important; }
        .card { padding: 16px; }
      }
      @media (min-width: 641px) {
        .hide-desktop { display: none !important; }
      }
    `}</style>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Calendar: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Msg: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Star: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ChevRight: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.34h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Clock: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  Trend: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/><polyline points="17,6 23,6 23,12"/></svg>,
  Alert: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Link: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Unlink: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></svg>,
  Menu: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Google: () => <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const fmtDT   = d => `${fmtDate(d)}, ${fmtTime(d)}`

// ─── Small shared components ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = { pending: ['#fef9c3','#854d0e'], sent: ['#dcfce7','#166534'], failed: ['#fee2e2','#991b1b'], cancelled: ['#f1f5f9','#475569'] }
  const [bg, color] = map[status] || map.pending
  return <span style={{ background: bg, color, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{status}</span>
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? C.success : type === 'error' ? C.error : C.warning
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, color: '#fff',
      padding: '12px 18px', borderRadius: 10, fontWeight: 500, fontSize: 14,
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      animation: 'slideUp 0.2s ease', maxWidth: 360 }}>
      {type === 'success' ? <IC.Check /> : <IC.Alert />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.8)', flexShrink: 0, padding: 2 }}><IC.X /></button>
    </div>
  )
}

function Modal({ title, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth,
        maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.22s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6, color: C.muted }}><IC.X /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
}

function EmptyState({ icon: Ic, title, sub, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ width: 52, height: 52, background: '#f1f5f9', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.muted }}><Ic /></div>
      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</p>
      {sub && <p style={{ color: C.muted, fontSize: 13, marginBottom: action ? 16 : 0 }}>{sub}</p>}
      {action && <button className="btn-primary" onClick={onAction} style={{ fontSize: 13, padding: '8px 18px' }}>{action}</button>}
    </div>
  )
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
function LogoMark({ dark = false, size = 34 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Speech bubble icon with checkmark */}
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="bubbleGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* Speech bubble */}
        <path d="M6 8C6 5.79 7.79 4 10 4H38C40.21 4 42 5.79 42 8V30C42 32.21 40.21 34 38 34H26L18 42V34H10C7.79 34 6 32.21 6 30V8Z"
          fill="url(#bubbleGrad)" />
        {/* Message lines */}
        <rect x="14" y="14" width="20" height="3" rx="1.5" fill="white" opacity="0.9" />
        <rect x="14" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.9" />
        {/* Green checkmark badge */}
        <circle cx="37" cy="11" r="8" fill="#22c55e" />
        <path d="M33 11L36 14L41 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* Brand text */}
      <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', lineHeight: 1 }}>
        <span style={{ color: dark ? C.navy : '#fff' }}>text</span>
        <span style={{ color: C.pink }}>reminder</span>
        {dark && <span style={{ color: C.navy, fontWeight: 700 }}>.co.uk</span>}
      </span>
    </div>
  )
}

// ─── PUBLIC NAV ───────────────────────────────────────────────────────────────
function PublicNav({ onLogin, onSignup, onNavigate }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: C.navy, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
        <button onClick={() => onNavigate && onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <LogoMark />
        </button>
        <div className="hide-mobile" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[['pricing','Pricing'],['roi-calculator','ROI Calculator'],['blog','Blog'],['compare','Compare'],['resources','Resources']].map(([k,l]) => (
            <button key={k} className="btn-ghost" onClick={() => onNavigate && onNavigate(k)} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={onLogin} style={{ color: 'rgba(255,255,255,0.75)' }}>Log in</button>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '9px 20px' }}>Get started free</button>
        </div>
      </div>
    </nav>
  )
}

// ─── APP NAV (top bar with mobile hamburger) ──────────────────────────────────
const NAV_ITEMS = [
  { key: 'upcoming',    label: 'Upcoming',  Ic: IC.Calendar },
  { key: 'settings',    label: 'Settings',  Ic: IC.Settings },
  { key: 'upgrade',     label: 'Upgrade',   Ic: IC.Star, accent: true },
]

function AppNav({ page, setPage, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function navigate(key) { setPage(key); setMenuOpen(false) }

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 200, background: C.navy, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 56 }}>

        {/* Logo */}
        <button onClick={() => navigate('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', marginRight: 8, flexShrink: 0 }}>
          <LogoMark />
        </button>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, height: '100%', gap: 2, overflow: 'hidden' }} className="hide-mobile">
          {NAV_ITEMS.map(({ key, label, Ic, accent }) => {
            const active = page === key
            return (
              <button key={key} onClick={() => navigate(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
                  position: 'relative', whiteSpace: 'nowrap',
                  color: active ? (accent ? C.pink : '#fff') : accent ? C.pink : 'rgba(255,255,255,0.55)',
                  fontWeight: active ? 600 : 500, fontSize: 13.5,
                  background: active ? 'rgba(255,255,255,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s' }}>
                <Ic />
                {label}
                {active && <span style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, background: C.pink, borderRadius: '2px 2px 0 0' }} />}
              </button>
            )
          })}
        </div>

        {/* Desktop user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }} className="hide-mobile">
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email?.split('@')[0]}
          </span>
          <button className="btn-ghost" onClick={onLogout} title="Log out" style={{ color: 'rgba(255,255,255,0.55)', padding: 8, borderRadius: 6 }}>
            <IC.LogOut />
          </button>
        </div>

        {/* Mobile hamburger */}
        <div style={{ marginLeft: 'auto', position: 'relative' }} className="hide-desktop" ref={menuRef}>
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ color: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 8, background: menuOpen ? 'rgba(255,255,255,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
            <IC.Menu />
          </button>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 220,
              background: C.navyMid, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)', overflow: 'hidden', animation: 'slideUp 0.18s ease', zIndex: 300 }}>
              {NAV_ITEMS.map(({ key, label, Ic, accent }) => {
                const active = page === key
                return (
                  <button key={key} onClick={() => navigate(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '12px 16px', background: active ? 'rgba(255,255,255,0.08)' : 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      color: active ? '#fff' : accent ? C.pink : 'rgba(255,255,255,0.65)',
                      fontWeight: active ? 600 : 400, fontSize: 14,
                      borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Ic />
                    {label}
                  </button>
                )
              })}
              <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <IC.LogOut /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: HOME (landing)
// ═════════════════════════════════════════════════════════════════════════════
function HomePage({ onLogin, onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={onLogin} onSignup={onSignup} onNavigate={onNavigate} />

      {/* Hero */}
      <section style={{ background: C.navy, padding: '90px 20px 110px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }} className="fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)', borderRadius: 24, padding: '6px 16px' }}>
            <IC.Bell />
            <span style={{ color: C.pink, fontSize: 13, fontWeight: 600 }}>Built by tradespeople, for tradespeople.</span>
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 58px)', fontWeight: 800, color: '#fff', lineHeight: 1.13, letterSpacing: '-1.5px', marginBottom: 22 }}>
            Stop Losing Jobs{' '}
            <span style={{ color: C.pink }}>to No-Shows</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 16px' }}>
            TextReminder automatically texts your customers the day before their appointment. Set it up once, never chase a no-show again.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            "I was paying £28.80 a month for 100 texts with my old provider. So I built something better."
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={onSignup} style={{ padding: '14px 30px', fontSize: 16 }}>Start Free — No Card Needed</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} style={{ padding: '14px 30px', fontSize: 16, fontWeight: 500, border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 8, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>See How It Works</button>
          </div>
          {/* Trust signals */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            {['No contracts','Cancel any time','UK-based','98% SMS open rate'].map(t => (
              <span key={t} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: C.success }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: '#faf5ff', borderBottom: '1px solid #e9d5ff', padding: '32px 20px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {[['98%','SMS open rate'],['42%','Fewer no-shows'],['2 min','Setup time'],['0','Manual work']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.purple, letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" style={{ padding: '88px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px' }}>Everything you need to reduce no-shows</h2>
            <p style={{ color: C.muted, fontSize: 16, marginTop: 12 }}>Built for trades, salons, clinics, and any appointment-based business.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 22 }}>
            {[
              { Ic: IC.Calendar, title: 'Google Calendar sync', desc: 'Connect once. TextReminder reads your calendar and schedules reminders automatically.' },
              { Ic: IC.Msg, title: 'Personalised SMS templates', desc: 'Include your business name, client name, date, and time in every message. Fully customisable.' },
              { Ic: IC.Users, title: 'Contact management', desc: 'Store your client list securely. Add and remove contacts. Search and filter in seconds.' },
              { Ic: IC.Trend, title: 'Delivery tracking', desc: 'See real-time status of every reminder — sent, pending, or failed. Full message log included.' },
              { Ic: IC.Clock, title: 'Flexible timing', desc: 'Choose how far ahead reminders go out: 1 hour, 24 hours, 48 hours, or more.' },
              { Ic: IC.Bell, title: 'Set it and forget it', desc: 'Once configured, everything runs automatically. No daily logins, no manual sending.' },
            ].map(({ Ic, title, desc }) => (
              <div key={title} className="card" style={{ cursor: 'default' }}>
                <div style={{ width: 46, height: 46, background: '#faf5ff', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.purple, marginBottom: 16 }}><Ic /></div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 9 }}>{title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection onSignup={onSignup} />

      {/* ROI Calculator */}
      <RoiSection onSignup={onSignup} />

      {/* From the Blog */}
      <BlogPreviewSection onNavigate={onNavigate} />

      {/* Footer */}
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ─── Pricing Section (reusable with toggle) ──────────────────────────────────
function PricingSection({ onSignup }) {
  const [annual, setAnnual] = useState(false)
  return (
    <section style={{ background: '#f8fafc', padding: '88px 20px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px' }}>Simple, honest pricing</h2>
          <p style={{ color: C.muted, marginTop: 10, fontSize: 16 }}>No contracts. Cancel any time.</p>
          {/* Toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 24, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 40, padding: '6px 8px' }}>
            <button onClick={() => setAnnual(false)} style={{ padding: '7px 18px', borderRadius: 30, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: !annual ? C.navy : 'transparent', color: !annual ? '#fff' : C.muted, transition: 'all 0.2s' }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 30, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', background: annual ? C.navy : 'transparent', color: annual ? '#fff' : C.muted, transition: 'all 0.2s' }}>
              Annual
              <span style={{ background: C.success, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>Save 2 months</span>
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const monthlyEquiv = annual && plan.annualPrice > 0 ? (plan.annualPrice / 12).toFixed(2) : null
            return (
              <div key={plan.id} className="card" style={{ border: plan.popular ? `2px solid ${C.pink}` : `1px solid ${C.border}`, position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                {plan.popular && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: C.pink, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>MOST POPULAR</div>}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.muted, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', marginBottom: 2 }}>
                  {plan.price === 0 ? 'Free' : annual ? `£${plan.annualPrice}` : `£${plan.price}`}
                  {plan.price > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>{annual ? '/yr' : '/mo'}</span>}
                </div>
                {monthlyEquiv && <div style={{ fontSize: 12, color: C.success, fontWeight: 600, marginBottom: 14 }}>£{monthlyEquiv}/mo</div>}
                {!monthlyEquiv && <div style={{ marginBottom: 14 }} />}
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, fontWeight: 500 }}>{plan.reminders} SMS/month</div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}>
                      <span style={{ color: C.success, flexShrink: 0, marginTop: 1 }}><IC.Check /></span>{f}
                    </div>
                  ))}
                </div>
                <button className={plan.popular ? 'btn-primary' : 'btn-secondary'} onClick={onSignup} style={{ width: '100%', justifyContent: 'center', padding: 10, fontSize: 13 }}>
                  {plan.price === 0 ? 'Get started free' : 'Get started'}
                </button>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 24 }}>No contracts. Cancel any time.</p>
      </div>
    </section>
  )
}

// ─── Blog data ────────────────────────────────────────────────────────────────
const BLOG_POSTS = [
  {
    slug: 'how-to-reduce-no-shows-window-cleaner',
    title: 'How to Reduce No-Shows as a Window Cleaner',
    category: 'Window Cleaning',
    date: '2026-05-29',
    readTime: '5 min read',
    metaDesc: 'Tired of customers forgetting their window cleaning appointment? Here\'s how UK window cleaners are cutting no-shows to almost zero.',
    excerpt: 'No-shows cost UK window cleaners hundreds of pounds every month. Here\'s the simple fix that\'s working right now.',
    content: `
Every window cleaner knows the feeling. You've loaded the van, driven across town, parked up — and there's nobody home.

No answer at the door. No text. No warning.

It's not just frustrating. It's money out of your pocket. Fuel wasted. A slot you could have filled with a paying job.

**The no-show problem is bigger than you think**

Industry surveys suggest that up to 1 in 5 service appointments end in a no-show or late cancellation. For a window cleaner doing 6–8 jobs a day, that could mean losing 1–2 jobs daily. At even £25 a job, that's £50+ a day — over £1,000 a month — just walking out the door.

And it's rarely intentional. Most customers simply forgot.

**Why customers forget**

People are busy. They book their window clean weeks in advance, life happens, and by the time you turn up they've got the kids to school, they're on a work call, or they've just genuinely forgotten you were coming.

This isn't a character flaw. It's human nature. The fix isn't to get better customers — it's to remind the ones you already have.

**The simple solution: a text the day before**

Research consistently shows that a simple reminder message sent 24 hours before an appointment reduces no-shows by up to 40%.

That's not a made-up figure. That's what happens when you give people a chance to remember.

A text doesn't need to be fancy. Something like:

*"Hi Sarah, just a reminder that your window clean is booked for tomorrow, Thursday 30th May at 10am. Reply STOP to cancel. — Dave, Crystal Clear Windows"*

Simple. Friendly. Effective.

**But who's got time to send texts all day?**

That's the problem. If you're a one-man band or running a small team, you're already juggling quotes, jobs, invoices, and everything else that comes with running a business. Sitting down every evening to send reminder texts to tomorrow's customers is another hour you don't have.

That's exactly why we built TextReminder.

**How TextReminder works for window cleaners**

1. You connect your Google Calendar (takes about 5 minutes)
2. TextReminder reads your appointments automatically
3. 24 hours before each job, your customer gets a personalised SMS reminder
4. You get fewer no-shows, no extra admin

You don't have to log in every day. You don't have to do anything differently. Just book jobs in your calendar like you always do — the reminders go out automatically.

**What about the customers who reply?**

That's actually one of the best parts. When a customer replies to say they need to reschedule, you find out 24 hours in advance instead of when you're parked outside their house. You can fill that slot with another job.

A cancellation with notice is worth money. A no-show costs you money.

**The numbers stack up**

TextReminder starts from free (20 texts/month) and goes up to £29/month for 200 texts. If you're doing 20 jobs a week, that's roughly 80 texts a month — the Starter plan at £15/month covers that.

Compare that to the cost of even one no-show a month. Most window cleaners recover the cost of TextReminder in a single job saved.

**Getting started**

It takes about 5 minutes to set up. No contract. Just connect your calendar, customise your message, and let it run.

If you're tired of driving to empty houses, give it a go — the first 20 reminders are completely free.
    `
  },
]

// ─── Blog Preview Section ─────────────────────────────────────────────────────
function BlogPreviewSection({ onNavigate }) {
  const posts = BLOG_POSTS.slice(0, 3)
  if (posts.length === 0) return null
  return (
    <section style={{ padding: '80px 20px', borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: '-0.6px' }}>From the Blog</h2>
            <p style={{ color: C.muted, fontSize: 15, marginTop: 6 }}>Tips and guides for UK tradespeople</p>
          </div>
          <button className="btn-secondary" onClick={() => onNavigate && onNavigate('blog')} style={{ fontSize: 13 }}>View all posts <IC.ChevRight /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {posts.map(post => (
            <div key={post.slug} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => onNavigate && onNavigate('blog-post', post.slug)}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ background: `linear-gradient(135deg, ${C.pink}18, ${C.purple}18)`, borderRadius: 8, height: 140, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📝</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, background: '#faf5ff', color: C.purple, padding: '3px 10px', borderRadius: 12 }}>{post.category}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{post.readTime}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>{post.title}</h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{post.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Site Footer ──────────────────────────────────────────────────────────────
function SiteFooter({ onNavigate, onSignup }) {
  const navLinks = [
    ['home','Home'],['pricing','Pricing'],['compare','Compare'],
    ['blog','Blog'],['resources','Resources'],['contact','Contact'],
    ['privacy','Privacy Policy'],['terms','Terms'],
  ]
  return (
    <footer style={{ background: C.navy, padding: '52px 20px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, marginBottom: 44 }}>
          <div>
            <LogoMark />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 14, lineHeight: 1.7, maxWidth: 240 }}>
              Built by tradespeople, for tradespeople. The UK's appointment reminder service.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Navigation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {navLinks.map(([k, l]) => (
                k === 'privacy'
                  ? <a key={k} href="/privacy" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'left', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.85)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l}</a>
                  : <button key={k} onClick={() => onNavigate && onNavigate(k)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.85)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Trades</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['trade-window-cleaning','Window Cleaners'],['trade-plumbing','Plumbers'],['trade-electrical','Electricians'],['trade-gardening','Gardeners'],['trade-hairdressing','Hairdressers']].map(([k, l]) => (
                <button key={k} onClick={() => onNavigate && onNavigate(k)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.85)'}
                  onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Get started</div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Free tier available. No credit card required.</p>
            <button className="btn-primary" onClick={onSignup} style={{ fontSize: 13, padding: '10px 20px' }}>Start free today</button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>&copy; {new Date().getFullYear()} TextReminder. All rights reserved. Built by tradespeople, for tradespeople.</p>
          <button onClick={() => onNavigate && onNavigate('compare')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>Compare us to Remindlo →</button>
        </div>
      </div>
    </footer>
  )
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
// AI CHAT WIDGET
// ═════════════════════════════════════════════════════════════════════════════
function AiChat() {
  const [open, setOpen]       = useState(false)
  const [visible, setVisible] = useState(false)
  const [msgs, setMsgs]       = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef             = useRef(null)

  const ELLIE_PHOTO = '/ellie.jpeg'
  const pink   = '#ec4899'
  const purple = '#a855f7'
  const grad   = `linear-gradient(135deg, ${pink}, ${purple})`

  const QUICK_REPLIES = ['How does it work?', 'What does it cost?', 'Will my customers read it?', 'Get started']

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 8000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (open && !started) {
      setStarted(true)
      setMsgs([{ role: 'assistant', content: "Hi! I'm Ellie 👋 I help tradespeople stop losing jobs to no-shows. What can I help you with today?", quickReplies: true }])
    }
  }, [open, started])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  async function send(text) {
    const t = (text || input).trim()
    if (!t || loading) return
    const cleanMsgs = [...msgs.filter(m => !m.quickReplies || m !== msgs[msgs.length - 1]), { role: 'user', content: t }]
      .map(m => ({ role: m.role, content: m.content }))
    setMsgs(cleanMsgs)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': window.ANTHROPIC_KEY || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: "You are Ellie, a friendly support assistant for TextReminder — a UK SMS appointment reminder service built specifically for tradespeople (plumbers, electricians, window cleaners, gardeners, hairdressers, etc.). You help tradespeople stop losing jobs to no-shows by sending automatic SMS reminders to their customers before appointments.\n\nKey facts:\n- Free plan: 20 SMS/month, Google Calendar sync, up to 20 contacts\n- Starter: £15/month, 100 SMS\n- Professional: £29/month, 200 SMS (most popular)\n- Business: £55/month, 400 SMS\n- No contracts, cancel any time, UK-based\n- Setup takes about 5 minutes — connect Google Calendar, customise message, done\n- 98% SMS open rate, reduces no-shows by up to 40%\n\nBe warm, concise, and relatable to UK tradespeople. Use casual but professional language. If asked about technical issues, direct them to hello@textreminder.co.uk.",
          messages: cleanMsgs
        })
      })
      const data = await res.json()
      const reply = data.content?.find(b => b.type === 'text')?.text || "Sorry, something went wrong. Email hello@textreminder.co.uk and we'll get back to you."
      setMsgs(p => [...p, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: "Something went wrong. Email hello@textreminder.co.uk and we'll be back to you within 4 hours." }])
    }
    setLoading(false)
  }

  if (!visible) return null

  return (
    <>
      {open && (
        <div style={{ position: 'fixed', bottom: 84, right: 20, zIndex: 1000, width: 340, maxHeight: 480,
          background: '#fff', borderRadius: 18, border: '1px solid #e9d5ff',
          boxShadow: '0 16px 50px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'ellieSlideUp 0.25s ease' }}>
          {/* Header */}
          <div style={{ background: grad, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={ELLIE_PHOTO} alt="Ellie"
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }}
                onError={e => { e.target.style.display = 'none' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Ellie</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>TextReminder Support</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 7 }}>
                  {m.role === 'assistant' && (
                    <img src={ELLIE_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: 2 }}
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <div style={{ maxWidth: '80%', background: m.role === 'user' ? grad : '#f8fafc', color: m.role === 'user' ? '#fff' : '#0f172a',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '9px 13px', fontSize: 13, lineHeight: 1.55, border: m.role === 'assistant' ? '1px solid #f3e8ff' : 'none' }}>
                    {m.content}
                  </div>
                </div>
                {m.quickReplies && i === msgs.length - 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginLeft: 31 }}>
                    {QUICK_REPLIES.map(qr => (
                      <button key={qr} onClick={() => send(qr)}
                        style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: '#fff', border: '1px solid #e9d5ff', borderRadius: 16, cursor: 'pointer', color: purple, fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.target.style.background = '#faf5ff'; e.target.style.borderColor = purple }}
                        onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e9d5ff' }}>
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
                <img src={ELLIE_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }} />
                <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#f8fafc', borderRadius: '14px 14px 14px 4px', border: '1px solid #f3e8ff' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: purple, animation: `ellieTyping 1s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f3e8ff', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = pink} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ background: input.trim() && !loading ? grad : '#e2e8f0', color: input.trim() && !loading ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 10, padding: '8px 16px', cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontWeight: 700, fontSize: 14, transition: 'all 0.2s', fontFamily: 'inherit' }}>→</button>
          </div>
        </div>
      )}
      {/* Bubble */}
      <button onClick={() => setOpen(p => !p)}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, width: 56, height: 56, borderRadius: '50%',
          background: grad, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(168,85,247,0.45)',
          padding: 0, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(168,85,247,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.45)' }}
        title="Chat with Ellie">
        {open
          ? <span style={{ color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>×</span>
          : <img src={ELLIE_PHOTO} alt="Chat with Ellie" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display='none' }} />
        }
      </button>
      <style>{`
        @keyframes ellieSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ellieTyping { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  )
}

function PwaBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem('pwa-banner-dismissed')) return } catch {}
    const t = setTimeout(() => setShow(true), 15000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setShow(false); setDismissed(true)
    try { localStorage.setItem('pwa-banner-dismissed', '1') } catch {}
  }

  if (!show || dismissed) return null

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
      background: C.navy, color: '#fff', borderRadius: 16, padding: '16px 18px',
      maxWidth: 380, width: 'calc(100% - 40px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
      animation: 'slideUp 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Add to your Home Screen</div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '0 0 0 10px', flexShrink: 0 }}><IC.X /></button>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 12 }}>
        TextReminder works like a native app — access it instantly from your home screen.
      </p>
      {isIos ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ marginBottom: 4, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>On iPhone / iPad:</div>
          <div>1. Tap the <strong style={{ color: '#fff' }}>Share</strong> button at the bottom of Safari</div>
          <div>2. Scroll down and tap <strong style={{ color: '#fff' }}>Add to Home Screen</strong></div>
          <div>3. Tap <strong style={{ color: '#fff' }}>Add</strong> — done</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ marginBottom: 4, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>On Android:</div>
          <div>1. Tap the <strong style={{ color: '#fff' }}>three-dot menu</strong> in Chrome</div>
          <div>2. Tap <strong style={{ color: '#fff' }}>Add to Home screen</strong></div>
          <div>3. Tap <strong style={{ color: '#fff' }}>Add</strong> — done</div>
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: COMPARISON
// ═════════════════════════════════════════════════════════════════════════════
function ComparePage({ onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-block', background: '#faf5ff', color: C.purple, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>COMPARISON</div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.2 }}>TextReminder vs Remindlo — Which is Better for UK Trades?</h1>
          <p style={{ color: C.muted, fontSize: 17, marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
            At £29/month you get 200 texts. Remindlo charges £49 for 250. Why pay more?
          </p>
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: 'auto', marginBottom: 48 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.navy }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 13 }}>Feature</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', color: C.pink, fontWeight: 800, fontSize: 15 }}>TextReminder</th>
                <th style={{ padding: '14px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 13 }}>Remindlo</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Free tier', '20 SMS', '10 SMS'],
                ['Entry paid plan', '£15 — 100 SMS', '£19 — 75 SMS'],
                ['Mid tier', '£29 — 200 SMS', '£49 — 250 SMS'],
                ['Built for UK trades', '✅', '❌'],
                ['Built by a tradesperson', '✅', '❌'],
                ['Two-way SMS', '✅ Coming soon', '❌'],
                ['Add to home screen', '✅', '❌'],
              ].map(([feat, us, them], i) => (
                <tr key={feat} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 20px', fontWeight: 500 }}>{feat}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: us.startsWith('✅') ? C.success : C.text }}>{us}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'center', color: them === '❌' ? C.error : C.muted }}>{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ textAlign: 'center', background: `linear-gradient(135deg, ${C.pink}10, ${C.purple}10)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 24px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Start Free Today — No Card Needed</h2>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 15 }}>Free to start. Cancel any time. Built for UK tradespeople.</p>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '14px 32px', fontSize: 16 }}>Start Free Today</button>
        </div>
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: BLOG LIST
// ═════════════════════════════════════════════════════════════════════════════
function BlogPage({ onSignup, onNavigate }) {
  const categories = ['All', ...Array.from(new Set(BLOG_POSTS.map(p => p.category)))]
  const [cat, setCat] = useState('All')
  const filtered = cat === 'All' ? BLOG_POSTS : BLOG_POSTS.filter(p => p.category === cat)
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>The Trades Blog</h1>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 10 }}>Tips, guides and insights for UK tradespeople</p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCat(c)} className={`pill${cat === c ? ' pill-active' : ''}`}>{c}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>No posts in this category yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filtered.map(post => (
              <div key={post.slug} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => onNavigate('blog-post', post.slug)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ background: `linear-gradient(135deg, ${C.pink}18, ${C.purple}18)`, borderRadius: 8, height: 160, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📝</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, background: '#faf5ff', color: C.purple, padding: '3px 10px', borderRadius: 12 }}>{post.category}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{post.readTime}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
             
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: '12px 0 8px', lineHeight: 1.4 }}>{post.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ─── ROI Calculator Section ───────────────────────────────────────────────────
function RoiSection({ onSignup }) {
  const [jobs, setJobs] = useState(20)
  const [val,  setVal]  = useState(150)
  const [rate, setRate] = useState(15)

  const jobsLostYear  = Math.round(jobs * 52 * (rate / 100))
  const recovered     = Math.round(jobsLostYear * 0.8)
  const extraRevenue  = recovered * val
  const planCost      = extraRevenue > 10000 ? 348 : extraRevenue > 4000 ? 180 : 0
  const planName      = extraRevenue > 10000 ? 'Professional (£29/mo)' : extraRevenue > 4000 ? 'Starter (£15/mo)' : 'Free plan'
  const netGain       = extraRevenue - planCost
  const fmt           = n => '£' + n.toLocaleString('en-GB')

  return (
    <section id="roi-calculator" style={{ background: '#faf5ff', padding: '88px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', background: '#faf5ff', color: C.purple, fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, marginBottom: 14, border: `1px solid #e9d5ff` }}>ROI Calculator</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 12 }}>How much are no-shows costing you?</h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: '0 auto' }}>Enter your numbers to see what you could get back.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24, alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(168,85,247,0.08)', border: '1px solid #f3e8ff' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 24 }}>Your numbers</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Jobs per week</label>
              <input type="number" min={1} max={200} value={jobs}
                onChange={e => setJobs(Math.max(1, parseInt(e.target.value) || 1))}
                className="inp" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 8 }}>Average job value (£)</label>
              <input type="number" min={1} max={5000} value={val}
                onChange={e => setVal(Math.max(1, parseInt(e.target.value) || 1))}
                className="inp" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.muted, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                No-show rate <span style={{ color: C.purple, fontWeight: 700 }}>{rate}%</span>
              </label>
              <input type="range" min={1} max={40} value={rate}
                onChange={e => setRate(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: C.purple }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mutedLight, marginTop: 4 }}>
                <span>Low (1%)</span><span>High (40%)</span>
              </div>
            </div>
          </div>
          {/* Results */}
          <div style={{ background: `linear-gradient(135deg,${C.purple},${C.pink})`, borderRadius: 20, padding: 32, color: '#fff' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, opacity: 0.9 }}>Your results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['No-shows per year',      jobsLostYear],
                ['Jobs recovered (80%)',   recovered],
                ['Revenue recovered',      fmt(extraRevenue)],
                [`TextReminder (${planName})`, planCost === 0 ? 'Free' : '-' + fmt(planCost) + '/yr'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: 14, opacity: 0.85 }}>{label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{value}</span>
                </div>
              ))}
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Additional revenue</span>
                <span style={{ fontSize: 28, fontWeight: 800 }}>{fmt(netGain)}</span>
              </div>
            </div>
            <button onClick={onSignup} style={{ width: '100%', marginTop: 24, background: '#fff', color: C.purple, border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Start free — no card needed
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// PAGE: ROI CALCULATOR
function RoiCalculatorPage({ onLogin, onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={onLogin} onSignup={onSignup} onNavigate={onNavigate} />
      <RoiSection onSignup={onSignup} />
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// PAGE: PRICING
function PricingPage({ onLogin, onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={onLogin} onSignup={onSignup} onNavigate={onNavigate} />
      <PricingSection onSignup={onSignup} />
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// PAGE: BLOG POST
function BlogPostPage({ slug, onSignup, onNavigate }) {
  const post = BLOG_POSTS.find(p => p.slug === slug)
  if (!post) return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 700, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 20 }}>Post not found</h1>
        <button onClick={() => onNavigate('blog')} className="btn-primary">Back to Blog</button>
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '52px 20px 80px' }}>
        <button onClick={() => onNavigate('blog')} style={{ fontSize: 13, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontWeight: 600 }}>
          &larr; All Posts
        </button>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#faf5ff', color: C.purple, padding: '3px 12px', borderRadius: 12 }}>{post.category}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{post.readTime}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, color: C.text, lineHeight: 1.2, marginBottom: 28, letterSpacing: '-0.5px' }}>{post.title}</h1>
        <div style={{ background: `linear-gradient(135deg,${C.pink}18,${C.purple}18)`, borderRadius: 12, height: 200, marginBottom: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>📝</div>
        <div style={{ fontSize: 16, color: C.text, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{post.content}</div>
        <div style={{ marginTop: 52, padding: 32, background: `linear-gradient(135deg,${C.pink}08,${C.purple}08)`, border: `1px solid ${C.border}`, borderRadius: 14, textAlign: 'center' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Ready to stop losing jobs?</h3>
          <p style={{ color: C.muted, marginBottom: 20 }}>Start free — no card needed.</p>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '12px 28px', fontSize: 15 }}>Start Free Today</button>
        </div>
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ─── Page component imports ───────────────────────────────────────────────────
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import DashboardPage  from './pages/Dashboard.jsx'
import UpcomingPage   from './pages/Upcoming.jsx'
import SettingsPage   from './pages/Settings.jsx'
import ContactsPage   from './pages/Contacts.jsx'
import MessageLogPage from './pages/MessageLog.jsx'
import LoginPage      from './pages/Login.jsx'
import SignupPage     from './pages/Signup.jsx'

// ─── App shell (logged-in layout with AppNav) ─────────────────────────────────
function AppShell({ user, onLogout, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const raw = location.pathname.replace(/^\//, '') || 'dashboard'
  const page = raw === 'log' ? 'message-log' : raw

  function setPage(key) {
    const map = { upcoming: '/upcoming', settings: '/settings', contacts: '/contacts', upgrade: '/pricing' }
    navigate(map[key] || '/upcoming')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      <AppNav page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px 20px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
function RequireAuth({ user, loading, children }) {
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: C.muted }}>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─── Blog post route (reads :slug param) ──────────────────────────────────────
function BlogPostRoute(props) {
  const { slug } = useParams()
  return <BlogPostPage slug={slug} {...props} />
}

// ─── AppRouter (must live inside BrowserRouter to use useNavigate) ────────────
function AppRouter({ user, loading, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  // After Google OAuth, user lands at '/' — redirect to dashboard
  useEffect(() => {
    if (!loading && user && ['/', '/login', '/signup'].includes(location.pathname)) {
      navigate('/upcoming', { replace: true })
    }
  }, [user, loading, location.pathname])

  function nav(page, slug) {
    const map = {
      home: '/', pricing: '/pricing', 'roi-calculator': '/roi-calculator', blog: '/blog', compare: '/compare',
      'blog-post': `/blog/${slug || ''}`, resources: '/',
      'auth-login': '/login', 'auth-signup': '/signup',
      upcoming: '/upcoming', settings: '/settings',
      contacts: '/contacts', upgrade: '/pricing',
      'window-cleaners': '/window-cleaners', plumbers: '/plumbers',
      electricians: '/electricians', gardeners: '/gardeners', hairdressers: '/hairdressers',
    }
    navigate(map[page] || '/')
  }

  const pub = { onLogin: () => navigate('/login'), onSignup: () => navigate('/signup'), onNavigate: nav }

  function shell(comp) {
    return (
      <RequireAuth user={user} loading={loading}>
        <AppShell user={user} onLogout={onLogout}>{comp}</AppShell>
      </RequireAuth>
    )
  }

  return (
    <Routes>
      <Route path="/"                element={<HomePage {...pub} />} />
      <Route path="/pricing"         element={<PricingPage {...pub} />} />
      <Route path="/roi-calculator"  element={<RoiCalculatorPage {...pub} />} />
      <Route path="/blog"            element={<BlogPage   {...pub} />} />
      <Route path="/blog/:slug"      element={<BlogPostRoute {...pub} />} />
      <Route path="/compare"         element={<ComparePage {...pub} />} />
      <Route path="/window-cleaners" element={<HomePage {...pub} />} />
      <Route path="/plumbers"        element={<HomePage {...pub} />} />
      <Route path="/electricians"    element={<HomePage {...pub} />} />
      <Route path="/gardeners"       element={<HomePage {...pub} />} />
      <Route path="/hairdressers"    element={<HomePage {...pub} />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/upcoming"        element={shell(<UpcomingPage />)} />
      <Route path="/settings"        element={shell(<SettingsPage />)} />
      <Route path="/contacts"        element={shell(<ContactsPage />)} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return ()=> subscription.unsubscribe()
  }, [])

  async function onLogout() { await supabase.auth.signOut() }

  return (
    <BrowserRouter>
      <AppRouter user={user} loading={loading} onLogout={onLogout} />
    </BrowserRouter>
  )
}
