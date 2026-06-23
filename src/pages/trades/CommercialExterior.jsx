import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/window-cleaners', label: 'Window cleaners' },
  { to: '/gutter-cleaners', label: 'Gutter cleaners' },
  { to: '/pressure-washing', label: 'Pressure washing' },
  { to: '/solar-panel-cleaning', label: 'Solar panel cleaning' },
]

export default function CommercialExterior({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Customer Communication for Commercial Exterior Cleaning Businesses | TextReminder"
      metaDesc="Keep commercial customers and site managers informed before every exterior cleaning visit. TextReminder sends automatic notifications, access confirmations and rescheduling messages for commercial exterior cleaning businesses."
      h1="Professional customer communication for commercial exterior cleaning"
      intro="Commercial exterior cleaning contracts require reliable, professional communication with site managers, facilities teams and business owners. TextReminder automatically sends the right message before every visit — keeping your commercial customers informed without manual effort."
      emoji="🏢"
      tradeLabel="commercial exterior cleaning businesses"
      problems={[
        { title: "Site managers need advance notice", desc: "Commercial sites often require 24-48 hours notice before a cleaning visit — for security, access coordination, or staff notification. Manual reminders are easy to forget." },
        { title: "Multiple contacts per customer", desc: "A commercial customer may have a facilities manager, a site contact, and a billing contact. Keeping the right person informed about visit timing is time-consuming manually." },
        { title: "Access and site preparation varies by location", desc: "Each commercial site has different access requirements — security passes, on-site contacts to notify, equipment areas to clear. Customers need specific instructions before every visit." },
        { title: "Contract visits are high-value", desc: "Missing a commercial window clean or exterior maintenance visit damages a contract relationship. Professional advance communication prevents it." },
        { title: "Rescheduling affects planned operations", desc: "When a commercial clean is postponed, the customer may need to inform their own team or adjust building access. They need prompt, professional notification." },
        { title: "Demonstrating professionalism", desc: "Commercial customers expect a more professional communication standard than domestic ones. Automated, well-written messages reinforce your business's credibility." },
      ]}
      features={[
        { title: "Professional visit notifications", desc: "Commercial customers receive a well-formatted automatic message before every cleaning visit — confirming the date, time, and any access requirements." },
        { title: "Customisable per-site messages", desc: "Every job can have its own message template. Include site-specific instructions, contact names, and access information relevant to that location." },
        { title: "Advance notice on your schedule", desc: "Set how far in advance each commercial customer receives their notification — 24 hours, 48 hours, or the morning of the visit." },
        { title: "Weather-delay and rescheduling notifications", desc: "When exterior conditions prevent a visit, send a professional delay message to affected commercial customers immediately — maintaining the relationship." },
        { title: "Works alongside your contract management", desc: "Import commercial customers via CSV, connect Google Calendar, or add jobs manually. TextReminder fits around your existing contract management process." },
        { title: "Full message audit log", desc: "Every message sent to every commercial customer is logged with timestamp and delivery status — useful for contract compliance and dispute resolution." },
      ]}
      faqs={[
        { q: "Can I send different messages to different commercial sites?", a: "Yes. Every job can use a different message template. Set up site-specific instructions, contact details, and access information for each commercial customer." },
        { q: "Can I set longer advance notice for commercial customers?", a: "Yes. You choose the sending timing for each job — 24 hours, 48 hours, the morning of the visit, or any custom timing that suits your commercial contracts." },
        { q: "How does rescheduling work for commercial customers?", a: "Use the weather-delay or rescheduling tool to select affected commercial jobs, write a professional delay message, and send it to those customers at once. You can update job dates at the same time." },
        { q: "Can I keep a record of messages sent for contract compliance?", a: "Yes. The full message log shows every message sent, to whom, when, and its delivery status. This provides a useful record for contract management purposes." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
