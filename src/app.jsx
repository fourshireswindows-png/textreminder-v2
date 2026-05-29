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
import AiChat from './components/AiChat.jsx'

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

      .inp {
        width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px;
        padding: 10px 14px; font-size: 14px; background: #fff; color: #0f172a; outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .inp:focus { border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236,72,153,0.08); }
      .inp::placeholder { color: #94a3b8; }
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
          {[['pricing','Pricing'],['blog','Blog'],['compare','Compare'],['resources','Resources']].map(([k,l]) => (
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
  { key: 'dashboard',   label: 'Dashboard', Ic: IC.Grid },
  { key: 'upcoming',    label: 'Upcoming',  Ic: IC.Calendar },
  { key: 'contacts',    label: 'Contacts',  Ic: IC.Users },
  { key: 'message-log', label: 'Messages',  Ic: IC.Msg },
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
                  {plan.price === 0 ? 'Get started free' : 'Start free trial'}
                </button>
              </div>
            )
          })}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 24 }}>14-day free trial on all paid plans — no credit card required</p>
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

It takes about 5 minutes to set up. No contract. No credit card for the free trial. Just connect your calendar, customise your message, and let it run.

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
                <button key={k} onClick={() => onNavigate && onNavigate(k)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'color 0.15s' }}
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
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>14-day free trial. No credit card required.</p>
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

  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 999,
      background: C.navy, color: '#fff', borderRadius: 14, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 420, width: 'calc(100% - 40px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
      animation: 'slideUp 0.3s ease' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>📱</span>
      <span style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>Add TextReminder to your home screen — works like an app, completely free</span>
      <button onClick={dismiss} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>Dismiss</button>
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
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 15 }}>14-day free trial. Cancel any time. Built for UK tradespeople.</p>
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
                <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4, marginBottom: 10 }}>{post.title}</h2>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{post.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: BLOG POST
// ═════════════════════════════════════════════════════════════════════════════
function BlogPostPage({ slug, onSignup, onNavigate }) {
  const post = BLOG_POSTS.find(p => p.slug === slug)
  useEffect(() => { window.scrollTo(0, 0) }, [slug])
  if (!post) return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Post not found</h1>
        <button className="btn-primary" onClick={() => onNavigate('blog')} style={{ marginTop: 20 }}>Back to Blog</button>
      </div>
    </div>
  )

  const paragraphs = post.content.trim().split('\n\n').filter(Boolean)

  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 20px 80px' }}>
        <button className="btn-ghost" onClick={() => onNavigate('blog')} style={{ marginBottom: 24, color: C.muted, fontSize: 13 }}>← Back to Blog</button>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, background: '#faf5ff', color: C.purple, padding: '4px 12px', borderRadius: 12 }}>{post.category}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{post.readTime}</span>
          <span style={{ fontSize: 12, color: C.muted }}>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.8px', marginBottom: 32 }}>{post.title}</h1>
        <div style={{ fontSize: 16, lineHeight: 1.8, color: '#1e293b' }}>
          {paragraphs.map((para, i) => {
            if (para.startsWith('**') && para.endsWith('**')) {
              return <h2 key={i} style={{ fontSize: 20, fontWeight: 700, margin: '32px 0 12px', letterSpacing: '-0.3px' }}>{para.replace(/\*\*/g, '')}</h2>
            }
            if (para.startsWith('*') && para.endsWith('*')) {
              return <blockquote key={i} style={{ borderLeft: `3px solid ${C.pink}`, paddingLeft: 20, margin: '24px 0', color: C.muted, fontStyle: 'italic' }}>{para.replace(/\*/g, '')}</blockquote>
            }
            return <p key={i} style={{ marginBottom: 20 }}>{para}</p>
          })}
        </div>
        <div style={{ marginTop: 52, background: `linear-gradient(135deg, ${C.pink}10, ${C.purple}10)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Ready to stop losing jobs to no-shows?</h3>
          <p style={{ color: C.muted, marginBottom: 20, fontSize: 14 }}>Start your free 14-day trial — no credit card needed.</p>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '13px 28px', fontSize: 15 }}>Start Free Today</button>
        </div>
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ─── Trade page data ──────────────────────────────────────────────────────────
const TRADE_PAGES = {
  'trade-window-cleaning': {
    trade: 'Window Cleaners', emoji: '🪟',
    headline: 'SMS Appointment Reminders for Window Cleaners',
    pain: 'Tired of turning up to empty houses? Window cleaners lose hundreds every month to customers who simply forgot. A simple text the day before fixes that.',
    points: ['Customers forget when they booked — a reminder fixes it','No-shows cost you fuel, time, and money','Your Google Calendar already has everything TextReminder needs'],
  },
  'trade-plumbing': {
    trade: 'Plumbers', emoji: '🔧',
    headline: 'SMS Appointment Reminders for Plumbers',
    pain: 'Emergency callouts and routine jobs both suffer from no-shows. Keep your diary full and your customers informed with automatic SMS reminders.',
    points: ['Remind customers before planned maintenance visits','Reduce wasted callouts to empty properties','Works with your existing Google Calendar'],
  },
  'trade-electrical': {
    trade: 'Electricians', emoji: '⚡',
    headline: 'SMS Appointment Reminders for Electricians',
    pain: 'Whether it\'s a rewire, inspection, or fault-finding job, no-shows disrupt your whole day. Automated reminders keep your schedule running smoothly.',
    points: ['Send reminders for all booked electrical work','Customers confirm or reschedule with plenty of notice','Sync directly with Google Calendar in minutes'],
  },
  'trade-gardening': {
    trade: 'Gardeners', emoji: '🌱',
    headline: 'SMS Appointment Reminders for Gardeners',
    pain: 'Seasonal garden maintenance relies on regular customers turning up. Don\'t let a forgotten appointment disrupt your round.',
    points: ['Remind regular customers of their upcoming garden visits','Works perfectly for weekly, fortnightly, or monthly rounds','Fully automatic once your calendar is connected'],
  },
  'trade-decorating': {
    trade: 'Decorators', emoji: '🎨',
    headline: 'SMS Appointment Reminders for Decorators',
    pain: 'Painting and decorating jobs often depend on customers being home to let you in. A reminder the day before means no wasted journeys.',
    points: ['Ensure customers are home and ready for you to start','Reduce costly delays and wasted prep time','Simple setup, fully automatic reminders'],
  },
  'trade-cleaning': {
    trade: 'Cleaners', emoji: '🧹',
    headline: 'SMS Appointment Reminders for Cleaners',
    pain: 'Regular cleaning rounds live and die by consistency. Keep customers on track and your diary full with automatic appointment reminders.',
    points: ['Perfect for weekly and fortnightly cleaning rounds','Customers reply to cancel or reschedule in advance','Replaces expensive booking software for most small businesses'],
  },
  'trade-hairdressing': {
    trade: 'Hairdressers', emoji: '✂️',
    headline: 'SMS Appointment Reminders for Hairdressers',
    pain: 'Empty chairs cost money. A reminder text 24 hours before keeps clients showing up and gives you time to fill last-minute gaps.',
    points: ['Reduce no-shows in your appointment book','Give clients the chance to cancel with notice so you can rebook','Works for salons and mobile hairdressers'],
  },
  'trade-mot-garages': {
    trade: 'MOT Garages', emoji: '🚗',
    headline: 'SMS Appointment Reminders for MOT Garages',
    pain: 'MOT slots are valuable and hard to fill at short notice. Automated reminders mean fewer missed bookings and a busier workshop.',
    points: ['Remind customers of upcoming MOT and service bookings','Reduce last-minute slot wastage','Connects with Google Calendar in under 5 minutes'],
  },
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: TRADE LANDING
// ═════════════════════════════════════════════════════════════════════════════
function TradePage({ tradeKey, onSignup, onNavigate }) {
  const data = TRADE_PAGES[tradeKey]
  useEffect(() => { window.scrollTo(0, 0) }, [tradeKey])
  if (!data) return null
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      {/* Hero */}
      <section style={{ background: C.navy, padding: '80px 20px 100px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>{data.emoji}</div>
          <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 50px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-1.2px', marginBottom: 20 }}>
            {data.headline}
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 36px' }}>{data.pain}</p>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '14px 32px', fontSize: 16 }}>Start Free — No Card Needed</button>
        </div>
      </section>
      {/* Why it works */}
      <section style={{ padding: '72px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, textAlign: 'center', letterSpacing: '-0.5px' }}>Why {data.trade} love TextReminder</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {data.points.map((pt, i) => (
              <div key={i} className="card">
                <div style={{ width: 36, height: 36, background: `${C.pink}18`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pink, fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{i + 1}</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: C.text }}>{pt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Pricing */}
      <PricingSection onSignup={onSignup} />
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: RESOURCES
// ═════════════════════════════════════════════════════════════════════════════
function ResourcesPage({ onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px 80px' }}>
        <div style={{ marginBottom: 52 }}>
          <div style={{ display: 'inline-block', background: '#faf5ff', color: C.purple, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginBottom: 14 }}>RESOURCES</div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>The Trades Library</h1>
          <p style={{ color: C.muted, fontSize: 16, marginTop: 10 }}>Guides, articles, and recommended reading for UK tradespeople</p>
        </div>
        {/* Blog articles */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.4px' }}>Latest Articles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {BLOG_POSTS.map(post => (
              <div key={post.slug} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => onNavigate('blog-post', post.slug)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ fontSize: 11, fontWeight: 600, background: '#faf5ff', color: C.purple, padding: '3px 10px', borderRadius: 12, display: 'inline-block', marginBottom: 10 }}>{post.category}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>{post.title}</h3>
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{post.excerpt}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Recommended reading */}
        <div style={{ marginBottom: 52 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.4px' }}>Recommended Reading</h2>
          <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>Books worth reading if you run a trades business in the UK.</p>
          <div style={{ background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 12, padding: '32px 24px', textAlign: 'center', color: C.muted }}>
            <p style={{ fontSize: 15 }}>📚 Recommended books coming soon</p>
          </div>
        </div>
        {/* CTA */}
        <div style={{ background: `linear-gradient(135deg, ${C.pink}10, ${C.purple}10)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Ready to reduce no-shows?</h3>
          <p style={{ color: C.muted, marginBottom: 24, fontSize: 15 }}>Start your free 14-day trial — no credit card needed.</p>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '13px 28px', fontSize: 15 }}>Start Free Today</button>
        </div>
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: PRICING (standalone)
// ═════════════════════════════════════════════════════════════════════════════
function PricingPage({ onSignup, onNavigate }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={() => onNavigate('auth-login')} onSignup={onSignup} onNavigate={onNavigate} />
      <div style={{ paddingTop: 40 }}>
        <PricingSection onSignup={onSignup} />
      </div>
      <SiteFooter onNavigate={onNavigate} onSignup={onSignup} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: AUTH
// ═════════════════════════════════════════════════════════════════════════════
function AuthPage({ mode, setMode, onAuthSuccess, onNavigate }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (result.error) { setError(result.error.message); return }
      if (mode === 'signup' && !result.data.session) { setError('Check your email to confirm your account, then log in.'); return }
      onAuthSuccess(result.data.session?.user)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', flexDirection: 'column' }}>
      <PublicNav onLogin={() => setMode('login')} onSignup={() => setMode('signup')} onNavigate={onNavigate} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="card slide-up" style={{ width: '100%', maxWidth: 430 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 18px', background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><IC.Bell /></div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 7 }}>{mode === 'login' ? 'Log in to your TextReminder account' : 'Send your first reminder in under 5 minutes'}</p>
          </div>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: C.error, display: 'flex', gap: 8 }}>
              <IC.Alert />{error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Email address</label>
              <input className="inp" type="email" placeholder="you@yourcompany.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label className="lbl">Password</label>
              <input className="inp" type="password" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
              {loading ? <Spinner /> : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 13, color: C.muted }}>or</span><div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <button className="btn-secondary" onClick={handleGoogle} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 12 }}>
            <IC.Google />Continue with Google
          </button>
          <p style={{ textAlign: 'center', fontSize: 14, color: C.muted, marginTop: 22 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ color: C.pink, fontWeight: 600, cursor: 'pointer' }}>
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
function Dashboard({ user, setPage, showToast }) {
  const [stats,   setStats]   = useState({ sent: 0, pending: 0, contacts: 0, rate: 100 })
  const [recent,  setRecent]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'sent'),
        supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('reminders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
      ])
      const sent  = r1.count || 0
      const failed = (r4.data || []).filter(x => x.status === 'failed').length
      const total  = sent + failed
      setStats({ sent, pending: r2.count || 0, contacts: r3.count || 0, rate: total > 0 ? Math.round((sent / total) * 100) : 100 })
      setRecent(r4.data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Dashboard</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{today}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Reminders sent', value: stats.sent,        Ic: IC.Msg,   color: C.pink },
          { label: 'Scheduled',      value: stats.pending,     Ic: IC.Clock, color: C.warning },
          { label: 'Contacts',       value: stats.contacts,    Ic: IC.Users, color: C.purple },
          { label: 'Delivery rate',  value: `${stats.rate}%`,  Ic: IC.Trend, color: C.success },
        ].map(({ label, value, Ic, color }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, background: `${color}14`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}><Ic /></div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.8px' }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent reminders */}
      <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Recent reminders</h2>
          <button className="btn-ghost" onClick={() => setPage('message-log')} style={{ fontSize: 13, color: C.muted }}>View all <IC.ChevRight /></button>
        </div>
        {loading ? (
          <div style={{ padding: '24px 20px', color: C.muted, fontSize: 14 }}>Loading...</div>
        ) : recent.length === 0 ? (
          <EmptyState icon={IC.Msg} title="No reminders yet" sub="Add contacts and connect your calendar to get started." action="Add your first contact" onAction={() => setPage('contacts')} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Contact</th><th>Message</th><th className="hide-mobile">Scheduled</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.contact_name}</td>
                    <td style={{ color: C.muted, maxWidth: 220 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.message}</div></td>
                    <td className="hide-mobile" style={{ color: C.muted, whiteSpace: 'nowrap' }}>{fmtDT(r.scheduled_for)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { Ic: IC.Users,    title: 'Manage contacts',   sub: 'Add or remove clients',     page: 'contacts', color: C.purple },
          { Ic: IC.Calendar, title: 'Connect calendar',  sub: 'Sync Google Calendar',       page: 'settings', color: C.pink },
          { Ic: IC.Msg,      title: 'Edit SMS template', sub: 'Customise your message',     page: 'settings', color: '#06b6d4' },
        ].map(({ Ic, title, sub, page: pg, color }) => (
          <div key={title} onClick={() => setPage(pg)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = color }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = C.border }}>
            <div style={{ width: 38, height: 38, background: `${color}14`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}><Ic /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
            </div>
            <IC.ChevRight />
          </div>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: UPCOMING
// ═════════════════════════════════════════════════════════════════════════════
function Upcoming({ user, setPage }) {
  const [events,       setEvents]       = useState([])
  const [calConnected, setCalConnected] = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [syncing,      setSyncing]      = useState(false)
  const [lastSynced,   setLastSynced]   = useState(null)
  const [weekOffset,   setWeekOffset]   = useState(0)
  const [dayOffset,    setDayOffset]    = useState(0)
  const [editingPhone, setEditingPhone] = useState(null)
  const [phoneVal,     setPhoneVal]     = useState('')
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function loadEvents(authUser) {
    const [{ data: evs }, { data: settings }] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('user_id', authUser.id).order('start_time').limit(200),
      supabase.from('settings').select('google_calendar_connected').eq('user_id', authUser.id).single(),
    ])
    setEvents(evs || [])
    setCalConnected(settings?.google_calendar_connected || false)
  }

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }
      await loadEvents(authUser)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSync() {
    setSyncing(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      const res = await fetch('https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/sync-google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO' },
        body: JSON.stringify({ user_id: authUser.id }),
      })
      const result = await res.json()
      if (result.success) {
        await loadEvents(authUser)
        setLastSynced(new Date())
      }
    } catch (e) { console.error('Sync failed', e) }
    finally { setSyncing(false) }
  }

  async function savePhone(eventId) {
    await supabase.from('calendar_events').update({ phone: phoneVal }).eq('id', eventId)
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, phone: phoneVal } : e))
    setEditingPhone(null)
    setPhoneVal('')
  }

  function getWeekDays(offset) {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + offset * 7)
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  }

  function getSingleDay(offset) {
    const d = new Date(); d.setDate(d.getDate() + offset); return d
  }

  const weekDays  = getWeekDays(weekOffset)
  const singleDay = getSingleDay(dayOffset)
  const todayStr  = new Date().toDateString()
  const hours     = Array.from({ length: 16 }, (_, i) => i + 6)

  function getEventsForSlot(day, hour) {
    return events.filter(e => {
      const start = new Date(e.start_time)
      return start.toDateString() === day.toDateString() && start.getHours() === hour
    })
  }

  function getEventsForDay(day) {
    return events.filter(e => new Date(e.start_time).toDateString() === day.toDateString())
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  const purple = C.purple; const border = '#e9d5ff'; const green = C.success; const text = C.text

  const AppointmentBlock = ({ ev }) => (
    <div style={{ background: 'linear-gradient(135deg,#f3e8ff,#fdf4ff)', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 7px', marginBottom: 3, borderLeft: `3px solid ${purple}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: text, lineHeight: 1.3 }}>
        {new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {ev.title}
      </div>
      {editingPhone === ev.id ? (
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          <input value={phoneVal} onChange={e => setPhoneVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') savePhone(ev.id); if (e.key === 'Escape') setEditingPhone(null) }}
            placeholder="07700 900123" autoFocus
            style={{ flex: 1, fontSize: 10, padding: '3px 6px', border: `1px solid ${purple}`, borderRadius: 4, outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={() => savePhone(ev.id)} style={{ background: purple, color: '#fff', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
          <button onClick={() => setEditingPhone(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 4, padding: '3px 7px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
        </div>
      ) : (
        <div onClick={() => { setEditingPhone(ev.id); setPhoneVal(ev.phone || '') }}
          style={{ fontSize: 10, color: ev.phone ? green : '#94a3b8', marginTop: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
          📱 {ev.phone || 'Add phone'}
        </div>
      )}
    </div>
  )

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px', marginBottom: 4 }}>Upcoming Appointments</h1>
          <div style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
            {calConnected
              ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: green, display: 'inline-block' }} /> Synced from Google Calendar{lastSynced && <span style={{ color: C.muted, marginLeft: 6 }}>· {lastSynced.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}</>
              : <><span style={{ color: '#f59e0b' }}>⚠</span> No calendar — <span onClick={() => setPage('settings')} style={{ color: purple, fontWeight: 600, cursor: 'pointer' }}>connect in Settings</span></>}
          </div>
        </div>
        {/* Navigation */}
        {isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <button onClick={() => setDayOffset(p => p - 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>←</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: singleDay.toDateString() === todayStr ? purple : text }}>
                {singleDay.toDateString() === todayStr ? 'Today' : singleDay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
            <button onClick={() => setDayOffset(0)} style={{ background: dayOffset === 0 ? '#f3e8ff' : '#fff', border: `1px solid ${dayOffset === 0 ? purple : border}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: dayOffset === 0 ? purple : text, fontFamily: 'inherit' }}>Today</button>
            <button onClick={() => setDayOffset(p => p + 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>→</button>
            {calConnected && <button onClick={handleSync} disabled={syncing} style={{ background: syncing ? '#f3e8ff' : '#fff', border: `1px solid ${syncing ? purple : border}`, borderRadius: 8, padding: '8px 10px', cursor: syncing ? 'default' : 'pointer', fontSize: 11, fontWeight: 600, color: syncing ? purple : text, fontFamily: 'inherit' }}>{syncing ? '⟳' : '⟳'}</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setWeekOffset(p => p - 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>← Prev</button>
            <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset === 0 ? '#f3e8ff' : '#fff', border: `1px solid ${weekOffset === 0 ? purple : border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: weekOffset === 0 ? purple : text, fontFamily: 'inherit' }}>This Week</button>
            <button onClick={() => setWeekOffset(p => p + 1)} style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: text, fontFamily: 'inherit' }}>Next →</button>
            {calConnected && <button onClick={handleSync} disabled={syncing} style={{ background: syncing ? '#f3e8ff' : '#fff', border: `1px solid ${syncing ? purple : border}`, borderRadius: 8, padding: '7px 14px', cursor: syncing ? 'default' : 'pointer', fontSize: 13, fontWeight: 600, color: syncing ? purple : text, fontFamily: 'inherit' }}>{syncing ? '⟳ Syncing…' : '⟳ Sync'}</button>}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading...</div>
      ) : isMobile ? (
        /* ── MOBILE: single day view ── */
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          {hours.map(hour => {
            const slotEvents = getEventsForSlot(singleDay, hour)
            if (slotEvents.length === 0) return (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f8fafc', minHeight: 44 }}>
                <div style={{ width: 56, padding: '10px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>{hour.toString().padStart(2,'0')}:00</div>
                <div style={{ flex: 1 }} />
              </div>
            )
            return (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ width: 56, padding: '10px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9', flexShrink: 0 }}>{hour.toString().padStart(2,'0')}:00</div>
                <div style={{ flex: 1, padding: '4px 8px' }}>{slotEvents.map(ev => <AppointmentBlock key={ev.id} ev={ev} />)}</div>
              </div>
            )
          })}
          {getEventsForDay(singleDay).length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>No appointments today</div>
          )}
        </div>
      ) : (
        /* ── DESKTOP: 7-day grid ── */
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
            <div style={{ padding: '10px 8px' }} />
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === todayStr
              return (
                <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #f1f5f9', background: isToday ? '#fdf4ff' : '#fff' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? purple : C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? purple : text, marginTop: 2 }}>{day.getDate()}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{day.toLocaleDateString('en-GB', { month: 'short' })}</div>
                </div>
              )
            })}
          </div>
          {hours.map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7,1fr)', borderBottom: '1px solid #f8fafc', minHeight: 56 }}>
              <div style={{ padding: '8px 8px 0', fontSize: 11, color: '#94a3b8', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>{hour.toString().padStart(2,'0')}:00</div>
              {weekDays.map((day, di) => {
                const slotEvents = getEventsForSlot(day, hour)
                const isToday = day.toDateString() === todayStr
                return (
                  <div key={di} style={{ borderLeft: '1px solid #f1f5f9', padding: '3px 4px', background: isToday ? '#fefcff' : '#fff', minHeight: 56 }}>
                    {slotEvents.map(ev => <AppointmentBlock key={ev.id} ev={ev} />)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: CONTACTS
// ═════════════════════════════════════════════════════════════════════════════
function Contacts({ user, showToast }) {
  const [contacts, setContacts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [delId,    setDelId]    = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [form,     setForm]     = useState({ name: '', phone: '', email: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('name', { ascending: true })
    setContacts(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('contacts').insert([{ user_id: user.id, ...form }])
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Contact added'); setShowAdd(false); setForm({ name: '', phone: '', email: '', notes: '' }); load()
  }

  async function handleDelete() {
    const { error } = await supabase.from('contacts').delete().eq('id', delId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Contact removed'); setDelId(null); load()
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )
  const delContact = contacts.find(c => c.id === delId)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Contacts</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>{contacts.length} client{contacts.length !== 1 ? 's' : ''} in your list</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><IC.Plus /> Add contact</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input className="inp" placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 380 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '24px 20px', color: C.muted, fontSize: 14 }}>Loading contacts...</div>
         : filtered.length === 0 ? (
          <EmptyState icon={IC.Users}
            title={contacts.length === 0 ? 'No contacts yet' : 'No results found'}
            sub={contacts.length === 0 ? 'Add your first client to start sending reminders.' : 'Try a different search.'}
            action={contacts.length === 0 ? 'Add first contact' : undefined}
            onAction={() => setShowAdd(true)} />
         ) : filtered.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg, ${C.pink}22, ${C.purple}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: C.purple, flexShrink: 0 }}>
              {c.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IC.Phone />{c.phone}</span>
                {c.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>}
              </div>
            </div>
            <button className="btn-ghost" onClick={() => setDelId(c.id)} style={{ color: C.error, padding: 8 }}><IC.Trash /></button>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add contact" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="lbl">Name *</label><input className="inp" placeholder="Jane Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="lbl">Phone number *</label><input className="inp" type="tel" placeholder="+44 7700 900000" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
              <div><label className="lbl">Email (optional)</label><input className="inp" type="email" placeholder="jane@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="lbl">Notes (optional)</label><input className="inp" placeholder="e.g. Prefers morning appointments" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner /> : 'Add contact'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {delId && (
        <Modal title="Remove contact" onClose={() => setDelId(null)} maxWidth={400}>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>Remove <strong>{delContact?.name}</strong>? This cannot be undone.</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Any pending reminders for this contact will be cancelled.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setDelId(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleDelete} style={{ background: C.error }}>Remove contact</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: MESSAGE LOG
// ═════════════════════════════════════════════════════════════════════════════
function MessageLog({ user }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('reminders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setReminders(data || []); setLoading(false)
    }
    load()
  }, [user.id])

  const filtered = reminders.filter(r => {
    const ms = filter === 'all' || r.status === filter
    const mq = !search || r.contact_name.toLowerCase().includes(search.toLowerCase()) || r.message.toLowerCase().includes(search.toLowerCase()) || r.contact_phone.includes(search)
    return ms && mq
  })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Message Log</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Complete history of all reminders</p>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="inp" placeholder="Search contacts, messages, numbers..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300, flex: '1 1 200px' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all','sent','pending','failed','cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`pill${filter === f ? ' pill-active' : ''}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '24px 20px', color: C.muted, fontSize: 14 }}>Loading messages...</div>
         : filtered.length === 0 ? <EmptyState icon={IC.Msg} title="No messages found" sub="Try adjusting your filters." />
         : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 580 }}>
              <thead><tr><th>Contact</th><th className="hide-mobile">Phone</th><th>Message</th><th>Scheduled</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.contact_name}</td>
                    <td className="hide-mobile" style={{ color: C.muted }}>{r.contact_phone}</td>
                    <td><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.muted, maxWidth: 180 }}>{r.message}</div></td>
                    <td style={{ color: C.muted, whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDT(r.scheduled_for)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: 12, color: C.mutedLight, marginTop: 10 }}>Showing {filtered.length} of {reminders.length} total</p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: SETTINGS
// ═════════════════════════════════════════════════════════════════════════════
function SettingsPage({ user, showToast, setPage }) {
  const DEFAULT = { business_name: '', phone_number: '', message_template: 'Hi {name}, reminder from {business}: your appointment is on {date} at {time}. Reply STOP to opt out.', reminder_hours: 24, google_calendar_connected: false, google_calendar_email: '', plan: 'free' }
  const [settings, setSettings] = useState(DEFAULT)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single()
      if (data) setSettings({ ...DEFAULT, ...data })
      setLoading(false)
    }
    load()
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    const { error } = await supabase.from('settings').upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Settings saved')
  }

  function connectCalendar() {
    const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: GOOGLE_REDIRECT, response_type: 'code', scope: GOOGLE_SCOPE, access_type: 'offline', prompt: 'consent', state: user.id })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async function disconnectCalendar() {
    const updated = { ...settings, google_calendar_connected: false, google_calendar_email: '' }
    setSettings(updated)
    await supabase.from('settings').upsert({ user_id: user.id, ...updated, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    showToast('Google Calendar disconnected')
  }

  const TIMING = [1,2,4,12,24,48,72].map(v => ({ value: v, label: v < 24 ? `${v} hour${v > 1 ? 's' : ''} before` : `${v/24} day${v > 24 ? 's' : ''} before` }))

  if (loading) return <div style={{ padding: 40, color: C.muted }}>Loading settings...</div>

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Settings</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Configure your account and reminders</p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Business */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Business details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <div><label className="lbl">Business name</label><input className="inp" placeholder="Your business name" value={settings.business_name} onChange={e => setSettings(s => ({ ...s, business_name: e.target.value }))} /></div>
              <div><label className="lbl">Your phone number</label><input className="inp" type="tel" placeholder="+44 7700 900000" value={settings.phone_number} onChange={e => setSettings(s => ({ ...s, phone_number: e.target.value }))} /></div>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Google Calendar</h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Connect your Google Calendar so TextReminder can read your appointments and schedule reminders automatically.</p>
            {settings.google_calendar_connected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: C.success, flexShrink: 0 }}><IC.Link /></span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>Calendar connected</div>
                    {settings.google_calendar_email && <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>{settings.google_calendar_email}</div>}
                  </div>
                </div>
                <button type="button" className="btn-secondary" onClick={disconnectCalendar} style={{ fontSize: 13, padding: '8px 16px' }}><IC.Unlink /> Disconnect</button>
              </div>
            ) : (
              <button type="button" className="btn-secondary" onClick={connectCalendar} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '11px 20px' }}>
                <IC.Google /> Connect Google Calendar
              </button>
            )}
          </div>

          {/* SMS template */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>SMS template</h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Use <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{name}'}</code>, <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{business}'}</code>, <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{date}'}</code>, <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>{'{time}'}</code> as placeholders.</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {['{name}','{business}','{date}','{time}'].map(v => (
                <button key={v} type="button" onClick={() => setSettings(s => ({ ...s, message_template: s.message_template + v }))}
                  style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>
              ))}
            </div>
            <textarea className="inp" rows={4} value={settings.message_template} onChange={e => setSettings(s => ({ ...s, message_template: e.target.value }))} />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{settings.message_template.length} characters</div>
          </div>

          {/* Reminder timing */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Reminder timing</h2>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>How far in advance should reminders be sent?</p>
            <select className="inp" style={{ maxWidth: 260 }} value={settings.reminder_hours} onChange={e => setSettings(s => ({ ...s, reminder_hours: parseInt(e.target.value) }))}>
              {TIMING.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '11px 28px' }}>{saving ? <Spinner /> : 'Save settings'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: UPGRADE
// ═════════════════════════════════════════════════════════════════════════════
function UpgradePage({ user, showToast }) {
  const [currentPlan, setCurrentPlan] = useState('free')

  useEffect(() => {
    supabase.from('settings').select('plan').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setCurrentPlan(data.plan) })
  }, [user.id])

  async function handleSelect(planId) {
    if (planId === currentPlan) return
    await supabase.from('settings').upsert({ user_id: user.id, plan: planId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setCurrentPlan(planId)
    showToast(`Switched to ${PLANS.find(p => p.id === planId)?.name} plan`)
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Upgrade your plan</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>Scale up as your business grows. No contracts, cancel any time.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          return (
            <div key={plan.id} className="card" style={{ border: plan.popular ? `2px solid ${C.pink}` : isCurrent ? `2px solid ${C.purple}` : `1px solid ${C.border}`, position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.12)' }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              {plan.popular && !isCurrent && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: C.pink, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>MOST POPULAR</div>}
              {isCurrent && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: C.purple, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20 }}>CURRENT PLAN</div>}
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: C.muted, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', marginBottom: 4 }}>
                {plan.price === 0 ? 'Free' : `£${plan.price}`}
                {plan.price > 0 && <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>/mo</span>}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, fontWeight: 500 }}>{plan.reminders} reminders/month</div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                    <span style={{ color: C.success, flexShrink: 0, marginTop: 1 }}><IC.Check /></span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => handleSelect(plan.id)} disabled={isCurrent}
                className={plan.popular && !isCurrent ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'center', padding: 10, opacity: isCurrent ? 0.6 : 1, cursor: isCurrent ? 'default' : 'pointer' }}>
                {isCurrent ? 'Current plan' : plan.price === 0 ? 'Downgrade to Free' : 'Select plan'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR CALLBACK
// ═════════════════════════════════════════════════════════════════════════════
function CalendarCallback({ session }) {
  const [status, setStatus] = useState('processing')
  const [msg, setMsg]       = useState('Connecting your Google Calendar...')

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search)
      const code   = params.get('code')
      const userId = params.get('state')
      if (!code || !userId) { setStatus('error'); setMsg('Invalid callback — missing required parameters.'); return }
      if (!session) { setStatus('error'); setMsg('Not authenticated. Please log in and try again.'); return }
      try {
        const res = await fetch(EDGE_FN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ code, user_id: userId }),
        })
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || err.error || err.details || JSON.stringify(err) || `Server error ${res.status}`) }
        // Mark calendar as connected in settings table
        const data = await res.json().catch(() => ({}))
        await supabase.from('settings').upsert(
          { user_id: userId, google_calendar_connected: true, google_calendar_email: data.email || '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        setStatus('success'); setMsg('Google Calendar connected! Redirecting...')
        setTimeout(() => { window.location.href = '/' }, 2200)
      } catch (err) {
        setStatus('error'); setMsg(err.message || 'Connection failed. Please try again.')
      }
    }
    handle()
  }, [session])

  const iconBg = { processing: '#faf5ff', success: '#dcfce7', error: '#fee2e2' }[status]
  const iconCl = { processing: C.purple, success: C.success, error: C.error }[status]

  return (
    <div style={{ minHeight: '100vh', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card slide-up" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: iconCl }}>
          {status === 'success' ? <IC.Check /> : status === 'error' ? <IC.X /> : <IC.Calendar />}
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          {status === 'processing' ? 'Connecting calendar' : status === 'success' ? 'Calendar connected!' : 'Connection failed'}
        </h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{msg}</p>
        {status === 'error' && <button className="btn-primary" onClick={() => window.location.href = '/'} style={{ marginTop: 20 }}>Back to app</button>}
        {status === 'processing' && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// APP SHELL (authenticated layout)
// ═════════════════════════════════════════════════════════════════════════════
function AppShell({ user, onLogout }) {
  const [page, setPage]   = useState('dashboard')
  const [toast, setToast] = useState(null)
  function showToast(message, type = 'success') { setToast({ message, type }) }

  const PAGE_MAP = {
    dashboard:     <Dashboard   user={user} setPage={setPage} showToast={showToast} />,
    upcoming:      <Upcoming    user={user} setPage={setPage} />,
    contacts:      <Contacts    user={user} showToast={showToast} />,
    'message-log': <MessageLog  user={user} />,
    settings:      <SettingsPage user={user} showToast={showToast} setPage={setPage} />,
    upgrade:       <UpgradePage  user={user} showToast={showToast} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <AppNav page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 60px' }}>
        {PAGE_MAP[page] || PAGE_MAP.dashboard}
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]         = useState('home')
  const [subView, setSubView]   = useState(null) // for blog-post slug, trade key etc.
  const [authMode, setAuthMode] = useState('login')
  const [user, setUser]         = useState(null)
  const [session, setSession]   = useState(null)
  const [isCalCB, setIsCalCB]   = useState(false)

  useEffect(() => {
    if (window.location.pathname.includes('/auth/calendar/callback')) { setIsCalCB(true) }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) { setSession(s); setUser(s.user); setView('app') }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s) { setSession(s); setUser(s.user); setView('app') }
      else   { setSession(null); setUser(null); setView('home') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); setSession(null); setView('home')
  }

  function handleNavigate(page, sub) {
    setSubView(sub || null)
    if (page === 'auth-login') { setAuthMode('login'); setView('auth'); return }
    if (page === 'home') { setView('home'); return }
    setView(page)
    window.scrollTo(0, 0)
  }

  function goSignup() { setAuthMode('signup'); setView('auth') }
  function goLogin()  { setAuthMode('login');  setView('auth') }

  return (
    <>
      <GlobalStyles />
      {isCalCB && <CalendarCallback session={session} />}
      {!isCalCB && (
        <>
          {view === 'home'    && <HomePage    onLogin={goLogin} onSignup={goSignup} onNavigate={handleNavigate} />}
          {view === 'auth'    && <AuthPage    mode={authMode} setMode={setAuthMode} onAuthSuccess={u => { setUser(u); setView('app') }} onNavigate={handleNavigate} />}
          {view === 'app'     && user && <AppShell user={user} onLogout={handleLogout} />}
          {view === 'compare' && <ComparePage onSignup={goSignup} onNavigate={handleNavigate} />}
          {view === 'blog'    && <BlogPage    onSignup={goSignup} onNavigate={handleNavigate} />}
          {view === 'blog-post' && <BlogPostPage slug={subView} onSignup={goSignup} onNavigate={handleNavigate} />}
          {view === 'pricing' && <PricingPage  onSignup={goSignup} onNavigate={handleNavigate} />}
          {view === 'resources' && <ResourcesPage onSignup={goSignup} onNavigate={handleNavigate} />}
          {view?.startsWith('trade-') && <TradePage tradeKey={view} onSignup={goSignup} onNavigate={handleNavigate} />}
        </>
      )}
      <AiChat />
      <PwaBanner />
    </>
  )
}
