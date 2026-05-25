import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

const TRADES = ["Window Cleaners","Plumbers","Electricians","Hairdressers","Gardeners","Plasterers","Roofers","Cleaners","Decorators","Physios"]

const FEATURES = [
  { icon:"📅", title:"Google, Apple & Outlook", desc:"Connect any calendar in minutes. TextReminder reads your appointments automatically — no manual input." },
  { icon:"📱", title:"SMS, Email & WhatsApp", desc:"Send reminders via whichever channel your customers prefer. All three included in every plan." },
  { icon:"🤖", title:"Fully Automatic", desc:"Reminders fire 24 hours before every appointment. Set it up once and never think about it again." },
  { icon:"✏️", title:"Your Brand, Your Message", desc:"Customise the template with your business name and number. Every reminder feels personal." },
  { icon:"📋", title:"Full Message Log", desc:"See every reminder sent, delivered and confirmed. Know exactly who's been reminded." },
  { icon:"💷", title:"Pay Less Than You Do Now", desc:"Most reminder services charge £25–£50/month. TextReminder is £20/month. More features, lower cost." },
]

const TESTIMONIALS = [
  { name:"Dave K.", trade:"Window Cleaning, Oxfordshire", quote:"Dropped from 3–4 no-shows a week to almost none. Pays for itself the first missed job." },
  { name:"Sarah M.", trade:"Mobile Hairdresser, Hampshire", quote:"Used to spend 20 minutes every evening chasing confirmations. Now I just get on with my evening." },
  { name:"Tom R.", trade:"Plumbing, Yorkshire", quote:"Simple, does exactly what it says, costs nothing compared to what I was paying before." },
]

function LogoMark() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <Logo size={34}/>
      <div>
        <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', lineHeight:1, fontFamily:'Syne,sans-serif' }}>
          text<span style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>reminder</span>
        </div>
        <div style={{ fontSize:9, color:'#9ca3af', letterSpacing:'1px', textTransform:'uppercase' }}>textreminder.co.uk</div>
      </div>
    </div>
  )
}

