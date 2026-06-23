/**
 * Shared trade landing-page shell.
 * Each trade page imports this and passes its own content.
 */
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

const B = {
  navy:   '#0f172a',
  pink:   '#ec4899',
  purple: '#a855f7',
  sky:    '#fdf2f8',
  text:   '#1e293b',
  muted:  '#64748b',
  light:  '#f8fafc',
  border: '#e2e8f0',
  green:  '#16a34a',
  white:  '#ffffff',
}

function Nav({ onSignup }) {
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${B.border}` }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
            <defs><linearGradient id="lgtp" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
            <rect width="48" height="48" rx="11" fill="url(#lgtp)" />
            <path d="M10 14C10 11.8 11.8 10 14 10H34C36.2 10 38 11.8 38 14V28C38 30.2 36.2 32 34 32H27L21 38V32H14C11.8 32 10 30.2 10 28V14Z" fill="white" opacity="0.95"/>
            <rect x="15" y="18" width="18" height="2.5" rx="1.25" fill="#ec4899"/>
            <rect x="15" y="23" width="12" height="2.5" rx="1.25" fill="#ec4899"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 16, color: B.navy }}>text<span style={{ color: B.pink }}>reminder</span></span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: B.muted, textDecoration: 'none', padding: '8px 12px' }}>Log in</Link>
          <button onClick={onSignup} style={{ background: `linear-gradient(135deg,${B.pink},${B.purple})`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Start free
          </button>
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{ background: B.navy, padding: '40px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>text<span style={{ color: '#f9a8d4' }}>reminder</span></span>
        </Link>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[['/', 'Home'], ['/pricing', 'Pricing'], ['/window-cleaners', 'Window cleaning'], ['/gutter-cleaners', 'Gutter cleaning'], ['/pressure-washing', 'Pressure washing']].map(([to, label]) => (
            <Link key={to} to={to} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© 2026 Rollright Publishing Ltd</div>
      </div>
    </footer>
  )
}

export default function TradePage({
  onSignup,
  title,          // document.title
  metaDesc,       // meta description
  h1,             // page H1
  intro,          // intro paragraph
  tradeLabel,     // e.g. "window cleaners"
  problems,       // [{title, desc}]
  features,       // [{title, desc}]
  faqs,           // [{q, a}]
  seoLinks,       // [{to, label}] — internal links to other trade pages
}) {
  useEffect(() => {
    document.title = title
    const setMeta = (sel, val) => { const el = document.querySelector(sel); if (el) el.setAttribute('content', val) }
    setMeta('meta[name="description"]', metaDesc)
  }, [title, metaDesc])

  const handleSignup = onSignup || (() => { window.location.href = '/signup' })

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: B.text, background: B.white }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr !important; } .grid-3 { grid-template-columns: 1fr !important; } }`}</style>

      <Nav onSignup={handleSignup} />

      {/* Hero */}
      <section style={{ background: B.navy, padding: '80px 20px 90px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 50px)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-1.2px', marginBottom: 20 }}>{h1}</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 32px' }}>{intro}</p>
          <button onClick={handleSignup}
            style={{ background: `linear-gradient(135deg,${B.pink},${B.purple})`, color: '#fff', border: 'none', borderRadius: 9, padding: '14px 34px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>
            Start free
          </button>
          <Link to="/#pricing" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, textDecoration: 'none' }}>See pricing →</Link>
        </div>
      </section>

      {/* Problems */}
      {problems && (
        <section style={{ padding: '72px 20px', background: B.white }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, color: B.navy, marginBottom: 40, textAlign: 'center' }}>
              The communication challenges {tradeLabel} face every day
            </h2>
            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {problems.map(({ title, desc }) => (
                <div key={title} style={{ background: B.light, border: `1px solid ${B.border}`, borderRadius: 12, padding: '22px 20px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: B.navy, marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 14, color: B.muted, lineHeight: 1.7 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {features && (
        <section style={{ padding: '72px 20px', background: B.sky }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, color: B.navy, marginBottom: 40, textAlign: 'center' }}>
              How TextReminder helps {tradeLabel}
            </h2>
            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {features.map(({ title, desc }) => (
                <div key={title} style={{ background: B.white, border: `1px solid ${B.border}`, borderRadius: 12, padding: '22px 20px' }}>
                  <div style={{ color: B.green, fontWeight: 700, marginBottom: 4 }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: B.navy, marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 14, color: B.muted, lineHeight: 1.7 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs && (
        <section style={{ padding: '72px 20px', background: B.white }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800, color: B.navy, marginBottom: 36, textAlign: 'center' }}>Common questions</h2>
            {faqs.map(({ q, a }) => (
              <div key={q} style={{ borderBottom: `1px solid ${B.border}`, padding: '18px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: B.navy, marginBottom: 8 }}>{q}</div>
                <div style={{ fontSize: 14, color: B.muted, lineHeight: 1.75 }}>{a}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Internal links */}
      {seoLinks && (
        <section style={{ padding: '48px 20px', background: B.light, borderTop: `1px solid ${B.border}` }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: B.muted, marginBottom: 14, fontWeight: 600 }}>TextReminder also works for:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {seoLinks.map(({ to, label }) => (
                <Link key={to} to={to} style={{ background: B.white, border: `1px solid ${B.border}`, borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: B.pink, textDecoration: 'none' }}>{label} →</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ padding: '72px 20px', background: B.navy, textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 800, color: '#fff', marginBottom: 14 }}>
          Ready to stop texting tomorrow's customers manually?
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>Start free with 20 SMS credits. No credit card required.</p>
        <button onClick={handleSignup}
          style={{ background: `linear-gradient(135deg,${B.pink},${B.purple})`, color: '#fff', border: 'none', borderRadius: 9, padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Start free today
        </button>
      </section>

      <Footer />
    </div>
  )
}
