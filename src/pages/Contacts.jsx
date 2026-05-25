import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

function Modal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', phone:'', email:'', whatsapp:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function save() {
    if (!form.name) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('contacts').insert({ user_id:user.id, ...form }).select().single()
    setSaving(false)
    onSave(data)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(2px)' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Add Contact</h2>
        <p style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>Add a customer to your reminder list</p>
        {[
          { label:'Full Name *', key:'name', placeholder:'Sarah Mitchell', type:'text' },
          { label:'Mobile Number', key:'phone', placeholder:'07712 345 678', type:'tel' },
          { label:'Email Address', key:'email', placeholder:'sarah@example.com', type:'email' },
          { label:'WhatsApp Number', key:'whatsapp', placeholder:'Same as mobile if same', type:'tel' },
          { label:'Notes', key:'notes', placeholder:'Any useful info...', type:'text' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:5 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} className="input"/>
          </div>
        ))}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button onClick={onClose} style={{ flex:1, background:'#f1f5f9', color:'#475569', border:'none', borderRadius:8, padding:12, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={save} disabled={!form.name||saving} className="btn-primary" style={{ flex:2, padding:12, fontSize:13 }}>{saving?'Adding...':'Add Contact'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('name')
      setContacts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function deleteContact(id) {
    if (!confirm('Remove this contact?')) return
    await supabase.from('contacts').update({ active:false }).eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4, fontFamily:'Syne,sans-serif' }}>Contacts</h1>
          <div style={{ fontSize:13, color:'#94a3b8' }}>{contacts.length} customers</div>
        </div>
        <button onClick={()=>setShowModal(true)} className="btn-primary">+ Add Contact</button>
      </div>

      <div style={{ marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name, phone or email..." className="input" style={{ maxWidth:360 }}/>
      </div>

      <div className="card">
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 80px', padding:'10px 20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', gap:12 }}>
          {['Name','Phone','Email',''].map(h=><div key={h} style={{ fontSize:10, fontWeight:700, color:'#94a3b8', letterSpacing:'1px', textTransform:'uppercase' }}>{h}</div>)}
        </div>
        {loading && <div style={{ padding:'40px 20px', textAlign:'center', color:'#94a3b8' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:'48px 20px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:10 }}>👥</div>
            <div style={{ fontWeight:600, color:'#475569', marginBottom:6 }}>{contacts.length === 0 ? 'No contacts yet' : 'No results'}</div>
            <div style={{ fontSize:13, color:'#94a3b8' }}>{contacts.length === 0 ? 'Add your first customer to get started' : 'Try a different search'}</div>
          </div>
        )}
        {filtered.map((c,i) => (
          <div key={c.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.5fr 80px', padding:'13px 20px', borderBottom:'1px solid #f8fafc', background:i%2===0?'#fff':'#fafafa', gap:12, alignItems:'center' }}>
            <div style={{ fontWeight:600, color:'#0f172a', fontSize:13 }}>{c.name}</div>
            <div style={{ fontSize:12, color:'#64748b' }}>{c.phone || '—'}</div>
            <div style={{ fontSize:12, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email || '—'}</div>
            <button onClick={()=>deleteContact(c.id)} style={{ background:'none', border:'1px solid #fee2e2', borderRadius:6, padding:'4px 10px', fontSize:11, color:'#dc2626', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Remove</button>
          </div>
        ))}
      </div>

      {showModal && <Modal onClose={()=>setShowModal(false)} onSave={c=>{setContacts(prev=>[...prev,c]);setShowModal(false)}}/>}
    </div>
  )
}
