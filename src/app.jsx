import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://fxzfaxlhhypiigcmlasx.supabase.co",
  "sb_publishable_Z1cXjCDPE95Vo_GByx9kHA_Ff6dhdJO"
);

// ── Theme ──────────────────────────────────────────
const T = {
  pink:"#ec4899", purple:"#a855f7", green:"#22c55e",
  dark:"#0f172a", text:"#1a1a2e", muted:"#6b7280",
  light:"#f8fafc", white:"#ffffff",
  border:"#e9d5ff", surfaceAlt:"#f3e8ff",
};

const TRADES = ["Window Cleaners","Plumbers","Electricians","Hairdressers","Gardeners","Plasterers","Roofers","Cleaners","Decorators","Physios"];

// ── Logo SVG ────────────────────────────────────────
function Logo({ size=36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      <path d="M15 18 C15 12 19 8 25 8 L75 8 C81 8 85 12 85 18 L85 55 C85 61 81 65 75 65 L55 65 L45 78 L45 65 L25 65 C19 65 15 61 15 55 Z"
        stroke="url(#lg)" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="30" y1="30" x2="65" y2="30" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <line x1="30" y1="42" x2="70" y2="42" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <line x1="30" y1="54" x2="58" y2="54" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="78" cy="18" r="16" fill="#22c55e"/>
      <path d="M70 18 L75 23 L86 12" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

// ── Shared components ────────────────────────────────
function Btn({ onClick, children, style={}, disabled=false, outline=false }) {
  const base = {
    border:"none", borderRadius:10, padding:"12px 24px",
    fontSize:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", transition:"all 0.2s", opacity:disabled?0.5:1,
  };
  const variant = outline
    ? { background:"transparent", color:T.purple, border:`2px solid ${T.purple}` }
    : { background:"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff", boxShadow:"0 4px 16px rgba(168,85,247,0.3)" };
  return <button onClick={onClick} disabled={disabled} style={{...base,...variant,...style}}>{children}</button>;
}

function Input({ value, onChange, placeholder, type="text", style={} }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:8, padding:"11px 14px",
        fontSize:14, color:T.text, outline:"none", fontFamily:"inherit",
        background:"#fff", boxSizing:"border-box", ...style }}
    />
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:"#fff", border:`1px solid #e2e8f0`,
      borderRadius:14, overflow:"hidden", ...style }}>
      {children}
    </div>
  );
}

// ── AI Chat ─────────────────────────────────────────
function AiChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Hi! I'm the TextReminder assistant. Ask me anything about setup, pricing, or how it works 👋" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role:"user", content:text }];
    setMsgs(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:400,
          system:"You are the friendly AI assistant for TextReminder (textreminder.co.uk) — automatic appointment reminders for UK tradespeople. £20/month or £180/year. 14-day free trial. Works with Google, Apple and Outlook Calendar. Sends SMS, email and WhatsApp. Setup takes 5 minutes. Keep answers short and helpful. For complex issues direct to hello@textreminder.co.uk.",
          messages: next.map(m=>({ role:m.role, content:m.content }))
        })
      });
      const data = await res.json();
      setMsgs(p=>[...p,{ role:"assistant", content:data.content?.[0]?.text||"Email hello@textreminder.co.uk and we'll help you out." }]);
    } catch(e) {
      setMsgs(p=>[...p,{ role:"assistant", content:"Something went wrong — email hello@textreminder.co.uk" }]);
    }
    setLoading(false);
  }

  return (
    <>
      {open && (
        <div style={{ position:"fixed", bottom:84, right:20, zIndex:1000, width:300, maxHeight:420,
          background:"#fff", borderRadius:16, border:`1px solid ${T.border}`,
          boxShadow:"0 12px 40px rgba(0,0,0,0.15)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)", padding:"13px 16px",
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Logo size={26}/>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>TextReminder Help</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)" }}>Always online</div>
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{ background:"rgba(255,255,255,0.2)", border:"none",
              borderRadius:"50%", width:26, height:26, cursor:"pointer", color:"#fff", fontSize:14,
              display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"82%", background:m.role==="user"?"linear-gradient(135deg,#ec4899,#a855f7)":"#f8fafc",
                  color:m.role==="user"?"#fff":T.text, borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  padding:"9px 12px", fontSize:13, lineHeight:1.55,
                  border:m.role==="assistant"?`1px solid ${T.border}`:"none" }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ display:"flex", gap:4, padding:"10px 12px", background:"#f8fafc",
              borderRadius:"14px 14px 14px 4px", width:"fit-content", border:`1px solid ${T.border}` }}>
              {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:"50%",
                background:T.purple, animation:`pulse 1s ease-in-out ${i*0.2}s infinite` }}/>)}
            </div>}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:"10px 12px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask anything..."
              style={{ flex:1, border:`1px solid ${T.border}`, borderRadius:8, padding:"8px 11px",
                fontSize:13, outline:"none", fontFamily:"inherit" }}/>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{ background:input.trim()&&!loading?"linear-gradient(135deg,#ec4899,#a855f7)":"#e2e8f0",
                color:input.trim()&&!loading?"#fff":"#94a3b8", border:"none", borderRadius:8,
                padding:"8px 14px", cursor:"pointer", fontWeight:700, fontSize:13, transition:"all 0.2s" }}>→</button>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(p=>!p)} style={{ position:"fixed", bottom:20, right:20, zIndex:1000,
        width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#ec4899,#a855f7)",
        border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 4px 20px rgba(168,85,247,0.4)", fontSize:22, transition:"all 0.2s" }}>
        {open?"×":"💬"}
      </button>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </>
  );
}

