import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? '/login' : '/upcoming', { replace: true })
      })
    } else {
      // Fallback: check if session already established (e.g. implicit flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        navigate(session ? '/upcoming' : '/login', { replace: true })
      })
    }
  }, [])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans,sans-serif', color:'#64748b', fontSize:16 }}>
      Signing you in…
    </div>
  )
}
