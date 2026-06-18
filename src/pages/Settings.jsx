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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, color:'#0f172a', marginBottom:4, letterSpacing:'-0.6px' }}>Settings</h1>
          <div style={{ fontSize:13, color:'#94a3b8' }}>Configure your account and reminders</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ display:'flex', alignItems:'center', gap:8 }}>
            {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save Changes'}
          </button>
          {saveError && <div style={{ fontSize:11, color:'#ef4444', maxWidth:220, textAlign:'right' }}>{saveError}</div>}
        </div>
      </div>

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

    </div>
  )
}
