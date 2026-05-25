export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
      </defs>
      <path d="M15 18 C15 12 19 8 25 8 L75 8 C81 8 85 12 85 18 L85 55 C85 61 81 65 75 65 L55 65 L45 78 L45 65 L25 65 C19 65 15 61 15 55 Z"
        stroke="url(#bubbleGrad)" strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="30" y1="30" x2="65" y2="30" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <line x1="30" y1="42" x2="70" y2="42" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <line x1="30" y1="54" x2="58" y2="54" stroke="#1a1a2e" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="78" cy="18" r="16" fill="#22c55e"/>
      <path d="M70 18 L75 23 L86 12" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}
