import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const B = {
  navy:   '#0f172a', navy2:  '#1e293b', pink:   '#ec4899',
  purple: '#a855f7', sky:    '#fdf2f8', text:   '#1e293b', muted:  '#64748b',
  light:  '#f8fafc', border: '#e2e8f0', green:  '#16a34a',
  amber:  '#b45309', white:  '#ffffff',
}

const PLANS = [
  { name:'Free', price:0, annualPrice:0, unit:'', desc:'Try it out.', sms:20, cta:'Start free', popular:false,
    features:['20 SMS reminders/month','Google Calendar sync','Up to 20 contacts','Basic templates','Message log'] },
  { name:'Starter', price:15, annualPrice:150, unit:'/mo', desc:'Perfect for getting started.', sms:100, cta:'Get started', popular:false,
    features:['100 SMS reminders/month','Google Calendar sync','Unlimited contacts','3 message templates','Multiple phones per job','Full message log'] },
  { name:'Professional', price:29, annualPrice:290, unit:'/mo', desc:'The most popular choice.', sms:200, cta:'Get started', popular:true,
    features:['200 SMS reminders/month','Google Calendar sync','Unlimited contacts','3 message templates','Multiple phones per job','Full message log'] },
  { name:'Business', price:55, annualPrice:550, unit:'/mo', desc:'For busy operations.', sms:400, cta:'Get started', popular:false,
    features:['400 SMS reminders/month','Google Calendar sync','Unlimited contacts','3 message templates','Multiple phones per job','Full message log'] },
  { name:'Enterprise', price:249, annualPrice:2490, unit:'/mo', desc:'High-volume operations.', sms:2000, cta:'Get started', popular:false,
    features:['2,000 SMS reminders/month','Google Calendar sync','Unlimited contacts','3 message templates','Multiple phones per job','Full message log'] },
]

const FAQS = [
  { q:'Does it work for regular window-cleaning rounds?',
    a:'Yes. You can add recurring jobs and TextReminder sends customers a message the evening before or the morning of their clean. It works alongside your existing round management — you do not need to change how you organise your work.' },
  { q:'Can I use it for one-off jobs like gutter clearing or pressure washing?',
    a:'Absolutely. Add any job — one-off pressure wash, seasonal gutter clear, or scheduled driveway clean — and choose when the message should go out. One-off jobs work exactly the same as recurring ones.' },
  { q:'Do I need to replace my existing diary or round software?',
    a:'No. TextReminder works alongside whatever you already use — a paper diary, Google Calendar, Cleaner Planner, Squeegee, a spreadsheet or anything else. It is the communication layer, not a replacement for your existing process.' },
  { q:'Can I send weather-delay messages to customers?',
    a:'Yes. The weather-delay tool lets you select affected jobs, choose or edit a delay message, and send it to all those customers at once. It takes a fraction of the time it would take to message each person individually.' },
  { q:'Can I use it as a one-person business?',
    a:'TextReminder is built for sole traders first. The free plan gives you 20 SMS to try it, and the Starter plan at £15/month covers up to 100 messages — enough for most single-operator exterior cleaners.' },
  { q:'How are SMS charges handled?',
    a:'Each plan includes a monthly SMS allowance. Free: 20. Starter: 100. Professional: 200. Business: 400. Your allowance resets each month. Upgrade any time if you need more.' },
  { q:'Can I cancel at any time?',
    a:'Yes. No contracts, no minimum terms, no phone calls needed. Cancel from your account settings and your plan ends at the next billing date. The free plan is available indefinitely.' },
]

function LogoMark() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
        <defs><linearGradient id="lgm" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
        <path d="M6 8C6 5.79 7.79 4 10 4H38C40.21 4 42 5.79 42 8V30C42 32.21 40.21 34 38 34H26L18 42V34H10C7.79 34 6 32.21 6 30V8Z" fill="url(#lgm)"/>
        <rect x="14" y="14" width="20" height="3" rx="1.5" fill="white" opacity="0.9"/>
        <rect x="14" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.9"/>
        <circle cx="37" cy="11" r="8" fill="#22c55e"/>
        <path d="M33 11L36 14L41 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontWeight:800, fontSize:17, letterSpacing:'-0.3px', fontFamily:'DM Sans, sans-serif' }}>
        <span style={{ color:'#fff' }}>text</span><span style={{ color:B.pink }}>reminder</span>
      </span>
    </div>
  )
}