export default function Home() {
  const [tradeIdx, setTradeIdx] = useState(0)
  const [fade, setFade]         = useState(true)
  const [email, setEmail]       = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false)
      setTimeout(() => { setTradeIdx(i=>(i+1)%TRADES.length); setFade(true) }, 300)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:'#0f172a', background:'#fff', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .hov-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(168,85,247,0.1);border-color:#d8b4fe!important;}
        .hov-card{transition:all 0.2s;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .fade-up{animation:fadeUp 0.6s ease forwards;}
        .fade-up-2{animation:fadeUp 0.6s ease 0.15s forwards;opacity:0;}
        .fade-up-3{animation:fadeUp 0.6s ease 0.3s forwards;opacity:0;}
        .float{animation:float 4s ease-in-out infinite;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
      `}</style>

      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.93)', backdropFilter:'blur(14px)', borderBottom:'1px solid #f3e8ff', padding:'0 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <LogoMark/>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            {[['#features','Features'],['#how','How it works'],['#pricing','Pricing']].map(([href,label])=>(
              <a key={href} href={href} style={{ fontSize:13, fontWeight:500, color:'#4b5563', textDecoration:'none' }}>{label}</a>
            ))}
            <Link to="/login" style={{ fontSize:13, fontWeight:600, color:'#a855f7', textDecoration:'none' }}>Sign in</Link>
            <Link to="/signup" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:9, padding:'9px 20px', fontSize:13, fontWeight:700, textDecoration:'none', boxShadow:'0 3px 12px rgba(168,85,247,0.3)' }}>Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background:'linear-gradient(160deg,#fdf4ff 0%,#faf5ff 50%,#f0fdf4 100%)', padding:'80px 24px 64px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-100px', right:'-100px', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.1),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-60px', left:'-60px', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(236,72,153,0.08),transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:880, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #e9d5ff', borderRadius:30, padding:'6px 16px', fontSize:12, fontWeight:600, color:'#7c3aed', marginBottom:28, boxShadow:'0 2px 12px rgba(168,85,247,0.1)' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/>
            Simple · Automatic · Affordable
          </div>
          <h1 className="fade-up-2" style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(34px,6vw,60px)', fontWeight:800, lineHeight:1.1, color:'#0f172a', marginBottom:14 }}>
            Never lose a job to<br/>
            <span style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>a forgotten appointment</span>
          </h1>
          <div className="fade-up-3" style={{ fontSize:18, color:'#6b7280', marginBottom:10 }}>
            Built for{' '}
            <span style={{ fontWeight:700, color:'#7c3aed', transition:'opacity 0.3s', opacity:fade?1:0 }}>{TRADES[tradeIdx]}</span>
          </div>
          <p className="fade-up-3" style={{ fontSize:16, color:'#6b7280', lineHeight:1.75, maxWidth:520, margin:'0 auto 36px' }}>
            Connect your calendar. TextReminder sends automatic SMS, email and WhatsApp reminders 24 hours before every appointment. No-shows, eliminated.
          </p>
          <div className="fade-up-3" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:14 }}>
            <Link to="/signup" style={{ background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:10, padding:'15px 32px', fontSize:16, fontWeight:700, textDecoration:'none', boxShadow:'0 6px 20px rgba(168,85,247,0.35)' }}>Start Free Trial</Link>
            <a href="#how" style={{ background:'transparent', color:'#a855f7', border:'2px solid #a855f7', borderRadius:10, padding:'14px 30px', fontSize:16, fontWeight:700, textDecoration:'none' }}>See How It Works</a>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>No credit card required · 14-day free trial · Set up in 5 minutes</div>
        </div>

        {/* SMS preview card */}
        <div style={{ maxWidth:460, margin:'52px auto 0' }}>
          <div className="float" style={{ background:'#fff', borderRadius:20, padding:22, boxShadow:'0 20px 60px rgba(168,85,247,0.14)', border:'1px solid #f3e8ff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:14, borderBottom:'1px solid #f9f0ff' }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#ec4899,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center' }}><Logo size={22}/></div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>TextReminder</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>Automated · Just now</div>
              </div>
              <div style={{ marginLeft:'auto', fontSize:11, color:'#22c55e', fontWeight:700 }}>✓ Delivered</div>
            </div>
            <div style={{ background:'linear-gradient(135deg,#fdf4ff,#faf5ff)', borderRadius:12, padding:'13px 15px', marginBottom:14, borderLeft:'3px solid #a855f7' }}>
              <div style={{ fontSize:11, color:'#9ca3af', marginBottom:5, fontWeight:600 }}>SMS to: Sarah Mitchell · 07712 345 678</div>
              <div style={{ fontSize:14, color:'#0f172a', lineHeight:1.7 }}>Hi Sarah, just a reminder your window clean is <strong>tomorrow at 9am</strong>. Any questions call 07700 900123. Reply STOP to opt out.</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[['247','Sent this month'],['98%','Open rate'],['£0','No-shows']].map(([v,l],i)=>(
                <div key={i} style={{ textAlign:'center', background:'#f8fafc', borderRadius:10, padding:'10px 6px' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:i===2?'#22c55e':'#7c3aed' }}>{v}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2, lineHeight:1.3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ background:'#fff', borderTop:'1px solid #f3e8ff', borderBottom:'1px solid #f3e8ff', padding:'16px 24px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center', gap:28, flexWrap:'wrap' }}>
          {['Stop paying £25/month for the same thing','Works with Google, Apple & Outlook','SMS, email & WhatsApp','5-minute setup'].map((t,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:600, color:'#374151' }}>
              <span style={{ color:'#22c55e', fontSize:15 }}>✓</span>{t}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ padding:'80px 24px', background:'#f8fafc' }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ display:'inline-block', background:'#f3e8ff', color:'#7c3aed', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:14 }}>Features</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(26px,4vw,38px)', fontWeight:800, color:'#0f172a', marginBottom:10 }}>Everything you need. Nothing you don't.</h2>
            <p style={{ fontSize:15, color:'#6b7280', maxWidth:480, margin:'0 auto' }}>Built for tradespeople who want to stop chasing confirmations.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
            {FEATURES.map((f,i)=>(
              <div key={i} className="hov-card" style={{ background:'#fff', border:'1px solid #e9d5ff', borderRadius:14, padding:'24px 22px' }}>
                <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.75 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding:'80px 24px', background:'#fff' }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:52 }}>
            <div style={{ display:'inline-block', background:'#f0fdf4', color:'#166534', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:14 }}>How it works</div>
            <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(26px,4vw,38px)', fontWeight:800, color:'#0f172a' }}>Up and running in minutes</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {[
              {n:'1',icon:'📅',title:'Connect Calendar',desc:'Link Google, Apple or Outlook in 60 seconds.'},
              {n:'2',icon:'👥',title:'Add Contacts',desc:'Build your customer list with names and numbers.'},
              {n:'3',icon:'✏️',title:'Set Template',desc:'Customise your reminder message once.'},
              {n:'4',icon:'✅',title:'Relax',desc:'Reminders fire automatically, every time.'},
            ].map((s,i)=>(
              <div key={i} style={{ textAlign:'center', padding:'20px 12px' }}>
                <div style={{ width:50, height:50, borderRadius:'50%', background:'linear-gradient(135deg,#fdf4ff,#f3e8ff)', border:'2px solid #e9d5ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:20 }}>{s.icon}</div>
                <div style={{ display:'inline-block', background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', fontSize:10, fontWeight:800, width:20, height:20, borderRadius:'50%', lineHeight:'20px', textAlign:'center', marginBottom:10 }}>{s.n}</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:'#6b7280', lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trade links */}
      <section style={{ padding:'48px 24px', background:'#f8fafc' }}>
        <div style={{ maxWidth:860, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#94a3b8', marginBottom:16 }}>Specific guides for your trade:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center' }}>
            {[['Window Cleaners','/window-cleaners'],['Plumbers','/plumbers'],['Electricians','/electricians'],['Hairdressers','/hairdressers'],['Gardeners','/gardeners']].map(([label,to])=>(
              <Link key={to} to={to} style={{ background:'#fff', border:'1px solid #e9d5ff', borderRadius:20, padding:'7px 16px', fontSize:13, fontWeight:600, color:'#7c3aed', textDecoration:'none' }}>{label} →</Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(135deg,#fdf4ff,#faf5ff)' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(24px,3.5vw,36px)', fontWeight:800, textAlign:'center', marginBottom:44, color:'#0f172a' }}>Tradespeople love it</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} style={{ background:'#fff', borderRadius:16, padding:24, boxShadow:'0 4px 20px rgba(168,85,247,0.07)', border:'1px solid #f3e8ff' }}>
                <div style={{ fontSize:22, color:'#a855f7', marginBottom:10 }}>❝</div>
                <p style={{ fontSize:14, color:'#374151', lineHeight:1.8, marginBottom:16, fontStyle:'italic' }}>{t.quote}</p>
                <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:14, borderTop:'1px solid #f9f0ff' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#ec4899,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 }}>{t.name[0]}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{t.trade}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding:'80px 24px', background:'#fff' }}>
        <div style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-block', background:'#f3e8ff', color:'#7c3aed', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:14 }}>Pricing</div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(26px,4vw,38px)', fontWeight:800, color:'#0f172a', marginBottom:10 }}>One simple price</h2>
          <p style={{ fontSize:15, color:'#6b7280', marginBottom:36, lineHeight:1.7 }}>£20/month or £180/year. No setup fees. No hidden costs. Just pay for what you send.</p>
          <div style={{ background:'linear-gradient(135deg,#0f172a,#1e0a3c)', borderRadius:20, padding:'36px 32px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,0.2),transparent 70%)' }}/>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 }}>Monthly</div>
            <div style={{ fontSize:56, fontWeight:900, color:'#fff', lineHeight:1, marginBottom:4, fontFamily:'Syne,sans-serif' }}>£20<span style={{ fontSize:20, fontWeight:400, color:'rgba(255,255,255,0.4)' }}>/month</span></div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:24 }}>or £180/year — save two months</div>
            {['Google, Apple & Outlook Calendar','SMS, Email & WhatsApp','Unlimited contacts & reminders','AI support assistant','Full message log','14-day free trial'].map((f,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                <span style={{ color:'#22c55e' }}>✓</span>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.8)' }}>{f}</span>
              </div>
            ))}
            <Link to="/signup" style={{ display:'block', background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:10, padding:15, fontSize:15, fontWeight:700, textDecoration:'none', marginTop:22, boxShadow:'0 4px 16px rgba(236,72,153,0.4)' }}>Start Free Trial →</Link>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:10 }}>14-day free trial · No credit card required</div>
          </div>
          <div style={{ background:'#fef9c3', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>💡</span>
            <div style={{ fontSize:13, color:'#713f12', textAlign:'left' }}><strong>Currently paying £25+/month?</strong> Switch to TextReminder and pay less for more.</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(135deg,#0f172a,#1e0a3c)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 30% 50%,rgba(236,72,153,0.1),transparent 50%),radial-gradient(ellipse at 70% 50%,rgba(168,85,247,0.12),transparent 50%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:580, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}><Logo size={56}/></div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:'#fff', marginBottom:12, lineHeight:1.15 }}>Stop losing jobs to no-shows</h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', marginBottom:30, lineHeight:1.75 }}>5 minutes to set up. Saves hours every week. Pays for itself the first time a customer actually turns up.</p>
          <Link to="/signup" style={{ display:'inline-block', background:'linear-gradient(135deg,#ec4899,#a855f7)', color:'#fff', borderRadius:10, padding:'15px 36px', fontSize:16, fontWeight:700, textDecoration:'none', boxShadow:'0 6px 24px rgba(236,72,153,0.4)' }}>Start Free Trial →</Link>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginTop:14 }}>textreminder.co.uk · Built for UK tradespeople · Part of Rollright Publishing Ltd</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:'#070412', padding:'28px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <LogoMark/>
          <div style={{ display:'flex', gap:20 }}>
            {[['Window Cleaners','/window-cleaners'],['Plumbers','/plumbers'],['Electricians','/electricians'],['Hairdressers','/hairdressers']].map(([l,to])=>(
              <Link key={to} to={to} style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© 2025 Rollright Publishing Ltd · Remind. Confirm. Keep Appointments.</div>
        </div>
      </footer>
    </div>
  )
}
