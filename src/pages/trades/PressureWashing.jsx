import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/window-cleaners', label: 'Window cleaners' },
  { to: '/gutter-cleaners', label: 'Gutter cleaners' },
  { to: '/roof-cleaning', label: 'Roof cleaning' },
  { to: '/solar-panel-cleaning', label: 'Solar panel cleaning' },
]

export default function PressureWashing({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Customer Communication for Pressure Washing Businesses | TextReminder"
      metaDesc="Automatically notify customers before driveway cleaning, patio washing and pressure washing jobs. TextReminder handles access requests, day-before reminders and weather rescheduling."
      h1="Customer communication for pressure washing and driveway cleaning businesses"
      intro="Pressure washing jobs often require clear access, pre-treatment preparation, and specific weather conditions. TextReminder automatically sends customers everything they need to know before you arrive — so every job runs smoothly."
      emoji="💦"
      tradeLabel="pressure washing businesses"
      problems={[
        { title: "Customers haven't cleared the driveway", desc: "You arrive to find cars parked, bins blocking the area, or garden furniture in the way. A heads-up message telling them to prepare avoids the issue entirely." },
        { title: "Weather cancellations require mass messaging", desc: "Pressure washing is weather-dependent. When conditions aren't right, contacting every customer individually takes the time you could spend rescheduling or moving to covered work." },
        { title: "One-off customers don't know what to expect", desc: "Many pressure washing jobs are one-offs. Customers appreciate a professional message telling them what to prepare, when you'll arrive, and how long the job takes." },
        { title: "Access issues prevent work starting", desc: "Side gates, outbuildings, and back gardens need to be accessible. A reminder with clear access instructions prevents delays on the day." },
        { title: "Customers book then forget", desc: "Driveway and patio cleans are often booked weeks in advance. Without a reminder, customers sometimes forget entirely — especially for one-off seasonal jobs." },
        { title: "Rescheduling back-to-back jobs is complex", desc: "A full day of pressure washing jobs pushed by rain means a chain of customers to contact. TextReminder handles the messaging while you focus on rescheduling." },
      ]}
      features={[
        { title: "Pre-job preparation messages", desc: "Tell customers to clear the driveway, move vehicles, or prepare access before you arrive. Sent automatically the evening before every job." },
        { title: "Access and preparation requests", desc: "Include specific instructions for each job type — driveway clears, patio prep, outbuilding access — in your message templates." },
        { title: "Weather-delay batch notifications", desc: "When conditions aren't suitable, select affected jobs and send a delay message to all those customers at once. Seconds, not an hour." },
        { title: "One-off and repeat job support", desc: "Pressure washing jobs can be one-off seasonal cleans or regular maintenance contracts. TextReminder handles both." },
        { title: "Rescheduling confirmation messages", desc: "When you move a job, send the customer an automatic confirmation of their new date. No confusion, no missed communications." },
        { title: "Works with your existing schedule", desc: "Connect Google Calendar, import from a spreadsheet, or add jobs manually. TextReminder fits around how you already work." },
      ]}
      faqs={[
        { q: "Can I include preparation instructions in the message?", a: "Yes. You can edit the message template to tell customers exactly what to prepare before you arrive — clearing the driveway, moving cars, unlocking gates, or anything else relevant to the job." },
        { q: "How does the weather-delay tool work?", a: "When you need to postpone jobs due to weather, open the weather-delay tool, select the affected jobs from your schedule, choose or write a delay message, and send it to all those customers at once. You can also update their job dates." },
        { q: "Does it work for one-off pressure washing jobs?", a: "Yes. One-off jobs work exactly the same as recurring ones. Add the job, set the reminder timing, and the customer receives their message automatically before the visit." },
        { q: "Can I use it alongside my existing booking system?", a: "Yes. TextReminder is a communication tool, not a job-management replacement. It sends the messages — your existing system manages your bookings and schedule." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
