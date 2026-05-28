/*
 * TextReminder — src/App.jsx
 * Single-file React app. All pages, components, and logic inline.
 *
 * ─── SUPABASE SQL SETUP ───────────────────────────────────────────────────────
 * Run this in the Supabase SQL editor before first use:
 *
 * CREATE TABLE IF NOT EXISTS contacts (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *   name TEXT NOT NULL,
 *   phone TEXT NOT NULL,
 *   email TEXT,
 *   notes TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE TABLE IF NOT EXISTS reminders (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *   contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
 *   contact_name TEXT NOT NULL,
 *   contact_phone TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   scheduled_for TIMESTAMPTZ NOT NULL,
 *   status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own reminders" ON reminders FOR ALL USING (auth.uid() = user_id);
 *
 * CREATE TABLE IF NOT EXISTS settings (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
 *   business_name TEXT DEFAULT '',
 *   phone_number TEXT DEFAULT '',
 *   message_template TEXT DEFAULT 'Hi {name}, this is a reminder from {business}. Your appointment is on {date} at {time}. Reply STOP to opt out.',
 *   reminder_hours INTEGER DEFAULT 24,
 *   google_calendar_connected BOOLEAN DEFAULT FALSE,
 *   google_calendar_email TEXT DEFAULT '',
 *   plan TEXT DEFAULT 'free',
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users own settings" ON settings FOR ALL USING (auth.uid() = user_id);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  'https://fxzfaxlhhypiigcmlasx.supabase.co',
  'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO'
)

// ─── Constants ────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = '508681493155-5msuj56461c0tv3midh9tv05lmese9pd.apps.googleusercontent.com'
const GOOGLE_REDIRECT  = 'https://www.textreminder.co.uk/auth/calendar/callback'
const GOOGLE_SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly'
const EDGE_FN          = 'https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/google-calendar-callback'

const C = {
  pink:      '#ec4899',
  pinkDark:  '#db2777',
  purple:    '#a855f7',
  navy:      '#0f172a',
  navyMid:   '#1e293b',
  white:     '#ffffff',
  bg:        '#f8fafc',
  border:    '#e2e8f0',
  text:      '#0f172a',
  muted:     '#64748b',
  mutedLight:'#94a3b8',
  success:   '#10b981',
  error:     '#ef4444',
  warning:   '#f59e0b',
}

// ─── Plan data ────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, reminders: 20, popular: false,
    features: ['20 SMS reminders/month', 'Google Calendar sync', 'Up to 20 contacts', 'Basic templates', 'Message log'],
  },
  {
    id: 'starter', name: 'Starter', price: 9, reminders: 100, popular: false,
    features: ['100 SMS reminders/month', 'Google Calendar sync', 'Unlimited contacts', 'Custom templates', 'Message log', 'Email support'],
  },
  {
    id: 'professional', name: 'Professional', price: 19, reminders: 500, popular: true,
    features: ['500 SMS reminders/month', 'Google Calendar sync', 'Unlimited contacts', 'Custom templates', 'Priority delivery', 'Delivery reports', 'Priority support'],
  },
  {
    id: 'business', name: 'Business', price: 39, reminders: 2000, popular: false,
    features: ['2,000 SMS reminders/month', 'Everything in Pro', 'Multiple calendars', 'API access', 'Dedicated account manager', 'Custom sender ID'],
  },
]

// ─── Global styles injected once ─────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body {
        font-family: 'DM Sans', sans-serif;
        background: #f8fafc;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      a { text-decoration: none; color: inherit; }
      button { font-family: inherit; cursor: pointer; border: none; background: none; }
      input, textarea, select { font-family: inherit; }

      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #f1f5f9; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

      /* ── Buttons ── */
      .btn-primary {
        background: #ec4899; color: #fff; border: none; border-radius: 8px;
        padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
        transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
      }
      .btn-primary:hover { background: #db2777; box-shadow: 0 4px 12px rgba(236,72,153,0.35); }
      .btn-primary:active { transform: scale(0.97); }
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

      /* ── Inputs ── */
      .inp {
        width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px;
        padding: 10px 14px; font-size: 14px; font-family: inherit;
        background: #fff; color: #0f172a; outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .inp:focus { border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236,72,153,0.08); }
      .inp::placeholder { color: #94a3b8; }
      textarea.inp { resize: vertical; }
      select.inp { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6,9 12,15 18,9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }

      /* ── Cards ── */
      .card {
        background: #fff; border: 1px solid #e2e8f0;
        border-radius: 12px; padding: 24px;
      }
      .card-hover { transition: box-shadow 0.2s, transform 0.2s; }
      .card-hover:hover { box-shadow: 0 8px 32px rgba(168,85,247,0.1); transform: translateY(-2px); }

      /* ── Label ── */
      .lbl { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }

      /* ── Animations ── */
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fade-in { animation: fadeIn 0.22s ease; }
      .slide-up { animation: slideUp 0.25s ease; }

      /* ── Responsive ── */
      @media (max-width: 640px) {
        .hide-mobile { display: none !important; }
        .card { padding: 16px; }
      }
      @media (min-width: 641px) {
        .hide-desktop { display: none !important; }
      }

      /* ── Nav active line ── */
      .nav-item-active::after {
        content: ''; position: absolute; bottom: 0; left: 8px; right: 8px;
        height: 2px; background: #ec4899; border-radius: 2px 2px 0 0;
      }

      /* ── Table ── */
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th { padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; background: #f8fafc; white-space: nowrap; }
      .data-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
      .data-table tbody tr:hover { background: #f8fafc; }
      .data-table tbody tr:last-child td { border-bottom: none; }

      /* ── Pill filters ── */
      .pill { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #e2e8f0; background: #fff; color: #64748b; transition: all 0.15s; }
      .pill:hover { border-color: #a855f7; color: #a855f7; }
      .pill-active { background: #0f172a; color: #fff; border-color: #0f172a; }
    `}</style>
  )
}

// ─── SVG Icon library ─────────────────────────────────────────────────────────
const IC = {
  Grid: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Msg: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Star: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,6 5,6 21,6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevRight: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,18 15,12 9,6"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.34h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Clock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
    </svg>
  ),
  Trend: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
      <polyline points="17,6 23,6 23,12"/>
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Link: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Unlink: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  ),
  Google: () => (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
}

// ─── Shared small components ──────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: '#fef9c3', color: '#854d0e' },
    sent:      { bg: '#dcfce7', color: '#166534' },
    failed:    { bg: '#fee2e2', color: '#991b1b' },
    cancelled: { bg: '#f1f5f9', color: '#475569' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
      textTransform: 'capitalize' }}>
      {status}
    </span>
  )
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  const bg = type === 'success' ? C.success : type === 'error' ? C.error : C.warning
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color: '#fff', padding: '12px 18px', borderRadius: 10,
      fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease',
      maxWidth: 360 }}>
      {type === 'success' ? <IC.Check /> : <IC.Alert />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.8)', flexShrink: 0,
        background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
        <IC.X />
      </button>
    </div>
  )
}

function Modal({ title, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%',
        maxWidth, maxHeight: '90vh', overflowY: 'auto', animation: 'slideUp 0.22s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: 6, color: C.muted }}>
            <IC.X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #fff', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
  )
}

function EmptyState({ icon: Ic, title, sub, action, onAction }) {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{ width: 52, height: 52, background: '#f1f5f9', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', color: C.muted }}>
        <Ic />
      </div>
      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</p>
      {sub && <p style={{ color: C.muted, fontSize: 13, marginBottom: action ? 16 : 0 }}>{sub}</p>}
      {action && (
        <button className="btn-primary" onClick={onAction} style={{ fontSize: 13, padding: '8px 18px' }}>
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Date/time helpers ────────────────────────────────────────────────────────
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtTime = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const fmtDT   = d => `${fmtDate(d)}, ${fmtTime(d)}`

// ─── PUBLIC NAV ───────────────────────────────────────────────────────────────
function PublicNav({ onLogin, onSignup }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: C.navy,
      borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
        <LogoMark />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={onLogin}
            style={{ color: 'rgba(255,255,255,0.75)' }}>Log in</button>
          <button className="btn-primary" onClick={onSignup} style={{ padding: '9px 20px' }}>
            Get started free
          </button>
        </div>
      </div>
    </nav>
  )
}

function LogoMark({ dark = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 32, height: 32,
        background: `linear-gradient(135deg, ${C.pink} 0%, ${C.purple} 100%)`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', flexShrink: 0 }}>
        <IC.Bell />
      </div>
      <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.4px',
        color: dark ? C.navy : '#fff' }}>
        TextReminder
      </span>
    </div>
  )
}

// ─── APP NAV ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard', Ic: IC.Grid },
  { key: 'upcoming',     label: 'Upcoming',  Ic: IC.Calendar },
  { key: 'contacts',     label: 'Contacts',  Ic: IC.Users },
  { key: 'message-log',  label: 'Messages',  Ic: IC.Msg },
  { key: 'settings',     label: 'Settings',  Ic: IC.Settings },
  { key: 'upgrade',      label: 'Upgrade',   Ic: IC.Star, accent: true },
]

function AppNav({ page, setPage, user, onLogout }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: C.navy,
      borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px',
        display: 'flex', alignItems: 'center', height: 58 }}>

        {/* Logo */}
        <div style={{ marginRight: 12, flexShrink: 0 }}>
          <LogoMark />
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, height: '100%', gap: 2 }}>
          {NAV_ITEMS.map(({ key, label, Ic, accent }) => {
            const active = page === key
            return (
              <button key={key} onClick={() => setPage(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 10px', position: 'relative',
                  color: active
                    ? (accent ? C.pink : '#fff')
                    : accent ? C.pink : 'rgba(255,255,255,0.55)',
                  fontWeight: active ? 600 : 500, fontSize: 13.5,
                  background: active ? 'rgba(255,255,255,0.08)' : 'none',
                  border: 'none', cursor: 'pointer', borderRadius: 6,
                  transition: 'color 0.15s, background 0.15s',
                  whiteSpace: 'nowrap' }}>
                <Ic />
                <span className="hide-mobile">{label}</span>
                {active && (
                  <span style={{ position: 'absolute', bottom: 0, left: 8, right: 8,
                    height: 2, background: accent ? C.pink : C.pink,
                    borderRadius: '2px 2px 0 0' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* User area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div className="hide-mobile" style={{ width: 30, height: 30, borderRadius: 15,
            background: `linear-gradient(135deg, ${C.pink}44, ${C.purple}44)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
            {(user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <span className="hide-mobile" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)',
            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email?.split('@')[0]}
          </span>
          <button className="btn-ghost" onClick={onLogout} title="Log out"
            style={{ color: 'rgba(255,255,255,0.55)', padding: 8, borderRadius: 6 }}>
            <IC.LogOut />
          </button>
        </div>
      </div>
    </nav>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: HOME
// ═════════════════════════════════════════════════════════════════════════════
function HomePage({ onLogin, onSignup }) {
  return (
    <div style={{ background: '#fff' }}>
      <PublicNav onLogin={onLogin} onSignup={onSignup} />

      {/* ── Hero ── */}
      <section style={{ background: C.navy, padding: '90px 20px 110px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }} className="fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)',
            borderRadius: 24, padding: '6px 16px' }}>
            <IC.Bell />
            <span style={{ color: C.pink, fontSize: 13, fontWeight: 600 }}>
              SMS reminder automation for UK businesses
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 5.5vw, 58px)', fontWeight: 800, color: '#fff',
            lineHeight: 1.13, letterSpacing: '-1.5px', marginBottom: 22 }}>
            Stop no-shows.{' '}
            <span style={{ color: C.pink }}>Automate your reminders.</span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.62)', lineHeight: 1.75,
            maxWidth: 560, margin: '0 auto 40px' }}>
            TextReminder syncs with your Google Calendar and sends SMS reminders to clients
            automatically. No manual work. No missed appointments. No wasted time.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={onSignup}
              style={{ padding: '14px 30px', fontSize: 16 }}>
              Start free — no card needed
            </button>
            <button onClick={onLogin}
              style={{ padding: '14px 30px', fontSize: 16, fontWeight: 500,
                border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 8, color: 'rgba(255,255,255,0.8)',
                background: 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}>
              Log in
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section style={{ background: '#faf5ff', borderBottom: `1px solid #e9d5ff`, padding: '32px 20px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, textAlign: 'center' }}>
          {[['98%', 'SMS open rate'], ['42%', 'Fewer no-shows'], ['2 min', 'Setup time'], ['0', 'Manual work']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.purple, letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '88px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px' }}>
              Everything you need to reduce no-shows
            </h2>
            <p style={{ color: C.muted, fontSize: 16, marginTop: 12 }}>
              Built for trades, salons, clinics, and any appointment-based business.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 22 }}>
            {[
              { Ic: IC.Calendar, title: 'Google Calendar sync',
                desc: 'Connect once. TextReminder reads your calendar and schedules reminders automatically — no extra data entry.' },
              { Ic: IC.Msg, title: 'Personalised SMS templates',
                desc: 'Include your business name, client name, date, and time in every message. Fully customisable.' },
              { Ic: IC.Users, title: 'Contact management',
                desc: 'Store your client list securely. Add and remove contacts at any time. Search and filter in seconds.' },
              { Ic: IC.Trend, title: 'Delivery tracking',
                desc: 'See the real-time status of every reminder — sent, pending, or failed. Full message log included.' },
              { Ic: IC.Clock, title: 'Flexible reminder timing',
                desc: 'Choose how far ahead reminders go out: 1 hour, 24 hours, 48 hours, or more — whatever suits your clients.' },
              { Ic: IC.Bell, title: 'Set it and forget it',
                desc: 'Once configured, everything runs automatically. No daily logins, no manual sending, no chasing.' },
            ].map(({ Ic, title, desc }) => (
              <div key={title} className="card card-hover"
                style={{ cursor: 'default' }}>
                <div style={{ width: 46, height: 46, background: '#faf5ff', borderRadius: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.purple, marginBottom: 16 }}>
                  <Ic />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 9 }}>{title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: '#f8fafc', padding: '88px 20px',
        borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.8px' }}>
              Simple, honest pricing
            </h2>
            <p style={{ color: C.muted, marginTop: 10, fontSize: 16 }}>No contracts. Cancel any time. No hidden fees.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {PLANS.map(plan => (
              <div key={plan.id} className="card"
                style={{ border: plan.popular ? `2px solid ${C.pink}` : `1px solid ${C.border}`,
                  position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(168,85,247,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: C.pink, color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '3px 14px', borderRadius: 20, letterSpacing: '0.5px' }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.6px', color: C.muted, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', marginBottom: 4 }}>
                  {plan.price === 0 ? 'Free' : `£${plan.price}`}
                  {plan.price > 0 && <span style={{ fontSize: 15, fontWeight: 400, color: C.muted }}>/mo</span>}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 22, fontWeight: 500 }}>
                  {plan.reminders} reminders/month
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18,
                  display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13 }}>
                      <span style={{ color: C.success, flexShrink: 0, marginTop: 1 }}><IC.Check /></span>
                      {f}
                    </div>
                  ))}
                </div>
                <button className={plan.popular ? 'btn-primary' : 'btn-secondary'}
                  onClick={onSignup} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                  {plan.price === 0 ? 'Get started free' : 'Start free trial'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: C.navy, padding: '44px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <LogoMark />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
            &copy; {new Date().getFullYear()} TextReminder. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <span key={l} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer',
                transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: AUTH
// ═════════════════════════════════════════════════════════════════════════════
function AuthPage({ mode, setMode, onAuthSuccess }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      let result
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }
      if (result.error) { setError(result.error.message); return }
      if (mode === 'signup' && !result.data.session) {
        setError('Check your email to confirm your account, then log in.')
        return
      }
      onAuthSuccess(result.data.session?.user)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.navy,
      display: 'flex', flexDirection: 'column' }}>
      <PublicNav onLogin={() => setMode('login')} onSignup={() => setMode('signup')} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20 }}>
        <div className="card slide-up" style={{ width: '100%', maxWidth: 430 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 18px',
              background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
              borderRadius: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff' }}>
              <IC.Bell />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.4px' }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 7 }}>
              {mode === 'login'
                ? 'Log in to your TextReminder account'
                : 'Send your first reminder in under 5 minutes'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: `1px solid #fecaca`,
              borderRadius: 8, padding: '10px 14px', marginBottom: 18,
              fontSize: 13, color: C.error, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}><IC.Alert /></span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="lbl">Email address</label>
              <input className="inp" type="email" placeholder="you@yourcompany.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label className="lbl">Password</label>
              <input className="inp" type="password"
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                value={password} onChange={e => setPassword(e.target.value)}
                required minLength={8} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}>
              {loading ? <Spinner /> : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 13, color: C.muted }}>or</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <button className="btn-secondary" onClick={handleGoogle} disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            <IC.Google />
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: C.muted, marginTop: 22 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              style={{ color: C.pink, fontWeight: 600, cursor: 'pointer' }}>
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
      const sent   = r1.count || 0
      const failed = (r4.data || []).filter(x => x.status === 'failed').length
      const total  = sent + failed
      setStats({ sent, pending: r2.count || 0, contacts: r3.count || 0, rate: total > 0 ? Math.round((sent / total) * 100) : 100 })
      setRecent(r4.data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const CARDS = [
    { label: 'Reminders sent',  value: stats.sent,            Ic: IC.Msg,    color: C.pink },
    { label: 'Scheduled',       value: stats.pending,         Ic: IC.Clock,  color: C.warning },
    { label: 'Contacts',        value: stats.contacts,        Ic: IC.Users,  color: C.purple },
    { label: 'Delivery rate',   value: `${stats.rate}%`,      Ic: IC.Trend,  color: C.success },
  ]

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Dashboard</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>
          Good to see you, {user.email?.split('@')[0]}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
        gap: 16, marginBottom: 28 }}>
        {CARDS.map(({ label, value, Ic, color }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, background: `${color}14`, borderRadius: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color, flexShrink: 0 }}>
              <Ic />
            </div>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' }}>
                {loading ? '—' : value}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent reminders */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent reminders</h2>
          <button className="btn-ghost" onClick={() => setPage('message-log')}
            style={{ fontSize: 13, color: C.muted }}>
            View all <IC.ChevRight />
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '28px 22px', color: C.muted, fontSize: 14 }}>Loading...</div>
        ) : recent.length === 0 ? (
          <EmptyState Ic={IC.Msg} title="No reminders yet"
            sub="Add contacts and connect your calendar to get started."
            action="Add your first contact" onAction={() => setPage('contacts')} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Message</th>
                  <th className="hide-mobile">Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.contact_name}</td>
                    <td style={{ color: C.muted, maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.message}
                      </div>
                    </td>
                    <td className="hide-mobile" style={{ color: C.muted, whiteSpace: 'nowrap' }}>
                      {fmtDT(r.scheduled_for)}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick-action tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
        {[
          { Ic: IC.Users,    title: 'Manage contacts',    sub: 'Add or remove clients',      page: 'contacts',  color: C.purple },
          { Ic: IC.Calendar, title: 'Connect calendar',   sub: 'Sync Google Calendar',        page: 'settings',  color: C.pink },
          { Ic: IC.Msg,      title: 'Edit template',      sub: 'Customise your SMS message',  page: 'settings',  color: '#06b6d4' },
        ].map(({ Ic, title, sub, page: pg, color }) => (
          <div key={title} onClick={() => setPage(pg)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12,
              cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = color }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = C.border }}>
            <div style={{ width: 40, height: 40, background: `${color}14`, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
              <Ic />
            </div>
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
function Upcoming({ user }) {
  const [reminders, setReminders] = useState([])
  const [loading,   setLoading]   = useState(true)
  const today       = new Date()
  const [selDay, setSelDay] = useState(today.toDateString())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const from = new Date(); from.setHours(0, 0, 0, 0)
      const to   = new Date(from); to.setDate(from.getDate() + 8)
      const { data } = await supabase.from('reminders').select('*')
        .eq('user_id', user.id)
        .gte('scheduled_for', from.toISOString())
        .lte('scheduled_for', to.toISOString())
        .order('scheduled_for', { ascending: true })
      setReminders(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const byDay = {}
  reminders.forEach(r => {
    const k = new Date(r.scheduled_for).toDateString()
    if (!byDay[k]) byDay[k] = []
    byDay[k].push(r)
  })

  const selReminders = byDay[selDay] || []
  const isToday = d => d.toDateString() === today.toDateString()

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Upcoming</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>Reminders scheduled over the next 7 days</p>
      </div>

      {/* ── Desktop 7-day grid ── */}
      <div className="hide-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12, marginBottom: 24 }}>
        {days.map(day => {
          const k      = day.toDateString()
          const count  = (byDay[k] || []).length
          const active = k === selDay
          const todayD = isToday(day)
          return (
            <div key={k} onClick={() => setSelDay(k)}
              style={{ background: active ? C.navy : '#fff',
                border: `${active ? 2 : 1}px solid ${active ? C.pink : C.border}`,
                borderRadius: 12, padding: '16px 10px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: active ? '0 4px 16px rgba(15,23,42,0.18)' : '' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', marginBottom: 8,
                color: active ? 'rgba(255,255,255,0.5)' : C.muted }}>
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800,
                color: active ? '#fff' : todayD ? C.pink : C.text }}>
                {day.getDate()}
              </div>
              {count > 0 ? (
                <div style={{ marginTop: 10, background: active ? C.pink : '#fce7f3',
                  color: active ? '#fff' : C.pink, borderRadius: 20, fontSize: 11,
                  fontWeight: 700, padding: '2px 10px', display: 'inline-block' }}>
                  {count}
                </div>
              ) : (
                <div style={{ marginTop: 10, height: 20 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Mobile day scroller ── */}
      <div className="hide-desktop" style={{ overflowX: 'auto', display: 'flex', gap: 8,
        paddingBottom: 8, marginBottom: 16 }}>
        {days.map(day => {
          const k      = day.toDateString()
          const count  = (byDay[k] || []).length
          const active = k === selDay
          return (
            <div key={k} onClick={() => setSelDay(k)}
              style={{ flexShrink: 0, textAlign: 'center', minWidth: 58,
                background: active ? C.navy : '#fff',
                border: `${active ? 2 : 1}px solid ${active ? C.pink : C.border}`,
                borderRadius: 10, padding: '10px 6px', cursor: 'pointer' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                color: active ? 'rgba(255,255,255,0.5)' : C.muted }}>
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? '#fff' : C.text, marginTop: 2 }}>
                {day.getDate()}
              </div>
              {count > 0 && (
                <div style={{ width: 6, height: 6, borderRadius: 3, background: C.pink,
                  margin: '5px auto 0' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Day detail panel ── */}
      <div className="card">
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            {new Date(selDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <span style={{ fontSize: 13, color: C.muted, background: '#f1f5f9',
            padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
            {selReminders.length} reminder{selReminders.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ color: C.muted, fontSize: 14 }}>Loading...</div>
        ) : selReminders.length === 0 ? (
          <EmptyState Ic={IC.Calendar} title="Nothing scheduled" sub="No reminders on this day." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selReminders.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', background: '#f8fafc', borderRadius: 10,
                border: `1px solid ${C.border}` }}>
                <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 10,
                  border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                    {fmtTime(r.scheduled_for).split(':')[0]}
                  </span>
                  <span style={{ fontSize: 10, color: C.muted, lineHeight: 1 }}>
                    {fmtTime(r.scheduled_for).split(':')[1]}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.contact_name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.message}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
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
    const { data } = await supabase.from('contacts').select('*')
      .eq('user_id', user.id).order('name', { ascending: true })
    setContacts(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('contacts').insert([
      { user_id: user.id, ...form }
    ])
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Contact added successfully')
    setShowAdd(false)
    setForm({ name: '', phone: '', email: '', notes: '' })
    load()
  }

  async function handleDelete() {
    const { error } = await supabase.from('contacts').delete().eq('id', delId)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Contact removed')
    setDelId(null)
    load()
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const delContact = contacts.find(c => c.id === delId)

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Contacts</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>
            {contacts.length} client{contacts.length !== 1 ? 's' : ''} in your list
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <IC.Plus /> Add contact
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="inp" placeholder="Search by name, phone, or email..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 380 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '28px 22px', color: C.muted, fontSize: 14 }}>Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <EmptyState Ic={IC.Users}
            title={contacts.length === 0 ? 'No contacts yet' : 'No results found'}
            sub={contacts.length === 0 ? 'Add your first client to start sending reminders.' : 'Try a different search.'}
            action={contacts.length === 0 ? 'Add first contact' : undefined}
            onAction={() => setShowAdd(true)} />
        ) : (
          filtered.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
              transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              {/* Avatar */}
              <div style={{ width: 42, height: 42, borderRadius: 21,
                background: `linear-gradient(135deg, ${C.pink}22, ${C.purple}33)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: C.purple, flexShrink: 0,
                border: `1px solid ${C.purple}22` }}>
                {c.name[0].toUpperCase()}
              </div>
              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: C.muted,
                  marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <IC.Phone /> {c.phone}
                  </span>
                  {c.email && (
                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <IC.Mail /> {c.email}
                    </span>
                  )}
                </div>
              </div>
              {/* Date */}
              <span className="hide-mobile" style={{ fontSize: 12, color: C.mutedLight, whiteSpace: 'nowrap' }}>
                Added {fmtDate(c.created_at)}
              </span>
              {/* Delete */}
              <button className="btn-ghost" onClick={() => setDelId(c.id)}
                style={{ color: C.error, padding: 7, flexShrink: 0 }}
                title="Remove contact">
                <IC.Trash />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add new contact" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="lbl">Full name *</label>
                <input className="inp" placeholder="Jane Smith" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="lbl">Mobile number *</label>
                <input className="inp" placeholder="+44 7700 900123" required
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="lbl">Email address <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
                <input className="inp" type="email" placeholder="jane@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="lbl">Notes <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span></label>
                <input className="inp" placeholder="e.g. Prefers morning appointments"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <Spinner /> : 'Add contact'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {delId && (
        <Modal title="Remove contact" onClose={() => setDelId(null)} maxWidth={400}>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
            Are you sure you want to remove <strong>{delContact?.name}</strong>? This cannot be undone.
          </p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>
            Any pending reminders for this contact will be cancelled.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setDelId(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleDelete}
              style={{ background: C.error }}>
              Remove contact
            </button>
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
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('reminders').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setReminders(data || [])
      setLoading(false)
    }
    load()
  }, [user.id])

  const FILTERS = ['all', 'sent', 'pending', 'failed', 'cancelled']

  const filtered = reminders.filter(r => {
    const ms = filter === 'all' || r.status === filter
    const mq = !search
      || r.contact_name.toLowerCase().includes(search.toLowerCase())
      || r.message.toLowerCase().includes(search.toLowerCase())
      || r.contact_phone.includes(search)
    return ms && mq
  })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Message Log</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>
          Complete history of all reminders sent and scheduled
        </p>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="inp" placeholder="Search contacts, messages, numbers..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 300, flex: '1 1 200px' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`pill${filter === f ? ' pill-active' : ''}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '28px 22px', color: C.muted, fontSize: 14 }}>Loading messages...</div>
        ) : filtered.length === 0 ? (
          <EmptyState Ic={IC.Msg} title="No messages found" sub="Try adjusting your filters or search." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 620 }}>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th className="hide-mobile">Phone</th>
                  <th>Message</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.contact_name}</td>
                    <td className="hide-mobile" style={{ color: C.muted }}>{r.contact_phone}</td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap', color: C.muted, maxWidth: 200 }}>
                        {r.message}
                      </div>
                    </td>
                    <td style={{ color: C.muted, whiteSpace: 'nowrap', fontSize: 13 }}>
                      {fmtDT(r.scheduled_for)}
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ fontSize: 12, color: C.mutedLight, marginTop: 10 }}>
        Showing {filtered.length} of {reminders.length} total messages
      </p>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE: SETTINGS
// ═════════════════════════════════════════════════════════════════════════════
function SettingsPage({ user, showToast, setPage }) {
  const DEFAULT_SETTINGS = {
    business_name: '', phone_number: '',
    message_template: 'Hi {name}, reminder from {business}: your appointment is on {date} at {time}. Reply STOP to opt out.',
    reminder_hours: 24, google_calendar_connected: false, google_calendar_email: '', plan: 'free'
  }
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('*')
        .eq('user_id', user.id).single()
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...data })
      setLoading(false)
    }
    load()
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('settings').upsert(
      { user_id: user.id, ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Settings saved successfully')
  }

  function connectCalendar() {
    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  GOOGLE_REDIRECT,
      response_type: 'code',
      scope:         GOOGLE_SCOPE,
      access_type:   'offline',
      prompt:        'consent',
      state:         user.id,
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async function disconnectCalendar() {
    const updated = { ...settings, google_calendar_connected: false, google_calendar_email: '' }
    setSettings(updated)
    await supabase.from('settings').upsert(
      { user_id: user.id, ...updated, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    showToast('Google Calendar disconnected')
  }

  function insertVar(v) {
    setSettings(s => ({ ...s, message_template: s.message_template + v }))
  }

  const TIMING = [
    { value: 1, label: '1 hour before' },
    { value: 2, label: '2 hours before' },
    { value: 4, label: '4 hours before' },
    { value: 12, label: '12 hours before' },
    { value: 24, label: '24 hours before' },
    { value: 48, label: '48 hours before' },
    { value: 72, label: '72 hours before' },
  ]
  const VARS = ['{name}', '{business}', '{date}', '{time}', '{phone}']

  if (loading) return <div style={{ padding: 24, color: C.muted }}>Loading settings...</div>

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Settings</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>
          Manage your account, messages, and integrations
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 660 }}>

          {/* ── Business details ── */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Business details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="lbl">Business name</label>
                <input className="inp" placeholder="Your business name"
                  value={settings.business_name}
                  onChange={e => setSettings(s => ({ ...s, business_name: e.target.value }))} />
                <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>
                  Used in SMS messages as <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{'{business}'}</code>
                </p>
              </div>
              <div>
                <label className="lbl">Your phone number</label>
                <input className="inp" placeholder="+44 7700 900000"
                  value={settings.phone_number}
                  onChange={e => setSettings(s => ({ ...s, phone_number: e.target.value }))} />
                <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>
                  For reference only — reminders are sent via our platform number.
                </p>
              </div>
            </div>
          </div>

          {/* ── Message template ── */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>SMS message template</h2>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              Write your reminder message. Click a variable to insert it.
            </p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
              {VARS.map(v => (
                <button key={v} type="button" onClick={() => insertVar(v)}
                  style={{ background: '#faf5ff', border: `1px solid #e9d5ff`, color: C.purple,
                    borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.target.style.background = '#f3e8ff'}
                  onMouseLeave={e => e.target.style.background = '#faf5ff'}>
                  {v}
                </button>
              ))}
            </div>
            <textarea className="inp" rows={4}
              value={settings.message_template}
              onChange={e => setSettings(s => ({ ...s, message_template: e.target.value }))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <p style={{ fontSize: 12, color: C.muted }}>
                {settings.message_template.length} characters
                {settings.message_template.length > 160 && (
                  <span style={{ color: C.warning, marginLeft: 8 }}>
                    (will send as {Math.ceil(settings.message_template.length / 153)} messages)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ── Reminder timing ── */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Reminder timing</h2>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>
              How far in advance reminders are sent before the appointment.
            </p>
            <select className="inp" style={{ maxWidth: 260 }}
              value={settings.reminder_hours}
              onChange={e => setSettings(s => ({ ...s, reminder_hours: Number(e.target.value) }))}>
              {TIMING.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Google Calendar ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Google Calendar</h2>
                <p style={{ fontSize: 13, color: C.muted }}>
                  {settings.google_calendar_connected
                    ? `Connected${settings.google_calendar_email ? ` as ${settings.google_calendar_email}` : ''}`
                    : 'Connect your calendar to automatically schedule reminders from your events.'}
                </p>
              </div>
              <div style={{ flexShrink: 0 }}>
                {settings.google_calendar_connected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center',
                      color: C.success, fontSize: 13, fontWeight: 600 }}>
                      <IC.Check /> Connected
                    </div>
                    <button type="button" className="btn-ghost" onClick={disconnectCalendar}
                      style={{ color: C.error, fontSize: 13, padding: '5px 8px' }}>
                      <IC.Unlink /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn-secondary" onClick={connectCalendar}>
                    <IC.Link /> Connect Google Calendar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Plan info ── */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
            border: `1px solid #e9d5ff` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>
                  Current plan:{' '}
                  <span style={{ color: C.purple, textTransform: 'capitalize' }}>{settings.plan}</span>
                </h2>
                <p style={{ fontSize: 13, color: C.muted }}>
                  {PLANS.find(p => p.id === settings.plan)?.reminders || 20} reminders/month included.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={() => setPage('upgrade')}>
                <IC.Star /> Upgrade plan
              </button>
            </div>
          </div>

          {/* Save */}
          <div style={{ paddingBottom: 8 }}>
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ padding: '12px 28px', fontSize: 15 }}>
              {saving ? <><Spinner /> Saving...</> : 'Save settings'}
            </button>
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
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px' }}>Upgrade your plan</h1>
        <p style={{ color: C.muted, fontSize: 14, marginTop: 5 }}>
          Scale your reminders as your business grows. No contracts, cancel any time.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 22, maxWidth: 1000, marginBottom: 32 }}>
        {PLANS.map(plan => (
          <div key={plan.id} className="card"
            style={{ border: plan.popular ? `2px solid ${C.pink}` : `1px solid ${C.border}`,
              position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-7px)'; e.currentTarget.style.boxShadow = '0 18px 52px rgba(168,85,247,0.14)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>

            {plan.popular && (
              <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                background: `linear-gradient(90deg, ${C.pink}, ${C.purple})`,
                color: '#fff', fontSize: 11, fontWeight: 700,
                padding: '3px 16px', borderRadius: 20, letterSpacing: '0.5px',
                whiteSpace: 'nowrap' }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.6px', color: C.muted, marginBottom: 10 }}>{plan.name}</div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-1.5px' }}>
                {plan.price === 0 ? 'Free' : `£${plan.price}`}
              </span>
              {plan.price > 0 && (
                <span style={{ fontSize: 14, color: C.muted, fontWeight: 400, marginLeft: 2 }}>/month</span>
              )}
            </div>

            <div style={{ fontSize: 13, color: C.muted, marginBottom: 22, fontWeight: 500 }}>
              {plan.reminders.toLocaleString()} SMS reminders/month
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18, marginBottom: 22,
              display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                  <span style={{ color: C.success, flexShrink: 0, marginTop: 1 }}><IC.Check /></span>
                  {f}
                </div>
              ))}
            </div>

            <button
              className={plan.popular ? 'btn-primary' : 'btn-secondary'}
              onClick={() => showToast('Billing coming soon — we\'ll notify you!', 'warning')}
              style={{ width: '100%', justifyContent: 'center', padding: '12px',
                background: plan.popular
                  ? `linear-gradient(90deg, ${C.pink}, ${C.purple})`
                  : undefined }}>
              {plan.price === 0 ? 'Current free plan' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Enterprise callout */}
      <div className="card" style={{ maxWidth: 680, background: C.navy, border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${C.pink}, ${C.purple})`,
            borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0 }}>
            <IC.Msg />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 5 }}>
              Need a custom volume deal?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
              High-volume businesses and agencies — contact us for a bespoke quote with dedicated support.
            </p>
          </div>
          <button className="btn-primary" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={() => window.open('mailto:hello@textreminder.co.uk')}>
            Contact us
          </button>
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR CALLBACK HANDLER
// ═════════════════════════════════════════════════════════════════════════════
function CalendarCallback({ session }) {
  const [status, setStatus] = useState('processing')
  const [msg,    setMsg]    = useState('Connecting your Google Calendar...')

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search)
      const code   = params.get('code')
      const userId = params.get('state')

      if (!code || !userId) {
        setStatus('error'); setMsg('Invalid callback — missing required parameters.'); return
      }
      if (!session) {
        setStatus('error'); setMsg('Not authenticated. Please log in and try again.'); return
      }

      try {
        const res = await fetch(EDGE_FN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, user_id: userId }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || `Server error ${res.status}`)
        }
        setStatus('success')
        setMsg('Google Calendar connected! Redirecting...')
        setTimeout(() => { window.location.href = '/' }, 2200)
      } catch (err) {
        setStatus('error')
        setMsg(err.message || 'Connection failed. Please try again.')
      }
    }
    handle()
  }, [session])

  const iconBg = { processing: '#faf5ff', success: '#dcfce7', error: '#fee2e2' }[status]
  const iconCl = { processing: C.purple,  success: C.success, error: C.error }[status]

  return (
    <div style={{ minHeight: '100vh', background: C.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card slide-up" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', color: iconCl }}>
          {status === 'success' ? <IC.Check />
           : status === 'error'  ? <IC.X />
           : <IC.Calendar />}
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          {status === 'processing' ? 'Connecting calendar'
           : status === 'success'  ? 'Calendar connected!'
           : 'Connection failed'}
        </h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{msg}</p>
        {status === 'error' && (
          <button className="btn-primary" onClick={() => window.location.href = '/'}
            style={{ marginTop: 20 }}>
            Back to app
          </button>
        )}
        {status === 'processing' && (
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${C.border}`,
              borderTop: `3px solid ${C.purple}`, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED APP SHELL
// ═════════════════════════════════════════════════════════════════════════════
function AppShell({ user, onLogout }) {
  const [page,  setPage]  = useState('dashboard')
  const [toast, setToast] = useState(null)

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  const sharedProps = { user, setPage, showToast }

  const PAGE_MAP = {
    dashboard:   <Dashboard   {...sharedProps} />,
    upcoming:    <Upcoming    {...sharedProps} />,
    contacts:    <Contacts    {...sharedProps} />,
    'message-log': <MessageLog {...sharedProps} />,
    settings:    <SettingsPage {...sharedProps} />,
    upgrade:     <UpgradePage  {...sharedProps} />,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <AppNav page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 20px 60px' }}>
        {PAGE_MAP[page] || PAGE_MAP.dashboard}
      </main>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view,     setView]     = useState('home')   // 'home' | 'auth' | 'app'
  const [authMode, setAuthMode] = useState('login')  // 'login' | 'signup'
  const [user,     setUser]     = useState(null)
  const [session,  setSession]  = useState(null)
  const [isCalCB,  setIsCalCB]  = useState(false)

  useEffect(() => {
    // Check for Google Calendar OAuth callback path
    if (window.location.pathname.includes('/auth/calendar/callback')) {
      setIsCalCB(true)
    }

    // Restore session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) { setSession(s); setUser(s.user); setView('app') }
    })

    // Listen for auth changes (e.g. Google OAuth redirect)
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

  function handleAuthSuccess(u) {
    setUser(u); setView('app')
  }

  // Render
  return (
    <>
      <GlobalStyles />

      {/* Google Calendar OAuth callback */}
      {isCalCB && <CalendarCallback session={session} />}

      {/* Normal views */}
      {!isCalCB && (
        <>
          {view === 'home' && (
            <HomePage
              onLogin={()  => { setAuthMode('login');  setView('auth') }}
              onSignup={() => { setAuthMode('signup'); setView('auth') }}
            />
          )}

          {view === 'auth' && (
            <AuthPage
              mode={authMode}
              setMode={setAuthMode}
              onAuthSuccess={handleAuthSuccess}
            />
          )}

          {view === 'app' && user && (
            <AppShell user={user} onLogout={handleLogout} />
          )}
        </>
      )}
    </>
  )
}