function Nav({ onSignup }) {
  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, background:B.navy, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ maxWidth:1140, margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:62 }}>
        <Link to="/" style={{ textDecoration:'none' }}><LogoMark/></Link>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="nav-links" style={{ display:'flex', alignItems:'center', gap:0 }}>
            {[['#how','How it works'],['#pricing','Pricing'],['#faq','FAQ']].map(([href,label])=>(
              <a key={href} href={href} style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.6)', textDecoration:'none', padding:'8px 12px', borderRadius:7 }}>{label}</a>
            ))}
          </div>
          <Link to="/login" style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.6)', textDecoration:'none', padding:'8px 12px' }}>Log in</Link>
          <Link to="/signup" style={{ background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', borderRadius:8, padding:'9px 20px', fontSize:14, fontWeight:700, textDecoration:'none', marginLeft:4 }}>Start free</Link>
        </div>
      </div>
    </nav>
  )
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom:`1px solid ${B.border}`, padding:'20px 0' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ width:'100%', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, padding:0, textAlign:'left' }}>
        <span style={{ fontSize:16, fontWeight:600, color:B.text, lineHeight:1.4 }}>{q}</span>
        <span style={{ fontSize:22, color:B.pink, flexShrink:0, transition:'transform 0.2s', transform:open?'rotate(45deg)':'none', lineHeight:1 }}>+</span>
      </button>
      {open && <p style={{ marginTop:14, fontSize:15, color:B.muted, lineHeight:1.75 }}>{a}</p>}
    </div>
  )
}

