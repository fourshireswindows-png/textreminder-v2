import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/window-cleaners', label: 'Window cleaners' },
  { to: '/pressure-washing', label: 'Pressure washing' },
  { to: '/roof-cleaning', label: 'Roof cleaning' },
  { to: '/solar-panel-cleaning', label: 'Solar panel cleaning' },
]

export default function GutterCleaners({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Customer Reminders for Gutter Cleaners | TextReminder"
      metaDesc="Automatically notify customers before gutter clears and gutter cleaning visits. TextReminder sends access requests, day-before reminders and weather-delay messages for gutter cleaning businesses."
      h1="Customer notifications for gutter cleaning businesses"
      intro="Gutter cleaning customers often forget seasonal appointments and need to provide access. TextReminder automatically sends them a reminder before every visit — so you turn up to an open gate, not a locked one."
      emoji="🍂"
      tradeLabel="gutter cleaners"
      problems={[
        { title: "Customers forget seasonal appointments", desc: "Gutter clears are often once or twice a year. Customers frequently forget the appointment exists — until you turn up unannounced." },
        { title: "No one home to provide access", desc: "Many gutter clears require access to the rear of a property. If the customer isn't in or hasn't left a gate open, the visit fails." },
        { title: "Rescheduling is time-consuming", desc: "When weather prevents a gutter clear, contacting every affected customer individually takes significant time you don't have on a disrupted day." },
        { title: "Customers don't realise they're due", desc: "Unlike window cleaning, customers don't see gutter cleaning regularly. A heads-up message reminds them it's time and confirms the visit." },
        { title: "Wasted journeys", desc: "A failed visit to a locked property means a wasted journey, fuel costs, and a job that needs rebooking. Most are avoidable." },
        { title: "Manual follow-up after bad weather", desc: "Autumn and winter gutter cleaning seasons coincide with the worst weather. Rescheduling a full week's jobs means hours of individual messages." },
      ]}
      features={[
        { title: "Day-before appointment reminders", desc: "Customers receive an automatic reminder the evening before their gutter clear. They know you're coming and can arrange to be home or leave access." },
        { title: "Access request messages", desc: "Include a specific request for gate access or property entry in every reminder. Reduces failed visits and wasted journeys." },
        { title: "Seasonal appointment management", desc: "Add annual or bi-annual gutter clears to your schedule and TextReminder handles the customer communication automatically each time." },
        { title: "Weather-delay batch messaging", desc: "When bad weather forces postponements, select affected jobs and send a delay message to all those customers at once." },
        { title: "Works with your existing diary", desc: "Import customers from a spreadsheet, connect Google Calendar, or add jobs manually. No need to change your existing scheduling system." },
        { title: "Confirmation and rescheduling messages", desc: "Send new date confirmations to customers when jobs are moved, so they always know when to expect you next." },
      ]}
      faqs={[
        { q: "Can I use it for seasonal gutter clears as well as regular customers?", a: "Yes. TextReminder works for any scheduled job — whether it's an annual gutter clear, a one-off callout, or a regular maintenance contract. Each job gets its own reminder." },
        { q: "Can the message include an access request?", a: "Yes. You can customise the message template to ask customers to leave the gate open, be home, or provide any other access information you need." },
        { q: "What do I do when weather forces me to postpone a full day?", a: "Use the weather-delay tool. Select the affected jobs from your schedule, choose a delay message, and send it to all those customers in one step. You can update their job dates at the same time." },
        { q: "Do I need round-management software to use TextReminder?", a: "No. TextReminder works standalone. You can add customers and jobs manually, import via CSV, or connect Google Calendar. It handles the communication — you manage the schedule however you prefer." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
