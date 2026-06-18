import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const GOOGLE_CLIENT_ID    = '508681493155-5msuj56461c0tv3midh9tv05lmese9pd.apps.googleusercontent.com'
const GOOGLE_REDIRECT_URI = 'https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/google-calendar-callback'
const GOOGLE_SCOPE        = 'https://www.googleapis.com/auth/calendar.readonly'

const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Appointment Reminder', body: 'Hi {name}, just a reminder your appointment is tomorrow at {time}. Any questions call {business_phone}. Reply STOP to opt out.' },
  { id: 2, name: 'Day-of Reminder',      body: 'Hi {name}, your appointment is today at {time}. See you then! Call {business_phone} if needed. Reply STOP to opt out.' },
  { id: 3, name: 'Quick Reminder',       body: 'Hi {name}, reminder: appointment at {time}. Call {business_phone} to reschedule. Reply STOP to opt out.' },
]

async function connectGoogle() {
  const { data: { user } } = await supabase.auth.getUser()
  const state = user.id
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(GOOGLE_SCOPE)}&access_type=offline&prompt=consent&state=${state}`
  window.location.href = url
}

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
  const [form, setForm]       = useState({
    business_name: '',
    phone: '',
    message_templates: DEFAULT_TEMPLATES,
    reminder_schedule: [{ value:24, unit:'hours' }],
    channels: { sms:true, email:false, whatsapp:false },
    twilio_account_sid: '', twilio_auth_token: '', twilio_phone_number: '', resend_api_key: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          business_name:      data.business_name || '',
          phone:              data.phone || '',
          message_templates:  data.message_templates || DEFAULT_TEMPLATES,
          reminder_schedule:  data.reminder_schedule || [{ value:24, unit:'hours' }],
          channels:           data.channels || { sms:true, email:false, whatsapp:false },
          twilio_account_sid: data.twilio_account_sid || '',
          twilio_auth_token:  data.twilio_auth_token || '',
          twilio_phone_number:data.twilio_phone_number || '',
          resend_api_key:     data.resend_api_key || '',
        })
      } else {
        // First login — insert a fresh profile row
        const { data: { user: u } } = await supabase.auth.getUser()
        await supabase.from('profiles').insert({ id: u.id })
      }
      setLoading(false)
    }
    load()
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setChannel = (k, v) => setForm(p => ({ ...p, channels: { ...p.channels, [k]: v } }))

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').upsert({ id: user.id, ...form })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function updateTemplate(i, field, value) {
    const t = form.message_templates.map((tpl, idx) => idx === i ? { ...tpl, [field]: value } : tpl)
    set('message_templates', t)
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Settings</h1>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Configure your account and reminders</div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:8 }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Business */}
      <Section title="Business Details" sub="Used in your reminder messages">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
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

      {/* Message Templates */}
      <Section title="Message Templates" sub="3 customisable templates — pick one per appointment. Use {name}, {time}, {business_phone} as placeholders.">
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

      {/* Reminder Schedule */}
      <Section title="Reminder Schedule" sub="Send up to 5 reminders before each appointment.">
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {form.reminder_schedule.map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
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
                style={{ border:'1.5px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:14, fontFamily:'inherit', outline:'none', background:'#fff', cursor:'pointer', flex:1 }}
                onFocus={e => e.target.style.borderColor='#a855f7'} onBlur={e => e.target.style.borderColor='#e2e8f0'}
              >
                <option value="hours">hours before</option>
                <option value="days">days before</option>
                <option value="weeks">weeks before</option>
              </select>
              {form.reminder_schedule.length > 1 && (
                <button onClick={() => set('reminder_schedule', form.reminder_schedule.filter((_, j) => j !== i))}
                  style={{ width:30, height:30, borderRadius:'50%', border:'1px solid #fecdd3', background:'#fff5f5', color:'#ef4444', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>×</button>
              )}
            </div>
          ))}
          {form.reminder_schedule.length < 5 && (
            <button onClick={() => set('reminder_schedule', [...form.reminder_schedule, { value:24, unit:'hours' }])}
              style={{ alignSelf:'flex-start', marginTop:4, padding:'8px 16px', borderRadius:8, border:'1.5px dashed #e9d5ff', background:'#faf5ff', color:'#a855f7', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
              onMouseEnter={e => e.target.style.borderColor='#a855f7'} onMouseLeave={e => e.target.style.borderColor='#e9d5ff'}>
              + Add another reminder
            </button>
          )}
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>
            e.g. send one 24 hours before <em>and</em> one 2 hours before for a double reminder.
          </div>
        </div>
      </Section>

      {/* Channels */}
      <Section title="Reminder Channels" sub="Choose how reminders are sent">
        {[
          { key:'sms',      icon:'📱', label:'SMS',      desc:'Text message via Twilio' },
          { key:'email',    icon:'✉️', label:'Email',    desc:'Email via Resend' },
          { key:'whatsapp', icon:'💬', label:'WhatsApp', desc:'WhatsApp Business via Twilio' },
        ].map(ch => (
          <div key={ch.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid #f1f5f9' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:22 }}>{ch.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#0f172a' }}>{ch.label}</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>{ch.desc}</div>
              </div>
            </div>
            <button onClick={() => setChannel(ch.key, !form.channels[ch.key])}
              style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', background:form.channels[ch.key]?'#a855f7':'#e2e8f0', transition:'all 0.2s', position:'relative' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:form.channels[ch.key]?23:3, transition:'all 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
            </button>
          </div>
        ))}
      </Section>

      {/* Calendar */}
      <Section title="Calendar Connection" sub="Connect your calendar to automatically import appointments">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          {[
            { key:'google',  icon:'📅', label:'Google Calendar', desc:'Gmail / Google Workspace' },
            { key:'apple',   icon:'🍎', label:'Apple Calendar',  desc:'iCloud Calendar' },
            { key:'outlook', icon:'💼', label:'Outlook',         desc:'Microsoft 365' },
          ].map(cal => (
            <div key={cal.key} style={{ border:`1px solid ${profile?.calendar_provider===cal.key?'#a855f7':'#e2e8f0'}`, borderRadius:10, padding:'14px 16px', background:profile?.calendar_provider===cal.key?'#f3e8ff':'#fff', textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{cal.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:3 }}>{cal.label}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:10 }}>{cal.desc}</div>
              {profile?.calendar_provider === cal.key ? (
                <div style={{ fontSize:11, color:'#22c55e', fontWeight:700 }}>✓ Connected</div>
              ) : (
                <button
                  onClick={cal.key === 'google' ? connectGoogle : undefined}
                  style={{ fontSize:11, fontWeight:700, color:'#a855f7', background:'none', border:'1px solid #e9d5ff', borderRadius:6, padding:'5px 12px', cursor:cal.key==='google'?'pointer':'not-allowed', fontFamily:'inherit', opacity:cal.key==='google'?1:0.5 }}>
                  {cal.key === 'google' ? 'Connect' : 'Coming soon'}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Twilio */}
      <Section title="Twilio (SMS & WhatsApp)" sub="Add your Twilio credentials to enable SMS and WhatsApp sending. Get these from twilio.com">
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { label:'Account SID',  key:'twilio_account_sid',  placeholder:'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
            { label:'Auth Token',   key:'twilio_auth_token',   placeholder:'Your Twilio auth token', type:'password' },
            { label:'Phone Number', key:'twilio_phone_number', placeholder:'+441234567890' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:5 }}>{f.label}</label>
              <input type={f.type||'text'} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className="input"/>
            </div>
          ))}
        </div>
      </Section>

      {/* Resend */}
      <Section title="Resend (Email)" sub="Add your Resend API key to enable email reminders. Get one free at resend.com">
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:5 }}>Resend API Key</label>
          <input type="password" value={form.resend_api_key} onChange={e => set('resend_api_key', e.target.value)} placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="input"/>
        </div>
      </Section>

      {/* Plan */}
      <Section title="Plan & Billing">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:profile?.plan==='trial'?'#fef9c3':profile?.plan==='annual'?'#f0fdf4':'#fdf4ff', borderRadius:10, border:'1px solid #e9d5ff' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', textTransform:'capitalize' }}>{profile?.plan || 'Trial'} Plan</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
              {profile?.plan==='trial'
                ? 'Trial active'
                : profile?.plan==='pro' ? '20/month' : '180/year'}
            </div>
          </div>
          {(!profile?.plan || profile?.plan === 'trial') && (
            <a href="https://buy.stripe.com/placeholder" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, textDecoration:'none' }}>Upgrade</a>
          )}
        </div>
      </Section>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
        <button onClick={save} disabled={saving} className="btn-primary" style={{ padding:'13px 32px', fontSize:15 }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
