import TradePage from '../../components/TradePage.jsx'

export default function WindowCleaners() {
  return (
    <TradePage
      trade="Window Cleaners"
      headline="Stop losing window cleaning jobs to no-shows"
      subhead="TextReminder sends your customers an automatic SMS, email or WhatsApp reminder 24 hours before every job. Set it up once and never chase a confirmation again."
      painPoints={[
        { icon:"😤", title:"Customers forget", desc:"You turn up ready to work and nobody's home. That's time, fuel, and income gone." },
        { icon:"📞", title:"Chasing confirmations", desc:"Spending 20 minutes every evening calling customers to confirm tomorrow's round." },
        { icon:"💸", title:"No-shows cost money", desc:"A single missed job on a round costs you the slot and the petrol. Over a week, that adds up fast." },
      ]}
      benefits={[
        { icon:"📱", title:"Automatic reminders", desc:"Customers get a text 24 hours before their window clean. No action needed from you." },
        { icon:"📅", title:"Works with your calendar", desc:"Connect Google Calendar, Apple Calendar or Outlook. TextReminder reads your schedule automatically." },
        { icon:"💬", title:"SMS, email or WhatsApp", desc:"Send via whichever channel your customers prefer. All three included in your plan." },
        { icon:"💷", title:"Save £25/month", desc:"Most reminder services charge £25–£50/month. TextReminder costs £20 — and does more." },
      ]}
      keywords="SMS reminder window cleaner, appointment reminder window cleaning, reduce no-shows window cleaning UK"
    />
  )
}
