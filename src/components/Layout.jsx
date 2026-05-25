import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase.js'
import Logo from './Logo.jsx'

const NAV = [
  { to:'dashboard', icon:'▦',  label:'Dashboard'    },
  { to:'upcoming',  icon:'📅', label:'Upcoming'      },
  { to:'contacts',  icon:'👥', label:'Contacts'      },
  { to:'log',       icon:'📋', label:'Message Log'   },
  { to:'settings',  icon:'⚙️', label:'Settings'      },
]

export default function Layout({ user }) {
  const navigate = useNavigate()
  const [signing, setSigning] = useState(false)

  async function signOut() {
    setSigning(true)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc' }}>
      {/* Sidebar */}
      <div style={{ width:220, background:'#0f172a', display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh' }}>
        {/* Logo */}
        <div style={{ padding:'22px 18px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <Logo size={32}/>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif' }}>
                text<span style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>reminder</span>
              </div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'1px' }}>textreminder.co.uk</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'14px 10px', flex:1 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'2px', textTransform:'uppercase', padding:'0 8px', marginBottom:6 }}>Menu</div>
          {NAV.map(n => (
            <NavLink key={n.to} to={`/${n.to}`} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 10px', borderRadius:8, marginBottom:2,
              fontSize:13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              textDecoration:'none', transition:'all 0.15s',
            })}>
              <span style={{ fontSize:14 }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding:'14px 14px 20px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          <button onClick={signOut} disabled={signing} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:12, cursor:'pointer', padding:0, fontFamily:'inherit', marginTop:4 }}>
            {signing ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