// ── HOME PAGE ────────────────────────────────────────
function HomePage({ onSignup, onLogin }) {
  const [tradeIdx, setTradeIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(()=>{
    const t = setInterval(()=>{
      setFade(false);
      setTimeout(()=>{ setTradeIdx(i=>(i+1)%TRADES.length); setFade(true); }, 300);
    }, 2200);
    return ()=>clearInterval(t);
  },[]);

  const features = [
    { icon:"📅", title:"Google, Apple & Outlook", desc:"Connect any calendar in minutes. Appointments sync automatically." },
    { icon:"📱", title:"SMS, Email & WhatsApp", desc:"Send via whichever channel your customers prefer. All three included." },
    { icon:"🤖", title:"Fully Automatic", desc:"Set it up once. Reminders fire 24 hours before every appointment." },
    { icon:"✏️", title:"Your Brand, Your Message", desc:"Customise the template with your business name and number." },
    { icon:"📋", title:"Full Message Log", desc:"See every reminder sent, delivered and confirmed." },
    { icon:"💷", title:"Half the Price", desc:"Most services charge £25–£50/month. TextReminder is £20." },
  ];

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:T.text, background:T.white }}>

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(255,255,255,0.95)",
        backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.border}`, padding:"0 24px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", alignItems:"center",
          justifyContent:"space-between", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Logo size={34}/>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:T.text, lineHeight:1 }}>
                text<span style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>reminder</span>
              </div>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:"1px", textTransform:"uppercase" }}>textreminder.co.uk</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <button onClick={onLogin} style={{ background:"none", border:"none", color:T.purple,
              fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Sign in</button>
            <Btn onClick={onSignup} style={{ padding:"9px 20px", fontSize:13 }}>Start Free Trial</Btn>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background:"linear-gradient(160deg,#fdf4ff 0%,#faf5ff 50%,#f0fdf4 100%)",
        padding:"80px 24px 64px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-100, right:-100, width:500, height:500, borderRadius:"50%",
          background:"radial-gradient(circle,rgba(168,85,247,0.1),transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ maxWidth:800, margin:"0 auto", textAlign:"center", position:"relative" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff",
            border:`1px solid ${T.border}`, borderRadius:30, padding:"6px 16px",
            fontSize:12, fontWeight:600, color:"#7c3aed", marginBottom:28,
            boxShadow:"0 2px 12px rgba(168,85,247,0.1)" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block" }}/>
            Simple · Automatic · Affordable
          </div>
          <h1 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:600, lineHeight:1.3,
            color:T.text, marginBottom:14, margin:"0 0 14px",
            fontFamily:"'Outfit','DM Sans',sans-serif", letterSpacing:"-0.5px" }}>
            Never lose a job to<br/>
            <span style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              a forgotten appointment
            </span>
          </h1>
          <div style={{ fontSize:17, color:T.muted, marginBottom:10, marginTop:16 }}>
            Built for{" "}
            <span style={{ fontWeight:700, color:"#7c3aed", transition:"opacity 0.3s", opacity:fade?1:0 }}>
              {TRADES[tradeIdx]}
            </span>
          </div>
          <p style={{ fontSize:15, color:T.muted, lineHeight:1.75, maxWidth:500,
            margin:"0 auto 32px" }}>
            Connect your calendar. TextReminder sends automatic SMS, email and WhatsApp
            reminders 24 hours before every appointment.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:14 }}>
            <Btn onClick={onSignup} style={{ fontSize:16, padding:"15px 32px" }}>Start Free Trial</Btn>
            <Btn onClick={()=>{}} outline style={{ fontSize:16, padding:"14px 30px" }}>See How It Works</Btn>
          </div>
          <div style={{ fontSize:12, color:T.muted }}>No credit card required · 14-day free trial · 5 minutes to set up</div>
        </div>

        {/* SMS preview */}
        <div style={{ maxWidth:440, margin:"48px auto 0" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:22,
            boxShadow:"0 20px 60px rgba(168,85,247,0.14)", border:`1px solid ${T.border}`,
            animation:"float 4s ease-in-out infinite" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16,
              paddingBottom:14, borderBottom:`1px solid #f9f0ff` }}>
              <div style={{ width:38, height:38, borderRadius:"50%",
                background:"linear-gradient(135deg,#ec4899,#a855f7)",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Logo size={22}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:T.text }}>TextReminder</div>
                <div style={{ fontSize:10, color:T.muted }}>Automated · Just now</div>
              </div>
              <div style={{ marginLeft:"auto", fontSize:11, color:T.green, fontWeight:700 }}>✓ Delivered</div>
            </div>
            <div style={{ background:"linear-gradient(135deg,#fdf4ff,#faf5ff)", borderRadius:12,
              padding:"13px 15px", marginBottom:14, borderLeft:`3px solid ${T.purple}` }}>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:5, fontWeight:600 }}>
                SMS to: Sarah Mitchell · 07712 345 678
              </div>
              <div style={{ fontSize:14, color:T.text, lineHeight:1.7 }}>
                Hi Sarah, just a reminder your window clean is <strong>tomorrow at 9am</strong>.
                Any questions call 07700 900123. Reply STOP to opt out.
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[["247","Sent this month"],["98%","Open rate"],["£0","No-shows"]].map(([v,l],i)=>(
                <div key={i} style={{ textAlign:"center", background:"#f8fafc", borderRadius:10, padding:"10px 6px" }}>
                  <div style={{ fontSize:18, fontWeight:800, color:i===2?T.green:T.purple }}>{v}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2, lineHeight:1.3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div style={{ background:"#fff", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:"16px 24px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center",
          justifyContent:"center", gap:28, flexWrap:"wrap" }}>
          {["Stop paying £25/month","Google, Apple & Outlook","SMS, Email & WhatsApp","5-minute setup"].map((t,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:600, color:"#374151" }}>
              <span style={{ color:T.green, fontSize:15 }}>✓</span>{t}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section style={{ padding:"72px 24px", background:T.light }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:800, color:T.text, marginBottom:10 }}>
              Everything you need. Nothing you don't.
            </h2>
            <p style={{ fontSize:15, color:T.muted, maxWidth:480, margin:"0 auto" }}>
              Built for tradespeople who want to stop chasing confirmations.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
            {features.map((f,i)=>(
              <div key={i} style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:14,
                padding:"24px 22px", transition:"all 0.2s" }}>
                <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:8 }}>{f.title}</div>
                <div style={{ fontSize:13, color:T.muted, lineHeight:1.75 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding:"72px 24px", background:"#fff" }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:800, textAlign:"center",
            color:T.text, marginBottom:48 }}>Up and running in minutes</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {[
              {n:"1",icon:"📅",title:"Connect Calendar",desc:"Google, Apple or Outlook in 60 seconds."},
              {n:"2",icon:"👥",title:"Add Contacts",desc:"Build your customer list with names and numbers."},
              {n:"3",icon:"✏️",title:"Set Template",desc:"Customise your reminder message once."},
              {n:"4",icon:"✅",title:"Relax",desc:"Reminders fire automatically, every time."},
            ].map((s,i)=>(
              <div key={i} style={{ textAlign:"center", padding:"20px 12px" }}>
                <div style={{ width:50, height:50, borderRadius:"50%",
                  background:"linear-gradient(135deg,#fdf4ff,#f3e8ff)", border:`2px solid ${T.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  margin:"0 auto 14px", fontSize:20 }}>{s.icon}</div>
                <div style={{ display:"inline-block", background:"linear-gradient(135deg,#ec4899,#a855f7)",
                  color:"#fff", fontSize:10, fontWeight:800, width:20, height:20, borderRadius:"50%",
                  lineHeight:"20px", textAlign:"center", marginBottom:10 }}>{s.n}</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>{s.title}</div>
                <div style={{ fontSize:12, color:T.muted, lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding:"72px 24px", background:T.light }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:800, color:T.text, marginBottom:10 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize:15, color:T.muted, lineHeight:1.7 }}>
              Pay for what you use. No setup fees. No hidden costs. 14-day free trial on every plan.
            </p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
            {[
              { name:"Starter", price:"£9.99", msgs:40, popular:false,
                features:["40 reminders/month","SMS, Email & WhatsApp","All calendar types","Message log","AI support"] },
              { name:"Pro", price:"£19.99", msgs:100, popular:true,
                features:["100 reminders/month","SMS, Email & WhatsApp","All calendar types","Unused msgs roll over","Message log","AI support"] },
              { name:"Business", price:"£34.99", msgs:250, popular:false,
                features:["250 reminders/month","SMS, Email & WhatsApp","All calendar types","Unused msgs roll over","Message log","Priority support"] },
              { name:"Enterprise", price:"£59.99", msgs:999, popular:false,
                features:["Unlimited reminders","SMS, Email & WhatsApp","All calendar types","Unused msgs roll over","Message log","Priority support"] },
            ].map((plan,i)=>(
              <div key={i} style={{ background:plan.popular?"linear-gradient(135deg,#0f172a,#1e0a3c)":"#fff",
                border:plan.popular?"2px solid "+T.purple:"1px solid "+T.border,
                borderRadius:16, padding:"24px 20px", position:"relative" }}>
                {plan.popular && (
                  <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)",
                    background:"linear-gradient(135deg,#ec4899,"+T.purple+")", color:"#fff",
                    fontSize:10, fontWeight:700, padding:"4px 12px", borderRadius:20,
                    letterSpacing:"1px", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                    Most Popular
                  </div>
                )}
                <div style={{ fontSize:13, fontWeight:700, color:plan.popular?"rgba(255,255,255,0.6)":T.muted,
                  textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>{plan.name}</div>
                <div style={{ fontSize:36, fontWeight:800, color:plan.popular?"#fff":T.text,
                  lineHeight:1, marginBottom:4 }}>{plan.price}
                  <span style={{ fontSize:14, fontWeight:400, color:plan.popular?"rgba(255,255,255,0.4)":T.muted }}>/mo</span>
                </div>
                <div style={{ fontSize:12, color:plan.popular?"rgba(255,255,255,0.4)":T.muted,
                  marginBottom:20 }}>{plan.msgs===999?"Unlimited":plan.msgs} reminders/month</div>
                {plan.features.map((f,j)=>(
                  <div key={j} style={{ display:"flex", alignItems:"center", gap:8,
                    marginBottom:8, fontSize:12,
                    color:plan.popular?"rgba(255,255,255,0.8)":"#374151" }}>
                    <span style={{ color:T.green, flexShrink:0 }}>&#x2713;</span>{f}
                  </div>
                ))}
                <button onClick={onSignup} style={{ width:"100%", marginTop:20,
                  background:plan.popular?"linear-gradient(135deg,#ec4899,"+T.purple+")":"#f3e8ff",
                  color:plan.popular?"#fff":T.purple, border:"none", borderRadius:10,
                  padding:"11px", fontSize:13, fontWeight:700, cursor:"pointer",
                  fontFamily:"inherit" }}>
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:24, fontSize:13, color:T.muted }}>
            All plans include a 14-day free trial · No credit card required · Cancel anytime
          </div>
          <div style={{ background:"#fef9c3", borderRadius:12, padding:"14px 18px",
            display:"flex", alignItems:"center", gap:12, marginTop:20 }}>
            <span style={{ fontSize:20 }}>&#x1F4A1;</span>
            <div style={{ fontSize:13, color:"#713f12" }}>
              <strong>Pro and Business plans:</strong> unused reminders roll over for one month so you never waste your allowance.
            </div>
          </div>
          <div style={{ background:"linear-gradient(135deg,#0f172a,#1e0a3c)", borderRadius:20,
            padding:"36px 32px", marginBottom:16 }}>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", letterSpacing:"2px",
              textTransform:"uppercase", marginBottom:6 }}>Monthly</div>
            <div style={{ fontSize:52, fontWeight:900, color:"#fff", lineHeight:1,
              marginBottom:4 }}>£20<span style={{ fontSize:20, fontWeight:400,
                color:"rgba(255,255,255,0.4)" }}>/month</span></div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:24 }}>
              or £180/year — save two months
            </div>
            {["Google, Apple & Outlook Calendar","SMS, Email & WhatsApp","Unlimited contacts",
              "AI support assistant","Full message log","14-day free trial"].map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
                <span style={{ color:T.green }}>✓</span>
                <span style={{ fontSize:13, color:"rgba(255,255,255,0.8)" }}>{f}</span>
              </div>
            ))}
            <Btn onClick={onSignup} style={{ width:"100%", marginTop:22, fontSize:15, padding:15 }}>
              Start Free Trial →
            </Btn>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:10 }}>
              14-day free trial · No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"72px 24px", background:"linear-gradient(135deg,#0f172a,#1e0a3c)" }}>
        <div style={{ maxWidth:560, margin:"0 auto", textAlign:"center" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><Logo size={56}/></div>
          <h2 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:800, color:"#fff",
            marginBottom:12, lineHeight:1.15 }}>Stop losing jobs to no-shows</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.5)", marginBottom:30, lineHeight:1.75 }}>
            5 minutes to set up. Pays for itself the first time a customer actually turns up.
          </p>
          <Btn onClick={onSignup} style={{ fontSize:16, padding:"15px 36px" }}>Start Free Trial →</Btn>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", marginTop:14 }}>
            textreminder.co.uk · Built for UK tradespeople · Part of Rollright Publishing Ltd
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background:"#070412", padding:"24px" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", alignItems:"center",
          justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Logo size={28}/>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.5)" }}>textreminder.co.uk</div>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.2)" }}>
            © 2026 Rollright Publishing Ltd · Remind. Confirm. Keep Appointments.
          </div>
        </div>
      </footer>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
    </div>
  );
}

// ── AUTH ─────────────────────────────────────────────
function AuthPage({ mode, onSuccess, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [business, setBusiness] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handle(e) {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else onSuccess();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      if (data?.user && business) {
        await supabase.from("profiles").update({ business_name:business }).eq("id", data.user.id);
      }
      setConfirmed(true); setLoading(false);
    }
  }

  if (confirmed) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:8 }}>Check your email</h2>
        <p style={{ color:T.muted, fontSize:14, lineHeight:1.7 }}>
          We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your free trial.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#fdf4ff,#faf5ff,#f0fdf4)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}><Logo size={48}/></div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.text, marginBottom:6 }}>
            {mode==="login"?"Welcome back":"Start your free trial"}
          </h1>
          <p style={{ color:T.muted, fontSize:14 }}>
            {mode==="login"?"Sign in to your account":"14 days free · No credit card required"}
          </p>
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:28,
          boxShadow:"0 4px 24px rgba(168,85,247,0.1)", border:`1px solid ${T.border}` }}>
          <form onSubmit={handle}>
            {mode==="signup" && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.5px",
                  textTransform:"uppercase", marginBottom:6 }}>Business Name</div>
                <Input value={business} onChange={e=>setBusiness(e.target.value)}
                  placeholder="e.g. Four Shires Window Cleaning"/>
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.5px",
                textTransform:"uppercase", marginBottom:6 }}>Email</div>
              <Input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com"/>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.5px",
                textTransform:"uppercase", marginBottom:6 }}>Password</div>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="6+ characters"/>
            </div>
            {error && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8,
              padding:"10px 12px", fontSize:13, color:"#dc2626", marginBottom:16 }}>{error}</div>}
            <Btn disabled={loading} style={{ width:"100%", padding:14, fontSize:15 }}>
              {loading?"Please wait...":(mode==="login"?"Sign In →":"Start Free Trial →")}
            </Btn>
          </form>
          <div style={{ textAlign:"center", marginTop:18, fontSize:13, color:T.muted }}>
            {mode==="login"
              ? <span>No account? <button onClick={()=>onSwitch("signup")} style={{ background:"none",
                  border:"none", color:T.purple, fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Start free trial</button></span>
              : <span>Already have an account? <button onClick={()=>onSwitch("login")} style={{ background:"none",
                  border:"none", color:T.purple, fontWeight:600, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>Sign in</button></span>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD LAYOUT ─────────────────────────────────
function DashLayout({ page, setPage, user, onSignOut, children }) {
  const nav = [
    { id:"dashboard", icon:"▦",  label:"Dashboard"   },
    { id:"upcoming",  icon:"📅", label:"Upcoming"     },
    { id:"contacts",  icon:"👥", label:"Contacts"     },
    { id:"log",       icon:"📋", label:"Message Log"  },
    { id:"settings",  icon:"⚙️", label:"Settings"     },
  ];
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.light,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:220, background:"#0f172a", display:"flex", flexDirection:"column",
        flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
        <div style={{ padding:"22px 18px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <Logo size={30}/>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1 }}>
                text<span style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>reminder</span>
              </div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", letterSpacing:"1px" }}>textreminder.co.uk</div>
            </div>
          </div>
        </div>
        <nav style={{ padding:"14px 10px", flex:1 }}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"9px 10px", borderRadius:8, marginBottom:2,
              fontSize:13, fontWeight:page===n.id?600:400,
              color:page===n.id?"#fff":"rgba(255,255,255,0.45)",
              background:page===n.id?"rgba(255,255,255,0.08)":"transparent",
              border:"none", width:"100%", textAlign:"left", cursor:"pointer",
              fontFamily:"inherit", transition:"all 0.15s",
            }}>
              <span style={{ fontSize:14 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"14px 14px 20px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
          <button onClick={onSignOut} style={{ background:"none", border:"none",
            color:"rgba(255,255,255,0.3)", fontSize:12, cursor:"pointer",
            padding:0, fontFamily:"inherit", marginTop:4 }}>Sign out</button>
        </div>
      </div>
      <div style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>{children}</div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────
function Dashboard({ user }) {
  const [reminders, setReminders] = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(()=>{
    async function load() {
      const [{ data:rems },{ data:conts },{ data:prof }] = await Promise.all([
        supabase.from("reminders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10),
        supabase.from("contacts").select("*").eq("user_id",user.id).eq("active",true),
        supabase.from("profiles").select("*").eq("id",user.id).single(),
      ]);
      setReminders(rems||[]); setContacts(conts||[]); setProfile(prof);
      setLoading(false);
    }
    load();
  },[]);

  const sent = reminders.filter(r=>r.status==="sent"||r.status==="delivered").length;
  const trialDays = profile?.trial_ends_at ? Math.max(0,Math.ceil((new Date(profile.trial_ends_at)-new Date())/(1000*60*60*24))) : 0;

  const stats = [
    { icon:"📤", label:"Reminders sent",  value:sent,             sub:"All time" },
    { icon:"👥", label:"Contacts",         value:contacts.length,  sub:"Active customers" },
    { icon:"📅", label:"This month",       value:reminders.filter(r=>new Date(r.created_at).getMonth()===new Date().getMonth()).length, sub:"Reminders sent" },
    { icon:"⏰", label:"Trial days left",  value:trialDays,        sub:"Then £20/month" },
  ];

  if (loading) return <div style={{ textAlign:"center", padding:60, color:T.muted }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Dashboard</h1>
        <div style={{ fontSize:13, color:T.muted }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
      </div>
      {profile?.plan==="trial" && trialDays > 0 && (
        <div style={{ background:"linear-gradient(135deg,#fdf4ff,#faf5ff)", border:`1px solid ${T.border}`,
          borderRadius:12, padding:"12px 18px", marginBottom:24, display:"flex",
          alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, color:"#7c3aed" }}><strong>{trialDays} days</strong> left on your free trial</div>
          <button style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff",
            borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, border:"none", cursor:"pointer" }}>
            Upgrade — £20/month
          </button>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 }}>
        {stats.map((s,i)=>(
          <Card key={i} style={{ padding:"20px 22px" }}>
            <div style={{ fontSize:22, marginBottom:10 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:T.text, lineHeight:1, marginBottom:4 }}>{s.value}</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#475569", marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:11, color:T.muted }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid #f1f5f9" }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.text }}>Recent Reminders</div>
        </div>
        {reminders.length===0 ? (
          <div style={{ padding:"40px 20px", textAlign:"center", color:T.muted, fontSize:13 }}>
            No reminders sent yet — connect your calendar in Settings to get started
          </div>
        ) : reminders.map((r,i)=>(
          <div key={r.id} style={{ padding:"12px 20px", borderBottom:"1px solid #f8fafc",
            display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:"#f3e8ff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
              {r.channel==="sms"?"📱":r.channel==="email"?"✉️":"💬"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{r.contact_name}</div>
              <div style={{ fontSize:11, color:T.muted }}>{new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:20,
              background:r.status==="sent"||r.status==="delivered"?"#dcfce7":"#fef2f2",
              color:r.status==="sent"||r.status==="delivered"?"#166534":"#dc2626" }}>
              {r.status}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── CONTACTS ──────────────────────────────────────────
function Contacts({ user }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name:"", phone:"", email:"" });
  const [saving, setSaving]     = useState(false);

  useEffect(()=>{
    supabase.from("contacts").select("*").eq("user_id",user.id).eq("active",true).order("name")
      .then(({data})=>{ setContacts(data||[]); setLoading(false); });
  },[]);

  async function add() {
    if (!form.name) return;
    setSaving(true);
    const { data } = await supabase.from("contacts").insert({ user_id:user.id, ...form }).select().single();
    setContacts(p=>[...p,data]); setShowAdd(false); setForm({name:"",phone:"",email:""}); setSaving(false);
  }

  async function remove(id) {
    if (!confirm("Remove this contact?")) return;
    await supabase.from("contacts").update({active:false}).eq("id",id);
    setContacts(p=>p.filter(c=>c.id!==id));
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Contacts</h1>
          <div style={{ fontSize:13, color:T.muted }}>{contacts.length} customers</div>
        </div>
        <Btn onClick={()=>setShowAdd(true)} style={{ padding:"9px 18px", fontSize:13 }}>+ Add Contact</Btn>
      </div>

      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
          onClick={()=>setShowAdd(false)}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, width:400,
            boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }} onClick={e=>e.stopPropagation()}>
            <h2 style={{ fontSize:17, fontWeight:700, color:T.text, marginBottom:20 }}>Add Contact</h2>
            {[{k:"name",l:"Full Name *",p:"Sarah Mitchell"},{k:"phone",l:"Mobile",p:"07712 345 678"},{k:"email",l:"Email",p:"sarah@example.com"}].map(f=>(
              <div key={f.k} style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase",
                  letterSpacing:"0.5px", marginBottom:5 }}>{f.l}</div>
                <Input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}/>
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={()=>setShowAdd(false)} style={{ flex:1, background:"#f1f5f9",
                color:"#475569", border:"none", borderRadius:8, padding:12, fontSize:13,
                fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <Btn onClick={add} disabled={!form.name||saving} style={{ flex:2, padding:12, fontSize:13 }}>
                {saving?"Adding...":"Add Contact"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1.5fr 80px",
          padding:"10px 20px", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", gap:12 }}>
          {["Name","Phone","Email",""].map(h=><div key={h} style={{ fontSize:10, fontWeight:700,
            color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase" }}>{h}</div>)}
        </div>
        {loading && <div style={{ padding:"40px", textAlign:"center", color:T.muted }}>Loading...</div>}
        {!loading && contacts.length===0 && (
          <div style={{ padding:"48px 20px", textAlign:"center", color:T.muted, fontSize:13 }}>
            No contacts yet — add your first customer above
          </div>
        )}
        {contacts.map((c,i)=>(
          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1.5fr 80px",
            padding:"13px 20px", borderBottom:"1px solid #f8fafc",
            background:i%2===0?"#fff":"#fafafa", gap:12, alignItems:"center" }}>
            <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{c.name}</div>
            <div style={{ fontSize:12, color:"#64748b" }}>{c.phone||"—"}</div>
            <div style={{ fontSize:12, color:"#64748b" }}>{c.email||"—"}</div>
            <button onClick={()=>remove(c.id)} style={{ background:"none", border:"1px solid #fee2e2",
              borderRadius:6, padding:"4px 10px", fontSize:11, color:"#dc2626",
              cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Remove</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── MESSAGE LOG ───────────────────────────────────────
function MessageLog({ user }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(()=>{
    supabase.from("reminders").select("*").eq("user_id",user.id)
      .order("created_at",{ascending:false}).limit(100)
      .then(({data})=>{ setReminders(data||[]); setLoading(false); });
  },[]);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Message Log</h1>
        <div style={{ fontSize:13, color:T.muted }}>{reminders.length} reminders sent</div>
      </div>
      <Card>
        {loading && <div style={{ padding:"40px", textAlign:"center", color:T.muted }}>Loading...</div>}
        {!loading && reminders.length===0 && (
          <div style={{ padding:"48px", textAlign:"center", color:T.muted }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
            No messages sent yet
          </div>
        )}
        {reminders.map((r)=>(
          <div key={r.id} style={{ padding:"16px 20px", borderBottom:"1px solid #f8fafc",
            display:"flex", gap:14, alignItems:"flex-start" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#f3e8ff",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
              {r.channel==="sms"?"📱":r.channel==="email"?"✉️":"💬"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ fontWeight:700, color:T.text, fontSize:13 }}>{r.contact_name}</div>
                <div style={{ fontSize:11, color:T.muted }}>{new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              <div style={{ fontSize:12, color:"#64748b", background:"#f8fafc", borderRadius:8,
                padding:"8px 10px", lineHeight:1.6, marginBottom:6 }}>{r.message}</div>
              <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20,
                background:r.status==="sent"||r.status==="delivered"?"#dcfce7":"#fef2f2",
                color:r.status==="sent"||r.status==="delivered"?"#166534":"#dc2626" }}>
                {r.status==="sent"||r.status==="delivered"?"✓ Delivered":"✗ Failed"}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ── UPCOMING ──────────────────────────────────────────
function Upcoming({ user }) {
  const [events, setEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    Promise.all([
      supabase.from("calendar_events").select("*").eq("user_id",user.id)
        .gte("start_time",new Date().toISOString()).order("start_time").limit(50),
      supabase.from("profiles").select("*").eq("id",user.id).single(),
    ]).then(([{data:evs},{data:prof}])=>{ setEvents(evs||[]); setProfile(prof); setLoading(false); });
  },[]);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Upcoming Appointments</h1>
        <div style={{ fontSize:13, color:T.muted }}>
          {profile?.calendar_provider
            ? <><span style={{ width:6, height:6, borderRadius:"50%", background:T.green, display:"inline-block", marginRight:6 }}/>Synced from {profile.calendar_provider} calendar</>
            : "No calendar connected — go to Settings to connect one"}
        </div>
      </div>
      <Card>
        {loading && <div style={{ padding:"40px", textAlign:"center", color:T.muted }}>Loading...</div>}
        {!loading && events.length===0 && (
          <div style={{ padding:"48px 20px", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:10 }}>📅</div>
            <div style={{ fontWeight:600, color:"#475569", marginBottom:6 }}>No upcoming appointments</div>
            <div style={{ fontSize:13, color:T.muted }}>
              {profile?.calendar_provider?"Your calendar appears empty":"Connect your calendar in Settings"}
            </div>
          </div>
        )}
        {events.map((e,i)=>{
          const isToday = new Date(e.start_time).toDateString()===new Date().toDateString();
          return (
            <div key={e.id} style={{ padding:"13px 20px", borderBottom:"1px solid #f8fafc",
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background:isToday?"#fffbeb":"#fff", gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{e.title||"Appointment"}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                  {new Date(e.start_time).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
                  {" · "}{new Date(e.start_time).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
                </div>
              </div>
              <span style={{ display:"inline-block", background:isToday?"#fef3c7":"#f1f5f9",
                color:isToday?"#92400e":"#475569", fontSize:11, fontWeight:700,
                padding:"3px 8px", borderRadius:6 }}>
                {isToday?"Today":"Upcoming"}
              </span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────
function Settings({ user }) {
  const [form, setForm] = useState({
    business_name:"", phone:"",
    message_template:"Hi {name}, just a reminder your appointment is tomorrow at {time}. Any questions call {business_phone}. Reply STOP to opt out.",
    reminder_hours:24,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    supabase.from("profiles").select("*").eq("id",user.id).single()
      .then(({data})=>{ if(data) setForm(p=>({...p,
        business_name:data.business_name||"",
        phone:data.phone||"",
        message_template:data.message_template||p.message_template,
        reminder_hours:data.reminder_hours||24,
      })); });
  },[]);

  async function save() {
    setSaving(true);
    await supabase.from("profiles").update(form).eq("id",user.id);
    setSaving(false); setSaved(true); setTimeout(()=>setSaved(false),2500);
  }

  const SectionWrap = ({title,sub,children})=>(
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:24, marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:T.text, marginBottom:3 }}>{title}</div>
      {sub&&<div style={{ fontSize:12, color:T.muted, marginBottom:16 }}>{sub}</div>}
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:4 }}>Settings</h1>
          <div style={{ fontSize:13, color:T.muted }}>Configure your account and reminders</div>
        </div>
        <Btn onClick={save} disabled={saving} style={{ padding:"9px 20px", fontSize:13 }}>
          {saving?"Saving...":saved?"✓ Saved!":"Save Changes"}
        </Btn>
      </div>

      <SectionWrap title="Business Details" sub="Used in your reminder messages">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Business Name</div>
            <Input value={form.business_name} onChange={e=>set("business_name",e.target.value)} placeholder="e.g. Four Shires Window Cleaning"/>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Contact Number</div>
            <Input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="07700 900123"/>
          </div>
        </div>
      </SectionWrap>

      <SectionWrap title="Message Template" sub="Use {name}, {time}, and {business_phone} as placeholders">
        <textarea value={form.message_template} onChange={e=>set("message_template",e.target.value)}
          rows={3} style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:8,
            padding:"10px 12px", fontSize:13, color:T.text, outline:"none", fontFamily:"inherit",
            background:"#fff", resize:"vertical", lineHeight:1.6, boxSizing:"border-box" }}/>
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 13px", fontSize:12,
          color:"#475569", lineHeight:1.6, marginTop:10 }}>
          <strong>Preview: </strong>
          <em>{form.message_template.replace("{name}","Sarah").replace("{time}","9am").replace("{business_phone}",form.phone||"07700 900123")}</em>
        </div>
      </SectionWrap>

      <SectionWrap title="Reminder Timing" sub="How many hours before the appointment?">
        <div style={{ display:"flex", gap:8 }}>
          {[12,24,48].map(h=>(
            <button key={h} onClick={()=>set("reminder_hours",h)} style={{ padding:"9px 20px",
              borderRadius:8, border:`1px solid ${form.reminder_hours===h?T.purple:"#e2e8f0"}`,
              background:form.reminder_hours===h?"#f3e8ff":"#fff",
              color:form.reminder_hours===h?"#7c3aed":"#475569",
              fontSize:13, fontWeight:form.reminder_hours===h?700:400,
              cursor:"pointer", fontFamily:"inherit" }}>{h} hours</button>
          ))}
        </div>
      </SectionWrap>

      <SectionWrap title="Calendar Connection" sub="Connect your calendar to automatically import appointments">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[
            {k:"google",icon:"📅",label:"Google Calendar"},
            {k:"apple",icon:"🍎",label:"Apple Calendar"},
            {k:"outlook",icon:"💼",label:"Outlook"},
          ].map(cal=>(
            <div key={cal.k} style={{ border:`1px solid ${T.border}`, borderRadius:10,
              padding:"14px 16px", textAlign:"center", background:"#fff" }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{cal.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:10 }}>{cal.label}</div>
              <button style={{ fontSize:11, fontWeight:700, color:T.purple, background:"none",
                border:`1px solid ${T.border}`, borderRadius:6, padding:"5px 12px",
                cursor:"pointer", fontFamily:"inherit" }}>Connect</button>
            </div>
          ))}
        </div>
      </SectionWrap>

      <SectionWrap title="Plan & Billing">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 16px", background:"#fdf4ff", borderRadius:10, border:`1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>Free Trial</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>14 days included</div>
          </div>
          <Btn style={{ padding:"8px 18px", fontSize:12 }}>Upgrade — £20/month</Btn>
        </div>
      </SectionWrap>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────
export default function App() {
  const [view, setView]   = useState("home");
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashPage, setDashPage] = useState("dashboard");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      if(session?.user) setView("app");
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      setUser(session?.user??null);
      if(session?.user) setView("app");
      else setView("home");
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setView("home");
  }

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:T.light, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width:32, height:32, border:"3px solid #e9d5ff", borderTopColor:T.purple,
        borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (view==="home") return (
    <>
      <HomePage onSignup={()=>setView("signup")} onLogin={()=>setView("login")}/>
      <AiChat/>
    </>
  );

  if (view==="login"||view==="signup") return (
    <>
      <AuthPage mode={view} onSuccess={()=>setView("app")} onSwitch={setView}/>
      <AiChat/>
    </>
  );

  if (view==="app" && user) return (
    <>
      <DashLayout page={dashPage} setPage={setDashPage} user={user} onSignOut={signOut}>
        {dashPage==="dashboard" && <Dashboard user={user}/>}
        {dashPage==="upcoming"  && <Upcoming user={user}/>}
        {dashPage==="contacts"  && <Contacts user={user}/>}
        {dashPage==="log"       && <MessageLog user={user}/>}
        {dashPage==="settings"  && <Settings user={user}/>}
      </DashLayout>
      <AiChat/>
    </>
  );

  return null;
}
