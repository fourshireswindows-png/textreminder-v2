import fs from 'fs'
import path from 'path'

// Per-route meta — title + description for each page
const PAGES = [
  {
    route: '/pricing',
    title: 'Pricing — TextReminder | SMS Appointment Reminders UK',
    desc:  'Simple, transparent pricing for UK tradespeople. Free plan with 20 SMS/month. Paid plans from £15/month. No contracts, cancel any time.',
  },
  {
    route: '/blog',
    title: 'The Trades Blog — Tips & Guides for UK Tradespeople | TextReminder',
    desc:  'Guides, tips and insights for UK tradespeople on reducing no-shows, managing appointments, and growing your trade business.',
  },
  {
    route: '/compare',
    title: 'TextReminder vs Remindlo — Best SMS Reminder for UK Trades?',
    desc:  'Compare TextReminder with Remindlo. More features, lower price, built specifically for UK tradespeople. See how they stack up.',
  },
  {
    route: '/signup',
    title: 'Start Free — TextReminder | SMS Appointment Reminders UK',
    desc:  'Create your free TextReminder account. Automatic SMS appointment reminders for UK tradespeople. No credit card required.',
  },
  {
    route: '/login',
    title: 'Log In — TextReminder',
    desc:  'Log in to your TextReminder account to manage your SMS appointment reminders.',
  },
  {
    route: '/window-cleaners',
    title: 'SMS Reminders for Window Cleaners UK — Stop No-Shows | TextReminder',
    desc:  'Stop losing window cleaning jobs to no-shows. TextReminder sends automatic SMS reminders to your customers before every job. Free plan available.',
    keywords: 'SMS reminder window cleaner, appointment reminder window cleaning, reduce no-shows window cleaning UK',
  },
  {
    route: '/plumbers',
    title: 'SMS Appointment Reminders for Plumbers UK | TextReminder',
    desc:  'Fewer no-shows, more jobs completed. TextReminder sends automatic appointment reminders to your customers 24 hours before every job.',
    keywords: 'SMS reminder plumber UK, appointment reminder plumbing, plumber no-show reminder',
  },
  {
    route: '/electricians',
    title: 'Appointment Reminders for Electricians UK — Reduce No-Shows | TextReminder',
    desc:  'Automatic SMS, email and WhatsApp reminders for electricians. Works with your existing calendar. Cut no-shows and stop chasing confirmations.',
    keywords: 'SMS reminder electrician UK, appointment reminder electrical, electrician no-show',
  },
  {
    route: '/gardeners',
    title: 'Appointment Reminders for Gardeners UK — Cut No-Shows | TextReminder',
    desc:  'Send automatic reminders to customers 24 hours before every garden visit. Works with Google Calendar, Apple Calendar and Outlook.',
    keywords: 'SMS reminder gardener UK, appointment reminder gardening, landscaper no-show reminder',
  },
  {
    route: '/hairdressers',
    title: 'SMS Reminders for Hairdressers UK — Never Miss a Booking | TextReminder',
    desc:  'Automatic SMS, email and WhatsApp reminders for hairdressers and barbers. Stop clients forgetting appointments. Free plan available.',
    keywords: 'SMS reminder hairdresser UK, appointment reminder hair salon, mobile hairdresser no-show',
  },
]

const OUT_DIR = './dist'

// Read the base index.html built by Vite
const baseHtml = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8')

for (const page of PAGES) {
  // Swap in the page-specific title, description, and OG tags
  let html = baseHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(/(<meta name="title" content=")[^"]*(")/,   `$1${page.title}$2`)
    .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${page.desc}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/,  `$1${page.title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${page.desc}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/,  `$1${page.title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${page.desc}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/,  `$1https://textreminder.co.uk${page.route}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/,  `$1https://textreminder.co.uk${page.route}$2`)

  if (page.keywords) {
    html = html.replace(/(<meta name="keywords" content=")[^"]*(")/,  `$1${page.keywords}$2`)
  }

  const dir = path.join(OUT_DIR, page.route.slice(1))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
  console.log(`  ✅ ${page.route}`)
}

console.log('✅ Pre-render complete — HTML stubs written for all routes.')

// Copy built app.js from dist/ to root so GitHub Pages serves the latest build
fs.copyFileSync('./dist/app.js', './app.js')
console.log('✅ app.js copied to root.')
