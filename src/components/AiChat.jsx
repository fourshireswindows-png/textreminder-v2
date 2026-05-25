import { useState, useEffect, useRef } from 'react'
import Logo from './Logo.jsx'

const SYSTEM_PROMPT = `You are the friendly AI assistant for TextReminder (textreminder.co.uk) — the UK's appointment reminder service built for tradespeople. You're helpful, knowledgeable, and speak plainly like you're talking to a busy tradesperson who doesn't have time for waffle.

You know the product inside out:
- TextReminder sends automatic SMS, email and WhatsApp reminders to customers 24 hours before appointments
- It connects to Google Calendar, Apple Calendar, and Microsoft Outlook
- Pricing: £20/month or £180/year
- 14-day free trial, no credit card required
- Built for UK tradespeople — window cleaners, plumbers, electricians, gardeners, hairdressers, and anyone with appointments
- Setup takes about 5 minutes

Common questions you handle:
- How do I connect my Google Calendar?
- How do I add contacts?
- How do I change the reminder message?
- Can I send WhatsApp reminders?
- How much does it cost?
- How do I cancel?
- Why hasn't my reminder sent?
- Is my data safe? (Yes — GDPR compliant, data stored in UK)
- Can I use it for multiple staff? (Currently single user, team plans coming)

Keep answers short, friendly, and practical. If someone has a technical issue you can't resolve, tell them to email hello@textreminder.co.uk and someone will get back within 4 hours on weekdays.`

export default function AiChat() {
  const [open, setOpen]       = useState(false)
  const [msgs, setMsgs]       = useState([{ role:'assistant', content:"Hi! I'm the TextReminder assistant. Ask me anything about the product — setup, pricing, how it works. I'm here to help 👋" }])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...msgs, { role:'user', content:text }]
    setMsgs(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: next.map(m => ({ role:m.role, content:m.content }))
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || "Sorry, something went wrong. Email hello@textreminder.co.uk and we'll get back to you."
      setMsgs(p => [...p, { role:'assistant', content:reply }])
    } catch(e) {
      setMsgs(p => [...p, { role:'assistant', content:"Something went wrong. Email hello@textreminder.co.uk and we'll be back to you within 4 hours." }])
    }
    setLoading(false)
  }

  const S = {
    bubble: {
      position:'fixed', bottom:20, right:20, zIndex:1000,
      width:52, height:52, borderRadius:'50%',
      background:'linear-gradient(135deg,#ec4899,#a855f7)',
      border:'none', cursor:'pointer', display:'flex',
      alignItems:'center', justifyContent:'center',
      boxShadow:'0 4px 20px rgba(168,85,247,0.4)',
      fontSize:22, transition:'all 0.2s',
    },
    window: {
      position:'fixed', bottom:84, right:20, zIndex:1000,
      width:320, maxHeight:440,
      background:'#fff', borderRadius:16,
      border:'1px solid #e9d5ff',
      boxShadow:'0 12px 40px rgba(0,0,0,0.15)',
      display:'flex', flexDirection:'column', overflow:'hidden',
    },
    header: {
      background:'linear-gradient(135deg,#ec4899,#a855f7)',
      padding:'14px 16px', display:'flex',
      alignItems:'center', justifyContent:'space-between',
    },
    msgs: {
      flex:1, overflowY:'auto', padding:14,
      display:'flex', flexDirection:'column', gap:10,
    },
    inputRow: {
      padding:'10px 12px', borderTop:'1px solid #f3e8ff',
      display:'flex', gap:8,
    },
  }

  return (
    <>
      {open && (
        <div style={S.window}>
          <div style={S.header}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Logo size={28}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>TextReminder Assistant</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.7)'}}>Always online</div>
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:26,height:26,cursor:'pointer',color:'#fff',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
          <div style={S.msgs}>
            {msgs.map((m,i) => (
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                <div style={{maxWidth:'82%',background:m.role==='user'?'linear-gradient(135deg,#ec4899,#a855f7)':'#f8fafc',color:m.role==='user'?'#fff':'#0f172a',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px',fontSize:13,lineHeight:1.55,border:m.role==='assistant'?'1px solid #f3e8ff':'none'}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',gap:4,padding:'10px 14px',background:'#f8fafc',borderRadius:'14px 14px 14px 4px',width:'fit-content',border:'1px solid #f3e8ff'}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#a855f7',animation:`pulse 1s ease-in-out ${i*0.2}s infinite`}}/>)}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={S.inputRow}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything..." className="input" style={{fontSize:13,padding:'8px 11px'}}/>
            <button onClick={send} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?'linear-gradient(135deg,#ec4899,#a855f7)':'#e2e8f0',color:input.trim()&&!loading?'#fff':'#94a3b8',border:'none',borderRadius:8,padding:'8px 14px',cursor:'pointer',fontWeight:700,fontSize:13,transition:'all 0.2s'}}>→</button>
          </div>
        </div>
      )}
      <button style={S.bubble} onClick={()=>setOpen(p=>!p)}>
        {open ? '×' : '💬'}
      </button>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </>
  )
}
