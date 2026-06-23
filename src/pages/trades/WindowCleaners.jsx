import TradePage from './_TradePage.jsx'

const SEO_LINKS = [
  { to: '/gutter-cleaners', label: 'Gutter cleaners' },
  { to: '/pressure-washing', label: 'Pressure washing' },
  { to: '/roof-cleaning', label: 'Roof cleaning' },
  { to: '/solar-panel-cleaning', label: 'Solar panel cleaning' },
]

export default function WindowCleaners({ onSignup }) {
  return (
    <TradePage
      onSignup={onSignup}
      title="Text Reminders for Window Cleaners | TextReminder"
      metaDesc="Stop spending your evenings texting tomorrow's window cleaning customers. TextReminder automatically sends job reminders, access requests and weather-delay notices for window cleaners."
      h1="The simple way for window cleaners to keep customers informed"
      intro="TextReminder automatically sends your customers a message before their window clean — reminding them you're coming, asking them to leave the side gate open, and notifying them about weather delays. No more evening texting sessions."
      emoji="🪟"
      tradeLabel="window cleaners"
      problems={[
        { title: "Customers forget you're coming", desc: "They go out, leave the gate locked, or ring to cancel because no one told them their windows were due. A single automated message the night before prevents it." },
        { title: "Access issues cost you jobs", desc: "Side gates are locked, dogs are in the garden, or the customer needs to move a car. A reminder with an access request solves this without any manual effort." },
        { title: "Weather delays mean dozens of messages", desc: "When a rainy week pushes your round, you need to contact every customer. TextReminder's weather-delay tool lets you do it in seconds, not an hour." },
        { title: "Irregular customers forget their schedule", desc: "Customers on 4, 6 or 8-week cycles often lose track of when they're due. An automated message keeps them expecting you." },
        { title: "Evenings spent messaging", desc: "Many window cleaners spend 30-45 minutes every evening manually texting tomorrow's customers. That time belongs to you, not your round." },
        { title: "Customers call asking where you are", desc: "Customers who aren't kept informed ring or message asking for updates. Automated messages reduce this significantly." },
      ]}
      features={[
        { title: "Evening-before reminders", desc: "Send customers an automatic message the night before their clean. They know you're coming, access is sorted, and you don't have to text anyone." },
        { title: "Access requests built in", desc: "Include a line asking customers to leave gates unlocked, keep pets inside, or move a vehicle. Goes out automatically with every reminder." },
        { title: "Works with your existing round", desc: "Connect Google Calendar, import a spreadsheet, or add jobs manually. Works alongside Cleaner Planner, Squeegee, your paper diary or any other system." },
        { title: "Weather-delay tool", desc: "Select today's affected jobs, choose your delay message, send to all customers at once. Takes 30 seconds instead of 30 minutes." },
        { title: "Recurring schedule support", desc: "Set up regular customers once. TextReminder automatically sends their reminder before each visit, on any cycle." },
        { title: "Full message delivery log", desc: "See every message sent, delivered or failed. Know exactly which customers have been notified before every working day." },
      ]}
      faqs={[
        { q: "Does it work alongside Cleaner Planner or Squeegee?", a: "Yes. TextReminder is not round-management software. It sits alongside whatever system you already use — you import customers via CSV, connect Google Calendar, or add jobs manually." },
        { q: "Can I ask customers to leave the gate open in the message?", a: "Yes. Every message template is fully editable. Add a line requesting side-gate access, pets inside, or cars moved — it goes out automatically with every reminder." },
        { q: "What happens when it rains and I need to postpone?", a: "Use the weather-delay tool. Select the affected jobs, pick your delay message, and send to all those customers at once. You can also move their job date at the same time." },
        { q: "Do I need to replace my existing diary?", a: "No. TextReminder is a communication tool, not a round-management replacement. It sends the messages. Your existing system manages the round." },
      ]}
      seoLinks={SEO_LINKS}
    />
  )
}
