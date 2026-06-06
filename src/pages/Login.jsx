import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import Logo from '../components/Logo.jsx'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  useEffect(() => {
    document.title = 'Log In — TextReminder'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'Log in to your TextReminder account to manage your SMS appointment reminders.')
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}><Logo size={48}/></div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Welcome back</h1>
          <p style={{ color:'#6b7280', fontSize:14 }}>Sign in to your TextReminder account</p>
        </div>
        <div style={{ background:'#fff', borderRadius:16, padding:28, boxShadow:'0 4px 24px rgba(168,85,247,0.1)', border:'1px solid #f3e8ff' }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required className="input"/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', letterSpacing:'0.5px', textTransform:'uppercase', display:'block', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required className="input"/>
            </div>
            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#dc2626', marginBottom:16 }}>{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', padding:14, fontSize:15 }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0 4px' }}>
            <div style={{ flex:1, height:1, background:'#e5e7eb' }}/><span style={{ fontSize:13, color:'#9ca3af' }}>or</span><div style={{ flex:1, height:1, background:'#e5e7eb' }}/>
          </div>
          <button type="button" onClick={handleGoogle} disabled={loading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'11px 14px', border:'1px solid #e5e7eb', borderRadius:10, background:'#fff', cursor:'pointer', fontSize:14, fontWeight:500, color:'#0f172a', marginBottom:16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div style={{ textAlign:'center', fontSize:13, color:'#6b7280' }}>
            No account? <Link to="/signup" style={{ color:'#a855f7', fontWeight:600 }}>Start free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
