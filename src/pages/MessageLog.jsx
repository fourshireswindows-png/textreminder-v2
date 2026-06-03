import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

function formatDate(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export default function MessageLog() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending:false })
      .limit(100)
    setReminders(data || [])
    setLoading(false)
    return user.id
  }

  useEffect(() => {
    let channel
    load().then(userId => {
      channel = supabase
        .channel('reminders-log')
        .on('postgres_changes', { event:'*', schema:'public', table:'reminders', filter:`user_id=eq.${userId}` }, () => load())
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const filters = ['all','sent','failed','pending','cancelled']
  const filtered = filter === 'all' ? reminders : reminders.filter(r => r.status === filter)

  const statusStyle = (status) => {
    if (status === 'sent' || status === 'delivered') return { bg:'#dcfce7', color:'#166534' }
    if (status === 'failed') return { bg:'#fef2f2', color:'#dc2626' }
    if (status === 'pending') return { bg:'#fef9c3', color:'#854d0e' }
    return { bg:'#f1f5f9', color:'#64748b' }
  }

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Message Log</h1>
        <div style={{ fontSize:13, color:'#94a3b8' }}>Complete history of all reminders</div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {filters.map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===f?'#a855f7':'#e2e8f0'}`, background:filter===f?'#f3e8ff':'#fff', color:filter===f?'#7c3aed':'#64748b', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr 1.5fr 100px', gap:12, padding:'10px 20px', borderBottom:'1px solid #e2e8f0', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          <div>Contact</div>
          <div>Phone</div>
          <div>Message</div>
          <div>Scheduled</div>
          <div>Status</div>
        </div>

        {loading && <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:600, color:'#475569' }}>No messages yet</div>
          </div>
        )}
        {filtered.map((r) => {
          const s = statusStyle(r.status)
          return (
            <div key={r.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr 1.5fr 100px', gap:12, padding:'14px 20px', borderBottom:'1px solid #f8fafc', alignItems:'center' }}>
              <div style={{ fontWeight:600, color:'#0f172a', fontSize:13 }}>{r.contact_name || '—'}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{r.contact_phone || '—'}</div>
              <div style={{ fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.message}>{r.message}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{formatDate(r.scheduled_for || r.appointment_time || r.sent_at)}</div>
              <div>
                <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:s.bg, color:s.color, textTransform:'capitalize' }}>
                  {r.status}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
