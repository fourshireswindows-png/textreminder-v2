import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import Logo from '../components/Logo.jsx'

export default function Signup() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [business, setBusiness]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const navigate                  = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data?.user) {
      await supabase.from('profiles').update({ business_name: business }).eq('id', data.user.id)
    }
    setConfirmed(true)
    setLoading(false)
  }

  if (confirmed) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Check your email</h2>
        <p style={{ color:'#6b7280', fontSize:14, lineHeight:1.7, marginBottom:24 }}>We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your 14-day free trial.</p>
        <Link to="/login" style={{ color:'#a855f7', fontWeight:600, fontSize:14 }}>Back to login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><Logo size={48}/></div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Start your free trial</h1>
          <p style={{ color:'#6b7280', fontSize:14 }}>14 days free · No credit card required</p>
        </div>

        {/* Benefits */}
        <div style={{ background:'linear-gradient(135deg,rgba(236,72,153,0.06),rgba(168,85,247,0.06))', border:'1px solid #f3e8ff', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
          {['Automatic SMS, email & WhatsApp reminders','Works with Google, Apple & Outlook Calendar','Set up in 5 minutes · Cancel anytime'].map((t,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#374151', marginBottom:i<2?6:0 }}>
              <span style={{ color:'#22c55e', fontWeight:700 }}>✓</span>{t}
            </div>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:16, padding:28, boxShadow:'0 4px 24px rgba(168,85,247,0.1)', border:'1px solid #f3e8ff' }}>
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Business Name</label>
              <input value={business} onChange={e=>setBusiness(e.target.value)} placeholder="e.g. Four Shires Window Cleaning" className="input"/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Email Address</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required className="input"/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="6+ characters" required className="input"/>
            </div>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626', marginBottom:16 }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', padding:14, fontSize:15 }}>
              {loading ? 'Creating account...' : 'Start Free Trial →'}
            </button>
            <div style={{ fontSize:11, color:'#9ca3af', textAlign:'center', marginTop:10 }}>By signing up you agree to our Terms and Privacy Policy</div>
          </form>
          <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#6b7280' }}>
            Already have an account? <Link to="/login" style={{ color:'#a855f7', fontWeight:600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
