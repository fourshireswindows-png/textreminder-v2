import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { Link } from 'react-router-dom'

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'20px 22px' }}>
      <div style={{ fontSize:22, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:800, color:'#0f172a', lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:11, color:'#94a3b8' }}>{sub}</div>
    </div>
  )
}

function SendBtn({ onClick, sent, sending }) {
  return (
    <button onClick={onClick} style={{
      background: sent ? '#dcfce7' : sending ? '#dbeafe' : 'linear-gradient(135deg,#ec4899,#a855f7)',
      color: sent ? '#166534' : sending ? '#1e40af' : '#fff',
      border:'none', borderRadius:8, padding:'7px 16px', fontSize:12,
      fontWeight:700, cursor:sent?'default':'pointer', fontFamily:'inherit',
      whiteSpace:'nowrap', transition:'all 0.2s',
    }}>
      {sent ? '✓ Sent' : sending ? 'Sending...' : 'Send SMS'}
    </button>
  )
}

export default function Dashboard() {
  const [profile, setProfile]     = useState(null)
  const [reminders, setReminders] = useState([])
  const [contacts, setContacts]   = useState([])
  const [upcoming, setUpcoming]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(null)
  const [sent, setSent]           = useState(new Set())

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: rems }, { data: conts }, { data: events }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reminders').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(50),
        supabase.from('contacts').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('calendar_events').select('*').eq('user_id', user.id).eq('reminder_sent', false).gte('start_time', new Date().toISOString()).order('start_time').limit(10),
      ])
      setProfile(prof)
      setReminders(rems || [])
      setContacts(conts || [])
      setUpcoming(events || [])
      setLoading(false)
    }
    load()
  }, [])

  async function sendReminder(event, idx) {
    setSending(idx)
    const { data: { user } } = await supabase.auth.getUser()
    const msg = (profile?.message_template || 'Hi {name}, reminder: appointment tomorrow at {time}. Call {business_phone} with questions.')
      .replace('{name}', event.title || 'there')
      .replace('{time}', new Date(event.start_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }))
      .replace('{business_phone}', profile?.phone || '')
    await supabase.from('reminders').insert({
      user_id: user.id,
      contact_name: event.title || 'Customer',
      appointment_time: event.start_time,
      channel: 'sms',
      message: msg,
      status: 'sent',
      sent_at: new Date().toISOString(),
      calendar_event_id: event.external_id,
    })
    await supabase.from('calendar_events').update({ reminder_sent:true }).eq('id', event.id)
    setSent(prev => new Set([...prev, idx]))
    setSending(null)
  }

  const sentCount   = reminders.filter(r => r.status === 'sent' || r.status === 'delivered').length
  const thisMonth   = reminders.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length
  const dueToday    = upcoming.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())

  if (loading) return <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>Loading dashboard...</div>

  const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - new Date()) / (1000*60*60*24))) : 0
  const onTrial = profile?.plan === 'trial'

  return (
    <div>
      {/* Trial banner */}
      {onTrial && trialDaysLeft > 0 && (
        <div style={{ background:'linear-gradient(135deg,#fdf4ff,#faf5ff)', border:'1px solid #e9d5ff', borderRadius:12, padding:'12px 18px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ fontSize:13, color:'#7c3aed' }}>
            <strong>{trialDaysLeft} days</strong> left on your free trial
          </div>
          <Link to="/settings" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:700, textDecoration:'none' }}>Upgrade — £20/month</Link>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Dashboard</h1>
        <div style={{ fontSize:13, color:'#94a3b8' }}>{new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
        <StatCard icon="📤" label="Reminders sent" value={sentCount} sub="All time"/>
        <StatCard icon="📅" label="This month" value={thisMonth} sub="Reminders sent"/>
        <StatCard icon="👥" label="Contacts" value={contacts.length} sub="Active customers"/>
        <StatCard icon="⏰" label="Due today" value={dueToday.length} sub="Need reminders"/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20 }}>
        {/* Upcoming */}
        <div className="card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Upcoming Appointments</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>From your connected calendar</div>
            </div>
            <Link to="/upcoming" style={{ fontSize:12, color:'#a855f7', fontWeight:600 }}>See all →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
              {profile?.calendar_provider ? 'No upcoming appointments found' : (
                <div>
                  <div style={{ fontSize:24, marginBottom:8 }}>📅</div>
                  <div style={{ fontWeight:600, color:'#475569', marginBottom:6 }}>No calendar connected</div>
                  <Link to="/settings" style={{ color:'#a855f7', fontWeight:600 }}>Connect your calendar →</Link>
                </div>
              )}
            </div>
          ) : upcoming.map((e, i) => (
            <div key={e.id} style={{ padding:'13px 20px', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{e.title || 'Appointment'}</div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                  {new Date(e.start_time).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })} · {new Date(e.start_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
              <SendBtn onClick={()=>sendReminder(e,i)} sent={sent.has(i)} sending={sending===i}/>
            </div>
          ))}
        </div>

        {/* Recent reminders */}
        <div className="card">
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Recent Reminders</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>Last sent messages</div>
            </div>
            <Link to="/log" style={{ fontSize:12, color:'#a855f7', fontWeight:600 }}>View log →</Link>
          </div>
          {reminders.length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>No reminders sent yet</div>
          ) : reminders.slice(0,6).map((r,i) => (
            <div key={r.id} style={{ padding:'12px 20px', borderBottom:'1px solid #f8fafc', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#fdf4ff,#f3e8ff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                {r.channel === 'sms' ? '📱' : r.channel === 'email' ? '✉️' : '💬'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:1 }}>{r.contact_name}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, background:r.status==='sent'||r.status==='delivered'?'#dcfce7':'#fef2f2', color:r.status==='sent'||r.status==='delivered'?'#166534':'#dc2626' }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
