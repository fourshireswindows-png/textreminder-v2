import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/window-cleaners', label: 'Window cleaners' },
  { to: '/roof-cleaning', label: 'Roof cleaning' },
  { to: '/gutter-cleaners', label: 'Gutter cleaners' },
  { to: '/commercial-exterior-cleaning', label: 'Commercial exterior cleaning' },
]

export default function SolarPanels({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Customer Reminders for Solar Panel Cleaning Businesses | TextReminder"
      metaDesc="Automatically notify customers before solar panel cleaning visits. TextReminder sends access requests, seasonal reminders and rescheduling messages for solar panel cleaning businesses."
      h1="Customer notifications for solar panel cleaning businesses"
      intro="Solar panel cleaning customers need advance notice, roof or ground access, and clear instructions. TextReminder automatically sends the right message at the right time — so every visit is expected and access is ready."
      emoji="☀️"
      tradeLabel="solar panel cleaning businesses"
      problems={[
        { title: "Customers aren't home or don't know you're coming", desc: "Solar panel cleans often require the customer to be available or at least reachable. Showing up unannounced creates problems and damages trust." },
        { title: "Access to inverters or isolators is sometimes needed", desc: "Certain cleaning processes require customers to provide internal access. Without advance notice, this delays the job or prevents it entirely." },
        { title: "Seasonal timing confuses customers", desc: "Customers who book annual or bi-annual panel cleans often forget the appointment entirely. A reminder confirms the visit and prevents cancellations." },
        { title: "Commercial customers need more notice", desc: "Business premises often require more preparation — notifying site managers, clearing areas around installations, or coordinating with on-site staff." },
        { title: "Weather rescheduling is disruptive", desc: "Cancelling a day's solar panel cleans due to conditions requires messaging every affected customer individually — unless you have a tool to batch them." },
        { title: "Post-clean performance updates", desc: "Customers want to know the clean is done and what to expect in terms of improved output. A follow-up message adds professionalism." },
      ]}
      features={[
        { title: "Automatic visit reminders", desc: "Customers receive an automatic reminder before every solar panel clean — whether it's their first visit or part of a regular maintenance schedule." },
        { title: "Access and preparation instructions", desc: "Include specific requirements in the reminder: being home, providing inverter access, clearing the area around ground-mounted panels, or anything else you need." },
        { title: "Seasonal and recurring schedule support", desc: "Set up annual, bi-annual or quarterly cleaning schedules. TextReminder sends the customer notification automatically each time a visit is due." },
        { title: "Commercial site notifications", desc: "For commercial customers, send reminders with the detail site managers or facilities teams need — arrival time, duration, and any access requirements." },
        { title: "Weather-delay tool", desc: "Select affected jobs, write a delay message, send to all those customers at once. Handles a full day's rescheduling in seconds." },
        { title: "Post-visit confirmation messages", desc: "Send an automatic message after the clean confirming the work is complete — professional communication that reinforces trust and repeat business." },
      ]}
      faqs={[
        { q: "Can I include access instructions for inverter or isolator access?", a: "Yes. Every message template is editable. Include specific instructions for any access you need — internal access, gate codes, who to ask for on commercial sites." },
        { q: "Does it work for annual and seasonal panel cleans?", a: "Yes. Add the job to your schedule and TextReminder sends the customer reminder automatically when the visit is due. Works for annual, bi-annual or any other frequency." },
        { q: "How does it handle commercial customers with multiple contacts?", a: "You can add notes to each customer record and customise the message for each job. Commercial sites can receive a more formal notification with the detail they need." },
        { q: "Can I send a post-clean completion message?", a: "Yes. You can set up a follow-up message to go out after the visit confirming the clean is complete. This works well for both residential and commercial customers." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
