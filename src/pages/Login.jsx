import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import Logo from '../components/Logo.jsx'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
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
          <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#6b7280' }}>
            No account? <Link to="/signup" style={{ color:'#a855f7', fontWeight:600 }}>Start free trial</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
