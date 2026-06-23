import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('OAuth exchange error:', error.message)
          navigate('/login', { replace: true })
          return
        }
      }

      // Session is now established — wait one tick for App's onAuthStateChange
      // to propagate before navigating into a protected route
      setTimeout(() => {
        navigate('/upcoming', { replace: true })
      }, 100)
    }

    handleCallback()
  }, [])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'DM Sans',sans-serif", color:'#64748b', fontSize:16 }}>
      Signing you in…
    </div>
  )
}