export default function HomePage({ onSignup }) {
  useEffect(()=>{
    document.title = 'TextReminder — Automatic SMS Appointment Reminders for UK Trades'
    const s=(sel,val)=>{const el=document.querySelector(sel);if(el)el.setAttribute('content',val)}
    s('meta[name="description"]',"Stop spending your evenings texting customers about tomorrow's jobs. TextReminder automatically sends job reminders, access requests and weather-delay updates for exterior cleaning businesses.")
    s('meta[property="og:title"]','TextReminder — Customer Notifications for Exterior Cleaning Businesses')
  },[])

  const go = onSignup || (()=>{ window.location.href='/signup' })
  const [billing, setBilling] = useState('monthly')

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:B.text, background:B.white, overflowX:'hidden' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp 0.55s ease forwards;}
        .fu2{animation:fadeUp 0.55s ease 0.12s forwards;opacity:0;}
        .fu3{animation:fadeUp 0.55s ease 0.24s forwards;opacity:0;}
        @media(max-width:768px){.hm{display:none!important}.g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr!important}.g4{grid-template-columns:repeat(2,1fr)!important}.pg{grid-template-columns:1fr!important}.nav-links{display:none!important}}
      `}</style>

      <Nav onSignup={go}/>

      {/* HERO */}
      <section style={{ background:B.navy, padding:'90px 20px 100px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:600, height:600, background:'radial-gradient(circle at 80% 20%,rgba(236,72,153,0.18),transparent 60%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:860, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <div className="fu" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(236,72,153,0.15)', border:'1px solid rgba(236,72,153,0.3)', borderRadius:24, padding:'6px 16px', marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block' }}/>
            <span style={{ color:'#ec4899', fontSize:13, fontWeight:600 }}>Built for exterior cleaning businesses</span>
          </div>
          <h1 className="fu2" style={{ fontSize:'clamp(32px,5.5vw,58px)', fontWeight:800, color:'#fff', lineHeight:1.1, letterSpacing:'-1.5px', marginBottom:24 }}>
            Stop spending your evenings <span style={{ color:'#ec4899' }}>texting tomorrow's customers</span>
          </h1>
          <p className="fu3" style={{ fontSize:'clamp(16px,2vw,19px)', color:'rgba(255,255,255,0.62)', lineHeight:1.75, maxWidth:580, margin:'0 auto 14px' }}>
            TextReminder automatically sends job reminders, access requests and weather-delay updates to your customers — so you finish the day and switch off.
          </p>
          <p className="fu3" style={{ fontSize:14, color:'rgba(255,255,255,0.38)', marginBottom:36, fontStyle:'italic' }}>
            Built by an exterior cleaner, for exterior cleaning businesses.
          </p>
          <div className="fu3" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={go} style={{ background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', border:'none', borderRadius:9, padding:'15px 34px', fontSize:16, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(236,72,153,0.4)' }}>Start free</button>
            <a href="#how" style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, padding:'14px 30px', fontSize:16, fontWeight:600, textDecoration:'none' }}>See how it works</a>
          </div>
          <div className="fu3" style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap', marginTop:28 }}>
            {['No contracts','Cancel any time','Free plan available','UK-based'].map(t=>(
              <span key={t} style={{ fontSize:12, color:'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ color:'#4ade80' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* SMS mockup */}
        <div style={{ maxWidth:420, margin:'60px auto 0' }}>
          <div style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:24, boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width:36, height:36, borderRadius:9, background:`linear-gradient(135deg,${B.pink},${B.purple})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 4V5z"/></svg>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>TextReminder</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Sent automatically</div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, background:'rgba(74,222,128,0.12)', borderRadius:20, padding:'3px 10px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', display:'inline-block' }}/>
                <span style={{ fontSize:11, fontWeight:600, color:'#4ade80' }}>Delivered</span>
              </div>
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>To: Mrs. Helen Booth · 07712 *** ***</div>
            <div style={{ background:'rgba(236,72,153,0.1)', border:'1px solid rgba(236,72,153,0.2)', borderRadius:10, padding:'12px 14px', fontSize:14, color:'rgba(255,255,255,0.85)', lineHeight:1.7 }}>
              Hi Helen, just to let you know we'll be cleaning your windows <strong style={{ color:'#fff' }}>tomorrow (Tuesday)</strong>. We'll be with you between <strong style={{ color:'#fff' }}>9–11am</strong>. Please leave the side gate unlocked if you can. Thanks — Dave, Crystal Clear Windows. Reply STOP to opt out.
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              {[['0','Manual messages sent'],['8','Sent automatically'],['5 min','Time saved tonight']].map(([val,label])=>(
                <div key={label} style={{ flex:1, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'9px 6px', textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:800, color:'#ec4899' }}>{val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', lineHeight:1.4, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section style={{ padding:'88px 20px', background:B.white }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'#fef3c7', color:B.amber, fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:16 }}>The problem</div>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:B.navy, letterSpacing:'-0.8px', marginBottom:12 }}>The job doesn't end when the cleaning does</h2>
            <p style={{ fontSize:16, color:B.muted, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>Most exterior cleaners still handle customer communication manually — one text at a time, every evening.</p>
          </div>
          <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              { title:"Customers don't know you're coming", desc:"They go out, leave the gate locked, or call to cancel because no one told them they were due today." },
              { title:'Gates and access are blocked', desc:"You turn up, can't get in, and lose the job. A simple heads-up the night before would have fixed it." },
              { title:'Weather disrupts your schedule', desc:"Rescheduling a full day's work means messaging every affected customer individually — while already stressed." },
              { title:'Evenings spent texting', desc:"You finish a full physical day and then spend your evening manually texting tomorrow's customers. It shouldn't be that way." },
              { title:'Customers chase you for updates', desc:"Customers who aren't kept informed call asking where you are. It takes up time you don't have." },
              { title:'Access issues cost you money', desc:"Each failed visit is lost revenue and a wasted journey. Most are avoidable with a single message." },
            ].map(({title,desc})=>(
              <div key={title} style={{ background:B.light, border:`1px solid ${B.border}`, borderRadius:13, padding:'24px 22px' }}>
                <div style={{ fontSize:15, fontWeight:700, color:B.navy, marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:14, color:B.muted, lineHeight:1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE SOLUTION */}
      <section style={{ padding:'88px 20px', background:B.sky }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'#fce7f3', color:B.pink, fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:16 }}>The solution</div>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:B.navy, letterSpacing:'-0.8px', marginBottom:12 }}>TextReminder handles the communication. You just do the cleaning.</h2>
            <p style={{ fontSize:16, color:B.muted, maxWidth:520, margin:'0 auto', lineHeight:1.7 }}>Set up your messages once. TextReminder sends them automatically — before every job, every time.</p>
          </div>
          <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              { title:'Job reminders', desc:"Customers automatically receive a message the evening before or the morning of their clean. No more surprises on their doorstep." },
              { title:'Access requests', desc:"Include a line asking them to leave the gate unlocked, have someone home, or move a car. Sent automatically with every reminder." },
              { title:'Weather-delay notices', desc:"Select affected jobs, choose your delay message, send to all customers at once. Takes 30 seconds instead of 30 minutes." },
              { title:'Rescheduling messages', desc:"Move a job and notify the customer in one step. They'll always know when to expect you." },
              { title:'"We\'re on our way" updates', desc:"Send a quick heads-up when you're nearby or running to time. Reduces calls and keeps customers happy." },
              { title:'Full message history', desc:"See exactly what was sent, when, and whether it was delivered. No guessing, no missed customers." },
            ].map(({title,desc})=>(
              <div key={title} style={{ background:B.white, border:`1px solid ${B.border}`, borderRadius:13, padding:'24px 22px', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ color:B.green, fontWeight:700, marginBottom:8 }}>✓</div>
                <div style={{ fontSize:15, fontWeight:700, color:B.navy, marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:14, color:B.muted, lineHeight:1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding:'88px 20px', background:B.white }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <div style={{ display:'inline-block', background:'#dcfce7', color:'#166534', fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:16 }}>How it works</div>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:B.navy, letterSpacing:'-0.8px' }}>Add jobs. Choose your message. Done.</h2>
          </div>
          <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {[
              { n:'1', title:'Add your jobs', desc:"Connect Google Calendar, import a CSV, or add jobs manually. TextReminder works with whatever process you already use.", detail:'Google Calendar, CSV, or manual entry' },
              { n:'2', title:'Choose when customers hear from you', desc:"Pick the timing — the evening before, the morning of, or both. Set message templates once for your business.", detail:'Evening before, morning of, or custom' },
              { n:'3', title:'TextReminder sends everything automatically', desc:"Customers receive their message at the right time, every time. You finish work and switch off.", detail:'SMS delivered. You do nothing.' },
            ].map(({n,title,desc,detail})=>(
              <div key={n} style={{ textAlign:'center', padding:'8px 12px' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', fontWeight:800, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>{n}</div>
                <h3 style={{ fontSize:17, fontWeight:700, color:B.navy, marginBottom:10 }}>{title}</h3>
                <p style={{ fontSize:14, color:B.muted, lineHeight:1.75, marginBottom:12 }}>{desc}</p>
                <div style={{ display:'inline-block', background:B.sky, color:B.pink, fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:20 }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section style={{ padding:'88px 20px', background:B.navy }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:56 }}>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:'#fff', letterSpacing:'-0.8px', marginBottom:12 }}>Built for exterior cleaning businesses</h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,0.5)', maxWidth:480, margin:'0 auto' }}>Whether you clean windows, gutters, driveways or solar panels — TextReminder is built around how exterior cleaners actually work.</p>
          </div>
          <div className="g4" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
            {[
              { label:'Window cleaning', href:'/window-cleaners', desc:'Rounds, one-offs, access requests' },
              { label:'Gutter cleaning', href:'/gutter-cleaners', desc:'Seasonal jobs, access notices' },
              { label:'Pressure washing', href:'/pressure-washing', desc:'Driveways, patios, one-off jobs' },
              { label:'Roof & softwash', href:'/roof-cleaning', desc:'Soft wash, moss treatment, roof cleans' },
              { label:'Solar panel cleaning', href:'/solar-panel-cleaning', desc:'Access, timing, seasonal cleans' },
              { label:'Commercial exterior', href:'/commercial-exterior-cleaning', desc:'Multi-site, regular schedules' },
              { label:'Fascia & soffit', href:'/', desc:'UPVC, cladding, conservatories' },
              { label:'Other exterior cleaning', href:'/', desc:'Any scheduled outdoor cleaning job' },
            ].map(({label,href,desc})=>(
              <Link key={label} to={href} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'20px 16px', textDecoration:'none', display:'block' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5 }}>{desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section style={{ padding:'80px 20px', background:B.light, borderTop:`1px solid ${B.border}` }}>
        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center' }}>
          <blockquote style={{ fontSize:'clamp(17px,2.5vw,21px)', fontWeight:500, color:B.navy, lineHeight:1.7, fontStyle:'italic', marginBottom:24 }}>
            "TextReminder was built by an exterior cleaner who knew the job didn't end when the cleaning was finished. The evenings were often spent sending the same messages to tomorrow's customers. TextReminder exists to remove that repetitive admin."
          </blockquote>
          <div style={{ fontSize:14, color:B.muted, fontWeight:600 }}>— Founder, TextReminder · Exterior cleaning business owner</div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding:'88px 20px', background:B.white }}>
        <div style={{ maxWidth:1080, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ display:'inline-block', background:'#fce7f3', color:B.pink, fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', padding:'5px 14px', borderRadius:20, marginBottom:16 }}>Pricing</div>
            <h2 style={{ fontSize:'clamp(26px,4vw,40px)', fontWeight:800, color:B.navy, letterSpacing:'-0.8px', marginBottom:12 }}>Simple pricing. No surprises.</h2>
            <p style={{ fontSize:16, color:B.muted, maxWidth:460, margin:'0 auto 28px' }}>Start free with 20 SMS credits. Upgrade when you need more.</p>
            <div style={{ display:'inline-flex', alignItems:'center', background:B.light, border:`1px solid ${B.border}`, borderRadius:30, padding:4 }}>
              <button onClick={()=>setBilling('monthly')} style={{ padding:'8px 22px', borderRadius:26, border:'none', fontSize:14, fontWeight:600, cursor:'pointer', background:billing==='monthly'?'#fff':'transparent', color:billing==='monthly'?B.navy:B.muted, boxShadow:billing==='monthly'?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>Monthly</button>
              <button onClick={()=>setBilling('annual')} style={{ padding:'8px 22px', borderRadius:26, border:'none', fontSize:14, fontWeight:600, cursor:'pointer', background:billing==='annual'?'#fff':'transparent', color:billing==='annual'?B.navy:B.muted, boxShadow:billing==='annual'?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s', display:'flex', alignItems:'center', gap:8 }}>
                Annual <span style={{ background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>Save 2 months</span>
              </button>
            </div>
          </div>
          <div className="g4 pg" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, alignItems:'start' }}>
            {PLANS.map(plan=>{
              const isAnnual = billing === 'annual' && plan.price > 0
              const displayPrice = isAnnual ? Math.round(plan.annualPrice/12) : plan.price
              const annualTotal = plan.annualPrice
              return (
              <div key={plan.name} style={{ border:plan.popular?`2px solid ${B.pink}`:`1px solid ${B.border}`, borderRadius:16, padding:'22px 16px', position:'relative', background:plan.popular?B.sky:B.white, boxShadow:plan.popular?'0 4px 24px rgba(236,72,153,0.12)':'none' }}>
                {plan.popular && <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 14px', borderRadius:20, whiteSpace:'nowrap' }}>Most popular</div>}
                <div style={{ fontSize:15, fontWeight:700, color:B.navy, marginBottom:4 }}>{plan.name}</div>
                <div style={{ fontSize:13, color:B.muted, marginBottom:16 }}>{plan.desc}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:3, marginBottom:4 }}>
                  <span style={{ fontSize:38, fontWeight:900, color:B.navy, letterSpacing:'-1px' }}>{plan.price===0?'Free':`£${displayPrice}`}</span>
                  {plan.price>0 && <span style={{ fontSize:14, color:B.muted }}>/mo</span>}
                </div>
                {isAnnual && plan.price>0 && <div style={{ fontSize:12, color:B.muted, marginBottom:4 }}>£{annualTotal}/year</div>}
                {!isAnnual && plan.price>0 && <div style={{ fontSize:12, color:'transparent', marginBottom:4 }}>-</div>}
                <div style={{ fontSize:13, color:B.pink, fontWeight:600, marginBottom:20 }}>{plan.sms} SMS per month</div>
                <div style={{ marginBottom:22 }}>
                  {plan.features.map(f=>(
                    <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                      <span style={{ color:B.green, marginTop:2, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:13, color:B.text, lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={go} style={{ width:'100%', padding:'11px', fontSize:14, fontWeight:700, borderRadius:8, cursor:'pointer', background:plan.popular?`linear-gradient(135deg,${B.pink},${B.purple})`:'transparent', color:plan.popular?'#fff':B.pink, border:plan.popular?'none':`1.5px solid ${B.pink}` }}>
                  {plan.cta}
                </button>
              </div>
            )})}
          </div>
          <p style={{ textAlign:'center', fontSize:13, color:B.muted, marginTop:24 }}>All plans include automatic SMS opt-out handling. No contracts. Cancel any time.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding:'88px 20px', background:B.light, borderTop:`1px solid ${B.border}` }}>
        <div style={{ maxWidth:740, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:'clamp(26px,4vw,38px)', fontWeight:800, color:B.navy, letterSpacing:'-0.8px' }}>Common questions</h2>
          </div>
          {FAQS.map(faq=><FAQItem key={faq.q} q={faq.q} a={faq.a}/>)}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'88px 20px', background:B.navy }}>
        <div style={{ maxWidth:600, margin:'0 auto', textAlign:'center' }}>
          <LogoMark/>
          <h2 style={{ fontSize:'clamp(26px,4vw,42px)', fontWeight:800, color:'#fff', letterSpacing:'-1px', margin:'24px 0 14px', lineHeight:1.15 }}>Ready to stop texting tomorrow's customers manually?</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.5)', marginBottom:32, lineHeight:1.7 }}>Start with 20 free SMS credits. No credit card required. Set up takes minutes.</p>
          <button onClick={go} style={{ background:`linear-gradient(135deg,${B.pink},${B.purple})`, color:'#fff', border:'none', borderRadius:9, padding:'16px 40px', fontSize:17, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(236,72,153,0.4)' }}>Start free today</button>
          <div style={{ marginTop:16, fontSize:12, color:'rgba(255,255,255,0.25)' }}>textreminder.co.uk · Built for UK exterior cleaning businesses</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#070c14', padding:'40px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="g2" style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:40, marginBottom:36 }}>
            <div>
              <LogoMark/>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:14, lineHeight:1.7, maxWidth:260 }}>Automatic customer notifications for exterior cleaning businesses. Stop spending your evenings texting tomorrow's customers.</p>
            </div>
            <div className="g3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>Product</div>
                {[['/#how','How it works'],['/#pricing','Pricing'],['/login','Log in'],['/signup','Start free']].map(([to,label])=>(
                  <Link key={to} to={to} style={{ display:'block', fontSize:13, color:'rgba(255,255,255,0.45)', textDecoration:'none', marginBottom:9 }}>{label}</Link>
                ))}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>Who it's for</div>
                {[['/window-cleaners','Window cleaners'],['/gutter-cleaners','Gutter cleaners'],['/pressure-washing','Pressure washing'],['/roof-cleaning','Roof cleaning'],['/solar-panel-cleaning','Solar panels']].map(([to,label])=>(
                  <Link key={to} to={to} style={{ display:'block', fontSize:13, color:'rgba(255,255,255,0.45)', textDecoration:'none', marginBottom:9 }}>{label}</Link>
                ))}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:14 }}>Company</div>
                {[['/blog','Blog'],['mailto:hello@textreminder.co.uk','Contact']].map(([to,label])=>(
                  to.startsWith('mailto')?
                  <a key={to} href={to} style={{ display:'block', fontSize:13, color:'rgba(255,255,255,0.45)', textDecoration:'none', marginBottom:9 }}>{label}</a>:
                  <Link key={to} to={to} style={{ display:'block', fontSize:13, color:'rgba(255,255,255,0.45)', textDecoration:'none', marginBottom:9 }}>{label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:20, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© 2026 Rollright Publishing Ltd · textreminder.co.uk</div>
            <div style={{ display:'flex', gap:16 }}>
              {[['/privacy', 'Privacy'],['/', 'Terms']].map(([to,label])=>(
                <Link key={label} to={to} style={{ fontSize:12, color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
