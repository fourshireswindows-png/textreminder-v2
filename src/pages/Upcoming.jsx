import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { Link } from 'react-router-dom'

export default function Upcoming() {
  const [events, setEvents]   = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [sent, setSent]       = useState(new Set())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: evs }, { data: prof }] = await Promise.all([
        supabase.from('calendar_events').select('*').eq('user_id', user.id).gte('start_time', new Date().toISOString()).order('start_time').limit(50),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      setEvents(evs || [])
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [])

  async function sendReminder(event, idx) {
    setSending(idx)
    const { data: { user } } = await supabase.auth.getUser()
    const msg = (profile?.message_template || 'Hi {name}, reminder: appointment tomorrow at {time}.')
      .replace('{name}', event.title || 'there')
      .replace('{time}', new Date(event.start_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }))
      .replace('{business_phone}', profile?.phone || '')
    await supabase.from('reminders').insert({ user_id:user.id, contact_name:event.title||'Customer', appointment_time:event.start_time, channel:'sms', message:msg, status:'sent', sent_at:new Date().toISOString(), calendar_event_id:event.external_id })
    await supabase.from('calendar_events').update({ reminder_sent:true }).eq('id', event.id)
    setSent(prev => new Set([...prev, idx]))
    setSending(null)
  }

  function dayLabel(dateStr) {
    const d = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' })
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Upcoming Appointments</h1>
        <div style={{ fontSize:13, color:'#94a3b8', display:'flex', alignItems:'center', gap:8 }}>
          {profile?.calendar_provider ? (
            <><span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/> Synced from {profile.calendar_provider} calendar</>
          ) : (
            <><span style={{ color:'#f59e0b' }}>⚠</span> No calendar connected — <Link to="/settings" style={{ color:'#a855f7', fontWeight:600 }}>connect one in Settings</Link></>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display:'grid', gridTemplateColumns:'120px 100px 1fr 1fr 120px', padding:'10px 20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', gap:12 }}>
          {['When','Time','Title','Location','Action'].map(h=><div key={h} style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>)}
        </div>
        {loading && <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>}
        {!loading && events.length === 0 && (
          <div style={{ padding:'48px 20px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📅</div>
            <div style={{ fontWeight:600, color:'#475569', marginBottom:6 }}>No upcoming appointments</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>{profile?.calendar_provider ? 'Your calendar appears empty' : 'Connect your calendar in Settings to see appointments here'}</div>
          </div>
        )}
        {events.map((e,i) => {
          const isToday = new Date(e.start_time).toDateString() === new Date().toDateString()
          return (
            <div key={e.id} style={{ display:'grid', gridTemplateColumns:'120px 100px 1fr 1fr 120px', padding:'13px 20px', borderBottom:'1px solid #f8fafc', background:isToday?'#fffbeb':'#fff', gap:12, alignItems:'center' }}>
              <div>
                <span style={{ display:'inline-block', background:isToday?'#fef3c7':'#f1f5f9', color:isToday?'#92400e':'#475569', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>
                  {dayLabel(e.start_time)}
                </span>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{new Date(e.start_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}</div>
              <div style={{ fontSize:13, color:'#334155' }}>{e.title || 'Appointment'}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>{e.location || '—'}</div>
              <button onClick={()=>sendReminder(e,i)} style={{
                background: sent.has(i)||e.reminder_sent ? '#dcfce7' : sending===i ? '#dbeafe' : 'linear-gradient(135deg,#ec4899,#a855f7)',
                color: sent.has(i)||e.reminder_sent ? '#166534' : sending===i ? '#1e40af' : '#fff',
                border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700,
                cursor:sent.has(i)||e.reminder_sent?'default':'pointer', fontFamily:'inherit',
              }}>
                {sent.has(i)||e.reminder_sent ? '✓ Sent' : sending===i ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
