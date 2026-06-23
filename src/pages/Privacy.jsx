import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy — TextReminder'
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#fff', minHeight:'100vh' }}>
      {/* Nav */}
      <nav style={{ background:'#0f172a', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'0 20px' }}>
        <div style={{ maxWidth:860, margin:'0 auto', height:62, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:9 }}>
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <defs><linearGradient id="lgp" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
              <path d="M6 8C6 5.79 7.79 4 10 4H38C40.21 4 42 5.79 42 8V30C42 32.21 40.21 34 38 34H26L18 42V34H10C7.79 34 6 32.21 6 30V8Z" fill="url(#lgp)"/>
              <rect x="14" y="14" width="20" height="3" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="14" y="21" width="14" height="3" rx="1.5" fill="white" opacity="0.9"/>
              <circle cx="37" cy="11" r="8" fill="#22c55e"/>
              <path d="M33 11L36 14L41 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight:800, fontSize:16, color:'#fff' }}>text<span style={{ color:'#ec4899' }}>reminder</span></span>
          </Link>
          <Link to="/" style={{ fontSize:14, color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>← Back to home</Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth:740, margin:'0 auto', padding:'60px 20px 80px' }}>
        <h1 style={{ fontSize:36, fontWeight:800, color:'#0f172a', marginBottom:8, letterSpacing:'-0.8px' }}>Privacy Policy</h1>
        <p style={{ fontSize:14, color:'#94a3b8', marginBottom:48 }}>Last updated: 23 June 2026</p>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>1. Who we are</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            TextReminder is operated by Rollright Publishing Ltd, a company registered in England and Wales. We provide an automated SMS appointment reminder service for UK businesses. You can contact us at <a href="mailto:hello@textreminder.co.uk" style={{ color:'#a855f7' }}>hello@textreminder.co.uk</a>.
          </p>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>2. Information we collect</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:12 }}>We collect the following information when you use TextReminder:</p>
          <ul style={{ paddingLeft:24, fontSize:15, color:'#334155', lineHeight:2 }}>
            <li><strong>Account information:</strong> your email address and business name when you sign up.</li>
            <li><strong>Google Calendar data:</strong> when you connect your Google Calendar, we access your calendar event titles, dates, times, and locations to create appointment reminders. We do not access personal emails, contacts, or any data outside your calendar events.</li>
            <li><strong>Customer phone numbers:</strong> phone numbers you add to calendar events for the purpose of sending SMS reminders.</li>
            <li><strong>Message logs:</strong> records of SMS messages sent, including delivery status.</li>
            <li><strong>Usage data:</strong> how you interact with the service, for product improvement purposes.</li>
          </ul>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>3. How we use your information</h2>
          <ul style={{ paddingLeft:24, fontSize:15, color:'#334155', lineHeight:2 }}>
            <li>To send automated SMS reminders to your customers on your behalf.</li>
            <li>To sync your Google Calendar events and generate reminders at the times you configure.</li>
            <li>To provide you with message delivery logs and account management features.</li>
            <li>To send you service-related emails (e.g. SMS allowance alerts).</li>
            <li>To improve and maintain the TextReminder service.</li>
          </ul>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>4. Google API services</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:12 }}>
            TextReminder's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color:'#a855f7' }}>Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:12 }}>
            Specifically, we access your Google Calendar only to read your calendar events for the purpose of generating SMS reminders. We do not:
          </p>
          <ul style={{ paddingLeft:24, fontSize:15, color:'#334155', lineHeight:2 }}>
            <li>Share your Google Calendar data with third parties except as necessary to send SMS reminders (via our SMS provider).</li>
            <li>Use your Google Calendar data for advertising or any purpose unrelated to sending reminders.</li>
            <li>Store your Google Calendar data beyond what is needed to send reminders.</li>
            <li>Allow humans to read your Google Calendar data unless you explicitly request support and grant access.</li>
          </ul>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>5. Data sharing</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            We do not sell your personal data. We share data only with:
          </p>
          <ul style={{ paddingLeft:24, fontSize:15, color:'#334155', lineHeight:2 }}>
            <li><strong>The SMS Works</strong> — our UK-based SMS delivery provider, who receives phone numbers and message content to send reminders.</li>
            <li><strong>Supabase</strong> — our database and authentication provider, who stores your account and event data securely.</li>
          </ul>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>6. Data retention</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            We retain your account data for as long as your account is active. Message logs are retained for 12 months. You may request deletion of your account and all associated data at any time by contacting <a href="mailto:hello@textreminder.co.uk" style={{ color:'#a855f7' }}>hello@textreminder.co.uk</a>.
          </p>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>7. Your rights</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginBottom:12 }}>Under UK GDPR, you have the right to:</p>
          <ul style={{ paddingLeft:24, fontSize:15, color:'#334155', lineHeight:2 }}>
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Object to or restrict processing of your data.</li>
            <li>Withdraw consent for Google Calendar access at any time via Settings → Disconnect.</li>
          </ul>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8, marginTop:12 }}>
            To exercise any of these rights, contact us at <a href="mailto:hello@textreminder.co.uk" style={{ color:'#a855f7' }}>hello@textreminder.co.uk</a>.
          </p>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>8. Security</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            We use industry-standard security measures including encrypted connections (HTTPS), secure token storage, and access controls. Google OAuth tokens are stored securely and used only to sync your calendar.
          </p>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>9. Cookies</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            We use essential cookies only — specifically, authentication session cookies to keep you logged in. We do not use advertising or tracking cookies.
          </p>
        </section>

        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>10. Changes to this policy</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            We may update this privacy policy from time to time. We will notify you of significant changes by email or via a notice on the service.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:12 }}>11. Contact</h2>
          <p style={{ fontSize:15, color:'#334155', lineHeight:1.8 }}>
            For any privacy-related questions, contact us at <a href="mailto:hello@textreminder.co.uk" style={{ color:'#a855f7' }}>hello@textreminder.co.uk</a>.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer style={{ background:'#070c14', padding:'28px 20px', textAlign:'center' }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.2)' }}>© 2026 Rollright Publishing Ltd · <Link to="/" style={{ color:'rgba(255,255,255,0.2)', textDecoration:'none' }}>textreminder.co.uk</Link></div>
      </footer>
    </div>
  )
}
