import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

export default function MessageLog() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('reminders').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(100)
      setReminders(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const channelIcon = { sms:'📱', email:'✉️', whatsapp:'💬' }
  const filtered = filter === 'all' ? reminders : reminders.filter(r => r.channel === filter || r.status === filter)

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Message Log</h1>
        <div style={{ fontSize:13, color:'#94a3b8' }}>{reminders.length} reminders sent</div>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['all','sms','email','whatsapp','sent','failed'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filter===f?'#a855f7':'#e2e8f0'}`, background:filter===f?'#f3e8ff':'#fff', color:filter===f?'#7c3aed':'#64748b', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>{f}</button>
        ))}
      </div>

      <div className="card">
        {loading && <div style={{ padding:'40px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            <div style={{ fontWeight:600, color:'#475569' }}>No messages yet</div>
          </div>
        )}
        {filtered.map((r,i) => (
          <div key={r.id} style={{ padding:'16px 20px', borderBottom:'1px solid #f8fafc', display:'flex', gap:14, alignItems:'flex-start' }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'#f3e8ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
              {channelIcon[r.channel] || '📱'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <div style={{ fontWeight:700, color:'#0f172a', fontSize:13 }}>{r.contact_name}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <div style={{ fontSize:12, color:'#64748b', background:'#f8fafc', borderRadius:8, padding:'8px 10px', lineHeight:1.6, marginBottom:6 }}>{r.message}</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:r.status==='sent'||r.status==='delivered'?'#dcfce7':'#fef2f2', color:r.status==='sent'||r.status==='delivered'?'#166534':'#dc2626' }}>
                  {r.status==='sent'||r.status==='delivered' ? '✓ Delivered' : '✗ Failed'}
                </span>
                <span style={{ fontSize:11, color:'#94a3b8', textTransform:'capitalize' }}>{r.channel}</span>
                {r.appointment_time && <span style={{ fontSize:11, color:'#94a3b8' }}>Appt: {new Date(r.appointment_time).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
