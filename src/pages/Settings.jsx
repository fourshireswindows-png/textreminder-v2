import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Appointment Reminder', body: 'Hi {name}, just a reminder your appointment is tomorrow at {time}. Any questions call {business_phone}. Reply STOP to opt out.' },
  { id: 2, name: 'Day-of Reminder',      body: 'Hi {name}, your appointment is today at {time}. See you then! Call {business_phone} if needed. Reply STOP to opt out.' },
  { id: 3, name: 'Quick Reminder',       body: 'Hi {name}, reminder: appointment at {time}. Call {business_phone} to reschedule. Reply STOP to opt out.' },
]

function Section({ title, sub, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:24, marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:'#94a3b8', marginBottom:16 }}>{sub}</div>}
      {children}
    </div>
  )
}

export default function Settings() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [form, setForm]       = useState({
    business_name: '',
    phone: '',
    message_templates: DEFAULT_TEMPLATES,
    reminder_schedule: [{ value:24, unit:'hours', template_id:1 }],
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          business_name:     data.business_name || '',
          phone:             data.phone || '',
          message_templates: data.message_templates || DEFAULT_TEMPLATES,
          reminder_schedule: data.reminder_schedule || [{ value:24, unit:'hours', template_id:1 }],
        })
      } else {
        const { data: { user: u } } = await supabase.auth.getUser()
        await supabase.from('profiles').insert({ id: u.id })
      }
      setLoading(false)
    }
    load()
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function connectCalendar() {
    const GOOGLE_CLIENT_ID = '508681493155-5msuj56461c0tv3midh9tv05lmese9pd.apps.googleusercontent.com'
    const GOOGLE_REDIRECT  = 'https://www.textreminder.co.uk/auth/calendar/callback'
    const GOOGLE_SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly'
    const params = new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      redirect_uri:  GOOGLE_REDIRECT,
      response_type: 'code',
      scope:         GOOGLE_SCOPE,
      access_type:   'offline',
      prompt:        'consent',
    })
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString()
  }

  async function disconnectCalendar() {
    if (!confirm('Disconnect Google Calendar? Reminders will stop syncing.')) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({
      google_calendar_connected: false,
      google_calendar_email: null,
      google_refresh_token: null,
    }).eq('id', user.id)
    setProfile(p => ({ ...p, google_calendar_connected: false, google_calendar_email: null }))
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        id: user.id,
        business_name: form.business_name,
        phone: form.phone,
        message_templates: form.message_templates,
        reminder_schedule: form.reminder_schedule,
      }
      const { error } = await supabase.from('profiles').upsert(payload)
      if (error) { setSaveError(error.message); console.error('Save error:', error) }
      else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } catch (e) {
      setSaveError(e.message)
      console.error('Save exception:', e)
    }
    setSaving(false)
  }

  function updateTemplate(i, field, value) {
    const t = form.message_templates.map((tpl, idx) => idx === i ? { ...tpl, [field]: value } : tpl)
    set('message_templates', t)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>

  return (
    <div>
      <style>{`@media(max-width:640px){.sg{grid-template-columns:1fr!important}}`}</style>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, color:'#0f172a', marginBottom:4, letterSpacing:'-0.6px' }}>Settings</h1>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Configure your account and reminders</div>
      </div>

      <Section title="Business Details" sub="Used in your reminder messages">
        <div className="sg" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Business Name</label>
            <input value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="e.g. Four Shires Window Cleaning" className="input"/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Contact Number</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 900123" className="input"/>
          </div>
        </div>
      </Section>

      <Section title="Message Templates" sub="3 customisable templates. Use {name}, {time}, {business_phone} as placeholders.">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {form.message_templates.map((tpl, i) => {
            const preview = tpl.body
              .replace('{name}', 'Sarah')
              .replace('{time}', '9:00am')
              .replace('{business_phone}', form.phone || '07700 900123')
            return (
              <div key={tpl.id} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:24, height:24, background:'linear-gradient(135deg,#ec4899,#a855f7)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0 }}>
                    {i + 1}
                  </div>
                  <input
                    value={tpl.name}
                    onChange={e => updateTemplate(i, 'name', e.target.value)}
                    placeholder="Template name"
                    style={{ flex:1, border:'1.5px solid #e2e8f0', borderRadius:7, padding:'6px 10px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff' }}
                    onFocus={e => e.target.style.borderColor='#a855f7'}
                    onBlur={e => e.target.style.borderColor='#e2e8f0'}
                  />
                </div>
                <textarea
                  value={tpl.body}
                  onChange={e => updateTemplate(i, 'body', e.target.value)}
                  rows={3}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', marginBottom:10, lineHeight:1.6 }}
                  onFocus={e => e.target.style.borderColor='#a855f7'}
                  onBlur={e => e.target.style.borderColor='#e2e8f0'}
                />
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:7, padding:'8px 12px', fontSize:12, color:'#374151', lineHeight:1.6 }}>
                  <span style={{ fontWeight:700, color:'#166534' }}>Preview: </span>
                  <em>{preview}</em>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Reminder Schedule" sub="Send up to 5 reminders before each appointment. Choose a template for each send.">
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {form.reminder_schedule.map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color:'#94a3b8', minWidth:24, textAlign:'right' }}>#{i+1}</span>
              <input
                type="number" min={1} max={999} value={r.value}
                onChange={e => {
                  const s = [...form.reminder_schedule]
                  s[i] = { ...s[i], value: Math.max(1, parseInt(e.target.value) || 1) }
                  set('reminder_schedule', s)
                }}
                style={{ width:72, border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:14, fontFamily:'inherit', outline:'none', textAlign:'center' }}
                onFocus={e => e.target.style.borderColor='#a855f7'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
              />
              <select
                value={r.unit}
                onChange={e => {
                  const s = [...form.reminder_schedule]
                  s[i] = { ...s[i], unit: e.target.value }
                  set('reminder_schedule', s)
                }}
                style={{ border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', cursor:'pointer', flex:1, minWidth:120 }}
                onFocus={e => e.target.style.borderColor='#a855f7'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
              >
                <option value="hours">hours before</option>
                <option value="days">days before</option>
                <option value="weeks">weeks before</option>
              </select>
              <select
                value={r.template_id || 1}
                onChange={e => {
                  const s = [...form.reminder_schedule]
                  s[i] = { ...s[i], template_id: parseInt(e.target.value) }
                  set('reminder_schedule', s)
                }}
                style={{ border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff', cursor:'pointer', minWidth:160 }}
                onFocus={e => e.target.style.borderColor='#a855f7'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
              >
                {form.message_templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.id}. {tpl.name}</option>
                ))}
              </select>
              {form.reminder_schedule.length > 1 && (
                <button onClick={() => set('reminder_schedule', form.reminder_schedule.filter((_, j) => j !== i))}
                  style={{ width:30, height:30, borderRadius:'50%', border:'1px solid #fecdd3', background:'#fff5f5', color:'#ef4444', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>x</button>
              )}
            </div>
          ))}
          {form.reminder_schedule.length < 5 && (
            <button onClick={() => set('reminder_schedule', [...form.reminder_schedule, { value:24, unit:'hours', template_id:1 }])}
              style={{ alignSelf:'flex-start', marginTop:4, padding:'8px 16px', borderRadius:8, border:'1.5px dashed #e9d5ff', background:'#faf5ff', color:'#a855f7', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
              onMouseEnter={e => e.target.style.borderColor='#a855f7'} onMouseLeave={e => e.target.style.borderColor='#e9d5ff'}>
              + Add another reminder
            </button>
          )}
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>
            e.g. send template 1 at 24 hours before, then template 2 at 2 hours before.
          </div>
        </div>
      </Section>

      <Section title="Google Calendar" sub="Connect your Google Calendar to sync appointments automatically.">
        {profile?.google_calendar_connected ? (
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'#10b981', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>Connected</div>
              {profile.google_calendar_email && <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{profile.google_calendar_email}</div>}
            </div>
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button
                onClick={connectCalendar}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Reconnect
              </button>
              <button
                onClick={disconnectCalendar}
                style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #fecdd3', background:'#fff5f5', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize:13, color:'#64748b', marginBottom:14, lineHeight:1.6 }}>
              Connect Google Calendar to automatically sync your appointments and send reminders.
            </div>
            <button
              onClick={connectCalendar}
              style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'11px 20px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'#fff', color:'#0f172a', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </button>
          </div>
        )}
      </Section>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, marginTop:8 }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:8 }}>
          {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save Changes'}
        </button>
        {saveError && <div style={{ fontSize:11, color:'#ef4444', maxWidth:220, textAlign:'right' }}>{saveError}</div>}
      </div>

    </div>
  )
}
