import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      // First check if Supabase already auto-processed the PKCE code on init
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/upcoming', { replace: true })
        return
      }

      // Not yet — try manual exchange (in case auto-init hasn't resolved yet)
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        navigate(error ? '/login' : '/upcoming', { replace: true })
        return
      }

      // No code in URL — subscribe to auth state change and wait
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/upcoming', { replace: true })
        }
      })

      // Timeout fallback after 5s
      setTimeout(async () => {
        subscription.unsubscribe()
        const { data: { session } } = await supabase.auth.getSession()
        navigate(session ? '/upcoming' : '/login', { replace: true })
      }, 5000)
    }

    handleCallback()
  }, [])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'DM Sans,sans-serif', color:'#64748b', fontSize:16 }}>
      Signing you in…
    </div>
  )
}
