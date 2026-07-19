export default function BusinessBotLogo({ className = '', size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
      <path
        d="M14 32V20C14 16.686 16.686 14 20 14H28C31.314 14 34 16.686 34 20V22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="16" y="24" width="16" height="12" rx="3" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" />
      <path d="M20 29L23 32L28 27" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="14" r="4" fill="#22C55E" />
      <circle cx="36" cy="14" r="2" fill="white" />
    </svg>
  )
}
