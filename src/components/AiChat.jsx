import { useState, useEffect, useRef } from 'react'

const ELLIE_PHOTO = '/ellie.jpg'

const QUICK_REPLIES = [
  'How does it work?',
  'What does it cost?',
  'Will my customers actually read it?',
  'Get started',
]

export default function AiChat() {
  const [open, setOpen]       = useState(false)
  const [visible, setVisible] = useState(false)
  const [msgs, setMsgs]       = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const bottomRef             = useRef(null)

  // Show bubble after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 8000)
    return () => clearTimeout(t)
  }, [])

  // Send opening message when first opened
  useEffect(() => {
    if (open && !started) {
      setStarted(true)
      setMsgs([{ role: 'assistant', content: "Hi! I'm Ellie 👋 I help tradespeople stop losing jobs to no-shows. What can I help you with today?", quickReplies: true }])
    }
  }, [open, started])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, open])

  async function send(text) {
    const t = (text || input).trim()
    if (!t || loading) return
    const next = [...msgs.filter(m => !m.quickReplies || m !== msgs[msgs.length - 1]), { role: 'user', content: t }]
    // Remove quickReplies flag from all messages
    const cleanMsgs = next.map(m => ({ role: m.role, content: m.content }))
    setMsgs(cleanMsgs)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('https://fxzfaxlhhypiigcmlasx.supabase.co/functions/v1/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': 'sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO' },
        body: JSON.stringify({ messages: cleanMsgs })
      })
      const data = await res.json()
      const reply = data.reply || "Sorry, something went wrong. Email hello@textreminder.co.uk and we'll get back to you."
      setMsgs(p => [...p, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(p => [...p, { role: 'assistant', content: "Something went wrong. Email hello@textreminder.co.uk and we'll be back to you within 4 hours." }])
    }
    setLoading(false)
  }

  if (!visible) return null

  const pink   = '#ec4899'
  const purple = '#a855f7'
  const grad   = `linear-gradient(135deg, ${pink}, ${purple})`

  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 20, zIndex: 1000,
          width: 340, maxHeight: 480,
          background: '#fff', borderRadius: 18,
          border: '1px solid #e9d5ff',
          boxShadow: '0 16px 50px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'ellieSlideUp 0.25s ease',
        }}>
          {/* Header */}
          <div style={{ background: grad, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={ELLIE_PHOTO} alt="Ellie"
                style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }}
                onError={e => { e.target.style.display = 'none' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Ellie</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>TextReminder Support</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 7 }}>
                  {m.role === 'assistant' && (
                    <img src={ELLIE_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginBottom: 2 }}
                      onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <div style={{
                    maxWidth: '80%',
                    background: m.role === 'user' ? grad : '#f8fafc',
                    color: m.role === 'user' ? '#fff' : '#0f172a',
                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '9px 13px', fontSize: 13, lineHeight: 1.55,
                    border: m.role === 'assistant' ? '1px solid #f3e8ff' : 'none',
                  }}>
                    {m.content}
                  </div>
                </div>
                {/* Quick reply buttons */}
                {m.quickReplies && i === msgs.length - 1 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginLeft: 31 }}>
                    {QUICK_REPLIES.map(qr => (
                      <button key={qr} onClick={() => send(qr)}
                        style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: '#fff', border: `1px solid #e9d5ff`, borderRadius: 16, cursor: 'pointer', color: purple, fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.target.style.background = '#faf5ff'; e.target.style.borderColor = purple }}
                        onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e9d5ff' }}>
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
                <img src={ELLIE_PHOTO} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }} />
                <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#f8fafc', borderRadius: '14px 14px 14px 4px', border: '1px solid #f3e8ff' }}
>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: purple, animation: `ellieTyping 1s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #f3e8ff', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask anything..."
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = pink}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            <button onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ background: input.trim() && !loading ? grad : '#e2e8f0', color: input.trim() && !loading ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: input.trim() && !loading ? 'pointer' : 'default', fontWeight: 700, fontSize: 14, transition: 'all 0.2s', fontFamily: 'inherit' }}>
              →
            </button>
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          background: grad, border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(168,85,247,0.45)',
          padding: 0, overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(168,85,247,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.45)' }}
        title="Chat with Ellie"
      >
        {open ? (
          <span style={{ color: '#fff', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>×</span>
        ) : (
          <img src={ELLIE_PHOTO} alt="Chat with Ellie" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">💬</span>' }} />
        )}
      </button>

      <style>{`
        @keyframes ellieSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ellieTyping { 0%,100% { opacity:.3; transform:scale(.8) } 50% { opacity:1; transform:scale(1) } }
      `}</style>
    </>
  )
}
