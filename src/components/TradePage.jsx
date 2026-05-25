import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

export default function TradePage({ trade, headline, subhead, painPoints, benefits, keywords }) {
  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:'#0f172a', background:'#fff' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid #f3e8ff', padding:'0 24px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
            <Logo size={30}/>
            <div style={{ fontSize:14, fontWeight:800, color:'#0f172a', fontFamily:'Syne,sans-serif' }}>
              text<span style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>reminder</span>
            </div>
          </Link>
          <Link to="/signup" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, textDecoration:'none' }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background:'linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)', padding:'64px 24px 56px' }}>
        <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-block', background:'#f3e8ff', color:'#7c3aed', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:20 }}>
            Built for {trade}
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(28px,5vw,48px)', fontWeight:800, lineHeight:1.15, color:'#0f172a', marginBottom:14 }}>{headline}</h1>
          <p style={{ fontSize:17, color:'#6b7280', lineHeight:1.75, marginBottom:32, maxWidth:560, margin:'0 auto 32px' }}>{subhead}</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/signup" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:10, padding:'14px 30px', fontSize:15, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 16px rgba(168,85,247,0.3)' }}>Start Free Trial</Link>
            <Link to="/" style={{ background:'transparent', color:'#a855f7', border:'2px solid #a855f7', borderRadius:10, padding:'13px 28px', fontSize:15, fontWeight:700, textDecoration:'none' }}>See All Features</Link>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:14 }}>14-day free trial · No credit card required · Set up in 5 minutes</div>
        </div>
      </section>

      {/* Pain points */}
      <section style={{ padding:'56px 24px', background:'#fff' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, textAlign:'center', marginBottom:36, color:'#0f172a' }}>
            Sound familiar?
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {painPoints.map((p,i) => (
              <div key={i} style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'20px 18px' }}>
                <div style={{ fontSize:22, marginBottom:10 }}>{p.icon}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#991b1b', marginBottom:6 }}>{p.title}</div>
                <div style={{ fontSize:13, color:'#7f1d1d', lineHeight:1.65 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section style={{ padding:'56px 24px', background:'linear-gradient(160deg,#fdf4ff,#faf5ff)' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, textAlign:'center', marginBottom:36, color:'#0f172a' }}>
            TextReminder fixes all of this
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
            {benefits.map((b,i) => (
              <div key={i} style={{ background:'#fff', border:'1px solid #f3e8ff', borderRadius:12, padding:'20px 18px', display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ fontSize:24, flexShrink:0 }}>{b.icon}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:5 }}>{b.title}</div>
                  <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.65 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding:'56px 24px', background:'#fff' }}>
        <div style={{ maxWidth:500, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, marginBottom:8 }}>Simple pricing</h2>
          <p style={{ color:'#6b7280', fontSize:15, marginBottom:28 }}>£20/month or £180/year. No setup fees. No hidden costs.</p>
          <div style={{ background:'linear-gradient(135deg,#0f172a,#1e0a3c)', borderRadius:16, padding:'28px 24px', marginBottom:20 }}>
            <div style={{ fontSize:48, fontWeight:900, color:'#fff', fontFamily:'Syne,sans-serif', lineHeight:1, marginBottom:6 }}>£20<span style={{ fontSize:18, fontWeight:400, color:'rgba(255,255,255,0.5)' }}>/month</span></div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, marginBottom:20 }}>or £180/year — save £60</div>
            {['SMS, email & WhatsApp reminders','All calendar types supported','Unlimited contacts','14-day free trial'].map((f,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ color:'#22c55e' }}>✓</span>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>{f}</span>
              </div>
            ))}
            <Link to="/signup" style={{ display:'block', background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:10, padding:14, fontSize:15, fontWeight:700, textDecoration:'none', marginTop:20 }}>Start Free Trial</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'#0a0614', padding:'24px', textAlign:'center' }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)' }}>© 2025 TextReminder · textreminder.co.uk · Built for UK tradespeople</div>
      </footer>
    </div>
  )
}
