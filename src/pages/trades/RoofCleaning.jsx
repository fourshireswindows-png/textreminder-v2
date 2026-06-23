import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/window-cleaners', label: 'Window cleaners' },
  { to: '/gutter-cleaners', label: 'Gutter cleaners' },
  { to: '/pressure-washing', label: 'Pressure washing' },
  { to: '/solar-panel-cleaning', label: 'Solar panel cleaning' },
]

export default function RoofCleaning({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Customer Reminders for Roof Cleaning and Softwash Businesses | TextReminder"
      metaDesc="Automatically notify customers before roof cleans, softwash treatments and moss removal visits. TextReminder handles access requests, day-before reminders and rescheduling for roof cleaning businesses."
      canonical="https://textreminder.co.uk/roof-cleaning"
      h1="Customer notifications for roof cleaning and softwash businesses"
      intro="Roof cleaning and softwash jobs require customer presence, clear access, and specific conditions. TextReminder automatically keeps customers informed before every visit — from the initial reminder to weather rescheduling."
      tradeLabel="roof cleaning and softwash businesses"
      problems={[
        { title: "High-value jobs require customer presence", desc: "Roof cleans and softwash treatments often need the customer to be home or at least reachable. Without advance notice, you may arrive to find no one there." },
        { title: "Complex access requirements", desc: "Roof cleaning requires clear access around the property, no vehicles near working areas, and sometimes interior access for post-treatment checks. Customers need clear instructions." },
        { title: "Weather dependency and frequent rescheduling", desc: "Roof cleaning and softwash work is highly weather-dependent. Rescheduling jobs and contacting every affected customer manually is time-consuming and stressful." },
        { title: "Customers don't understand treatment timelines", desc: "Biocide treatments take weeks to show results. Customers need to know what to expect after the visit — preventing unnecessary callbacks." },
        { title: "Long gaps between jobs", desc: "Roof cleans may be annual or one-off. Customers rarely remember booking dates this far in advance without a reminder." },
        { title: "High job values make communication critical", desc: "With jobs often costing hundreds of pounds, a failed visit due to missing access or a forgotten appointment is a significant loss." },
      ]}
      features={[
        { title: "Pre-job access and preparation messages", desc: "Automatically tell customers to clear the area, be available, or make any other preparation before your team arrives." },
        { title: "Day-before job reminders", desc: "Every customer receives an automatic reminder the evening before their roof clean or softwash treatment. No surprises, no missed visits." },
        { title: "Post-treatment follow-up messages", desc: "Send an automatic message after the visit explaining what customers should expect from the treatment in the coming weeks." },
        { title: "Weather-delay batch notifications", desc: "Select affected jobs, choose your delay message, send to all customers at once. Handles a full day's rescheduling in seconds." },
        { title: "Works with high-value one-off jobs", desc: "Roof cleaning is often a one-off or infrequent job. TextReminder handles both single visits and scheduled recurring treatments." },
        { title: "Rescheduling confirmation messages", desc: "When jobs move, customers receive an automatic confirmation of their new date — keeping communication professional at every stage." },
      ]}
      faqs={[
        { q: "Can I include post-treatment instructions in the message?", a: "Yes. You can set up a follow-up message to send automatically after a visit — explaining the treatment timeline, what results to expect, and when the moss or algae will be visibly reduced." },
        { q: "How does it handle weather rescheduling?", a: "Use the weather-delay tool to select affected jobs, write or choose a delay message, and send it to all those customers in one step. You can also update their job dates at the same time." },
        { q: "Does it work for one-off roof cleans?", a: "Yes. Add the job, set the reminder timing, and the customer receives their message automatically. One-off jobs work the same as recurring ones." },
        { q: "Can I explain what access I need in the reminder message?", a: "Yes. Every message template is fully editable. Include specific access requirements — clear driveway, no vehicles nearby, accessible rear garden — in the automatic reminder." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
