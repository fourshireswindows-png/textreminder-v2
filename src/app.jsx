/*
 * TextReminder — src/App.jsx  (rebuilt: top nav, mobile-first) v2
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
    features: ['100 SMS reminders/month','Google Calendar sync','Up to 5 reminder schedules per appointment','3 customisable message templates','Multiple phone numbers per appointment','Unlimited contacts','Full message log','Manual & recurring appointments'] },
  { id: 'professional', name: 'Professional', price: 29,  annualPrice: 290,  reminders: 200,  popular: true,
    features: ['200 SMS reminders/month','Google Calendar sync','Up to 5 reminder schedules per appointment','3 customisable message templates','Multiple phone numbers per appointment','Unlimited contacts','Full message log','Manual & recurring appointments'] },
  { id: 'business',     name: 'Business',     price: 55,  annualPrice: 550,  reminders: 400,  popular: false,
    features: ['400 SMS reminders/month','Google Calendar sync','Up to 5 reminder schedules per appointment','3 customisable message templates','Multiple phone numbers per appointment','Unlimited contacts','Full message log','Manual & recurring appointments'] },
  { id: 'enterprise',   name: 'Enterprise',   price: 249, annualPrice: 2490, reminders: 2000, popular: false,
    features: ['2,000 SMS reminders/month','Google Calendar sync','Up to 5 reminder schedules per appointment','3 customisable message templates','Multiple phone numbers per appointment','Unlimited contacts','Full message log','Manual & recurring appointments'] },
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
        <button onClick={() => navigate('upcoming')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px 0 0', marginRight: 8, flexShrink: 0 }}>
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
    const t = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (open && !started) {
      setStarted(true)
      setMsgs([{ role: 'assistant', content: "Hi, I'm Ellie! 👋 I'm the TextReminder assistant. I help tradespeople stop losing jobs to no-shows. What can I help you with today?", quickReplies: true }])
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
      const res = await fetch('https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO' },
        body: JSON.stringify({ messages: cleanMsgs })
      })
      const data = await res.json()
      const reply = data.reply || "Sorry, something went wrong. Email hello@textreminder.co.uk and we'll get back to you."
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
        <div style={{ position: 'fixed', bottom: 84, right: 20, zIndex: 1000, width: 'min(340px, calc(100vw - 32px))', maxHeight: 480,
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
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {!open && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#ec4899,#a855f7)', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(168,85,247,0.35)' }}>AI Assistant</span>}
      <button onClick={() => setOpen(p => !p)}
        style={{ width: 56, height: 56, borderRadius: '50%',
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
      </div>
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
function PricingPage() {
  useEffect(() => { window.location.replace('/#pricing') }, [])
  return null
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
import UpcomingPage    from './pages/Upcoming.jsx'
import SettingsPage    from './pages/Settings.jsx'
import ContactsPage    from './pages/Contacts.jsx'
import MessageLogPage  from './pages/MessageLog.jsx'
import LoginPage       from './pages/Login.jsx'
import SignupPage      from './pages/Signup.jsx'
import AuthCallback    from './pages/AuthCallback.jsx'
import HomePage        from './pages/Home.jsx'
import WindowCleaners  from './pages/trades/WindowCleaners.jsx'
import GutterCleaners  from './pages/trades/GutterCleaners.jsx'
import PressureWashing from './pages/trades/PressureWashing.jsx'
import RoofCleaning    from './pages/trades/RoofCleaning.jsx'
import SolarPanels     from './pages/trades/SolarPanels.jsx'
import CommercialExterior from './pages/trades/CommercialExterior.jsx'
import PrivacyPage        from './pages/Privacy.jsx'

// ─── App shell (logged-in layout with AppNav) ─────────────────────────────────
function AppShell({ user, onLogout, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const raw = location.pathname.replace(/^\//, '') || 'upcoming'
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

  // After Google OAuth, user lands at '/' — redirect to upcoming
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

  // Only show Ellie on public pages (not logged-in app)
  const isPublicPage = !user && !['upcoming','settings','contacts','log'].some(p => location.pathname.includes(p))

  return (
    <>
    {isPublicPage && <AiChat />}
    <Routes>
      <Route path="/"                          element={<HomePage onSignup={pub.onSignup} />} />
      <Route path="/pricing"                   element={<PricingPage {...pub} />} />
      <Route path="/blog"                      element={<BlogPage   {...pub} />} />
      <Route path="/blog/:slug"                element={<BlogPostRoute {...pub} />} />
      <Route path="/compare"                   element={<ComparePage {...pub} />} />
      <Route path="/window-cleaners"           element={<WindowCleaners onSignup={pub.onSignup} />} />
      <Route path="/gutter-cleaners"           element={<GutterCleaners onSignup={pub.onSignup} />} />
      <Route path="/pressure-washing"          element={<PressureWashing onSignup={pub.onSignup} />} />
      <Route path="/roof-cleaning"             element={<RoofCleaning onSignup={pub.onSignup} />} />
      <Route path="/solar-panel-cleaning"      element={<SolarPanels onSignup={pub.onSignup} />} />
      <Route path="/commercial-exterior-cleaning" element={<CommercialExterior onSignup={pub.onSignup} />} />
      {/* Legacy redirects */}
      <Route path="/plumbers"        element={<Navigate to="/" replace />} />
      <Route path="/electricians"    element={<Navigate to="/" replace />} />
      <Route path="/gardeners"       element={<Navigate to="/" replace />} />
      <Route path="/hairdressers"    element={<Navigate to="/" replace />} />
      <Route path="/roi-calculator"  element={<Navigate to="/" replace />} />
      <Route path="/privacy"          element={<PrivacyPage />} />
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/auth/callback"   element={<AuthCallback />} />
      <Route path="/upcoming"        element={shell(<UpcomingPage />)} />
      <Route path="/settings"        element={shell(<SettingsPage />)} />
      <Route path="/contacts"        element={shell(<ContactsPage />)} />
      <Route path="/log"             element={shell(<MessageLogPage />)} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  async function onLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <BrowserRouter>
      <GlobalStyles />
      <AppRouter user={user} loading={loading} onLogout={onLogout} />
    </BrowserRouter>
  )
}
