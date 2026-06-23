import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  useEffect(() => {
    document.title = 'Log In — TextReminder'
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/upcoming')
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } } })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <svg width="38" height="38" viewBox="0 0 48 48" fill="none">
              <defs><linearGradient id="lg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
              <path d="M6 8C6 5.79 7.79 4 10 4H38C40.21 4 42 5.79 42 8V30C42 32.21 40.21 34 38 34H26L18 42V34H10C7.79 34 6 32.21 6 30V8Z" fill="url(#lg)"/>
              <rect x="14" y="14" width="20" height="3" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="14" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.9"/>
              <circle cx="37" cy="11" r="8" fill="#22c55e"/>
              <path d="M33 11L36 14L41 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight:800, fontSize:20, letterSpacing:'-0.3px' }}>
              <span style={{ color:'#fff' }}>text</span><span style={{ color:'#ec4899' }}>reminder</span>
            </span>
          </div>
          <h1 style={{ fontFamily:'DM Sans,sans-serif', fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', marginBottom:8 }}>Welcome back</h1>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:15, lineHeight:1.5 }}>Sign in to manage your appointment reminders</p>
        </div>

        {/* Card */}
        <div style={{ background:'#1e293b', borderRadius:16, padding:28, border:'1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'0.8px', textTransform:'uppercase', display:'block', marginBottom:7 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'DM Sans,sans-serif', transition:'border-color 0.15s' }}
                onFocus={e=>e.target.style.borderColor='#ec4899'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'0.8px', textTransform:'uppercase', display:'block', marginBottom:7 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'DM Sans,sans-serif', transition:'border-color 0.15s' }}
                onFocus={e=>e.target.style.borderColor='#ec4899'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'}/>
            </div>
            {error && <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#fca5a5', marginBottom:16 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width:'100%', padding:'13px', fontSize:15, fontWeight:700, background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'DM Sans,sans-serif', letterSpacing:'-0.1px', opacity:loading?0.7:1 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', fontWeight:500 }}>or</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }}/>
          </div>

          <button type="button" onClick={handleGoogle} disabled={loading}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'12px 14px', border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:8, background:'rgba(255,255,255,0.05)', cursor:'pointer', fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.85)', fontFamily:'DM Sans,sans-serif', transition:'all 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.25)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.35)' }}>
            No account?{' '}
            <Link to="/signup" style={{ color:'#ec4899', fontWeight:600, textDecoration:'none' }}>Start free</Link>
          </div>
        </div>
      </div>
    </div>
  )}
