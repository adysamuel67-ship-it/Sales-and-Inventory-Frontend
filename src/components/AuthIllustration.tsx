export default function AuthIllustration({ variant = 'signup' }: { variant?: 'signup' | 'login' | 'verify' }) {
  if (variant === 'verify') {
    return (
      <div className="relative w-full max-w-[220px] lg:max-w-[260px] mx-auto">
        <svg viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Background glow */}
          <circle cx="130" cy="150" r="110" fill="white" fillOpacity="0.06" />
          <circle cx="130" cy="150" r="80" fill="white" fillOpacity="0.06" />

          {/* Envelope */}
          <rect x="60" y="110" width="140" height="100" rx="12" fill="white" fillOpacity="0.95" />
          <rect x="60" y="110" width="140" height="100" rx="12" stroke="white" strokeWidth="2" strokeOpacity="0.3" fill="none" />
          <path d="M60 122L130 165L200 122" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Lock on envelope */}
          <circle cx="130" cy="195" r="12" fill="#2563EB" />
          <rect x="122" y="195" width="16" height="12" rx="3" fill="white" />
          <path d="M126 195V191C126 188.8 127.8 187 130 187C132.2 187 134 188.8 134 191V195" stroke="white" strokeWidth="2" fill="none" />

          {/* Checkmark badge - large */}
          <circle cx="190" cy="100" r="24" fill="#16A34A" className="auth-animate-pulse-ring" />
          <circle cx="190" cy="100" r="19" fill="white" />
          <path d="M181 100L187 106L201 92" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* OTP dots */}
          <g>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={i}
                x={75 + i * 18}
                y={235}
                width="14"
                height="18"
                rx="4"
                fill="white"
                fillOpacity="0.95"
              />
            ))}
            <text x="82" y="250" fontSize="10" fontWeight="700" fill="#2563EB">4</text>
            <text x="100" y="250" fontSize="10" fontWeight="700" fill="#2563EB">7</text>
            <text x="118" y="250" fontSize="10" fontWeight="700" fill="#2563EB">*</text>
            <text x="136" y="250" fontSize="10" fontWeight="700" fill="#2563EB">*</text>
            <text x="154" y="250" fontSize="10" fontWeight="700" fill="#2563EB">*</text>
            <text x="172" y="250" fontSize="10" fontWeight="700" fill="#2563EB">*</text>
          </g>

          {/* Floating dots */}
          <circle cx="40" cy="80" r="3" fill="#2563EB" fillOpacity="0.4" className="auth-animate-shimmer" />
          <circle cx="230" cy="200" r="2.5" fill="#16A34A" fillOpacity="0.4" className="auth-animate-shimmer" style={{ animationDelay: '0.5s' }} />
          <circle cx="50" cy="250" r="2" fill="#D97706" fillOpacity="0.3" className="auth-animate-shimmer" style={{ animationDelay: '1s' }} />
        </svg>
      </div>
    )
  }

  if (variant === 'login') {
    return (
      <div className="relative w-full max-w-[220px] lg:max-w-[280px] mx-auto">
        <svg viewBox="0 0 300 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Background circles */}
          <circle cx="150" cy="170" r="120" fill="white" fillOpacity="0.08" />
          <circle cx="150" cy="170" r="90" fill="white" fillOpacity="0.08" />

          {/* Laptop */}
          <rect x="60" y="160" width="180" height="110" rx="8" fill="#E2E8F0" />
          <rect x="65" y="165" width="170" height="95" rx="4" fill="#1E293B" />
          <rect x="70" y="170" width="160" height="85" rx="2" fill="#334155" />
          <rect x="40" y="270" width="220" height="8" rx="4" fill="#CBD5E1" />

          {/* Screen content - dashboard mockup */}
          <rect x="78" y="178" width="55" height="28" rx="3" fill="#2563EB" fillOpacity="0.3" />
          <rect x="140" y="178" width="35" height="28" rx="3" fill="#16A34A" fillOpacity="0.3" />
          <rect x="182" y="178" width="35" height="28" rx="3" fill="#D97706" fillOpacity="0.3" />
          <rect x="78" y="212" width="80" height="8" rx="2" fill="white" fillOpacity="0.15" />
          <rect x="165" y="212" width="50" height="8" rx="2" fill="white" fillOpacity="0.15" />
          <rect x="78" y="226" width="137" height="4" rx="2" fill="white" fillOpacity="0.1" />
          <rect x="78" y="234" width="110" height="4" rx="2" fill="white" fillOpacity="0.1" />
          <rect x="78" y="242" width="90" height="4" rx="2" fill="white" fillOpacity="0.1" />

          {/* Floating card - right */}
          <g className="auth-animate-float-slow">
            <rect x="200" y="120" width="60" height="40" rx="8" fill="white" fillOpacity="0.95" />
            <circle cx="215" cy="135" r="5" fill="#2563EB" />
            <rect x="225" y="132" width="28" height="3" rx="1.5" fill="#CBD5E1" />
            <rect x="225" y="138" width="20" height="3" rx="1.5" fill="#E2E8F0" />
            <rect x="208" y="148" width="44" height="4" rx="2" fill="#DCFCE7" />
            <rect x="213" y="148" width="18" height="4" rx="2" fill="#16A34A" />
          </g>

          {/* Floating card - left */}
          <g className="auth-animate-float" style={{ animationDelay: '1s' }}>
            <rect x="30" y="100" width="55" height="35" rx="8" fill="white" fillOpacity="0.95" />
            <rect x="38" y="110" width="25" height="3" rx="1.5" fill="#2563EB" />
            <rect x="38" y="117" width="38" height="3" rx="1.5" fill="#E2E8F0" />
            <rect x="38" y="124" width="30" height="3" rx="1.5" fill="#E2E8F0" />
          </g>

          {/* Checkmark badge */}
          <circle cx="150" cy="100" r="22" fill="#2563EB" />
          <circle cx="150" cy="100" r="18" fill="white" />
          <path d="M141 100L147 106L161 92" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Floating dots */}
          <circle cx="280" cy="200" r="3" fill="#2563EB" fillOpacity="0.4" className="auth-animate-shimmer" />
          <circle cx="30" cy="180" r="2.5" fill="#16A34A" fillOpacity="0.3" className="auth-animate-shimmer" style={{ animationDelay: '0.7s' }} />
        </svg>
      </div>
    )
  }

  // Signup illustration — woman with phone
  return (
    <div className="relative w-full max-w-[220px] lg:max-w-[320px] mx-auto">
      <svg viewBox="0 0 360 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {/* Background glow */}
        <circle cx="180" cy="200" r="150" fill="white" fillOpacity="0.06" />
        <circle cx="180" cy="200" r="110" fill="white" fillOpacity="0.06" />

        {/* Woman - simplified modern illustration */}
        {/* Hair */}
        <ellipse cx="180" cy="130" rx="42" ry="48" fill="#1E293B" />
        <path d="M138 130C138 106 156 88 180 88C204 88 222 106 222 130C222 130 224 115 220 100C216 85 200 78 180 78C160 78 144 85 140 100C136 115 138 130 138 130Z" fill="#0F172A" />

        {/* Face */}
        <ellipse cx="180" cy="145" rx="30" ry="34" fill="#F5D0A9" />

        {/* Eyes */}
        <ellipse cx="168" cy="140" rx="3.5" ry="4" fill="#1E293B" />
        <ellipse cx="192" cy="140" rx="3.5" ry="4" fill="#1E293B" />
        <circle cx="169" cy="139" r="1.2" fill="white" />
        <circle cx="193" cy="139" r="1.2" fill="white" />

        {/* Smile */}
        <path d="M170 154C173 158 177 160 180 160C183 160 187 158 190 154" stroke="#C2956B" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Eyebrows */}
        <path d="M162 132C164 130 167 129 170 130" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M190 130C193 129 196 130 198 132" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* Body / Top */}
        <path d="M150 175C150 170 160 165 180 165C200 165 210 170 210 175V230C210 235 200 240 180 240C160 240 150 235 150 230V175Z" fill="#2563EB" />

        {/* Neck */}
        <rect x="170" y="165" width="20" height="12" rx="4" fill="#F5D0A9" />

        {/* Arms */}
        <path d="M150 185C140 190 130 200 125 215L130 218C135 205 142 196 150 192" fill="#F5D0A9" stroke="#F5D0A9" strokeWidth="2" strokeLinecap="round" />
        <path d="M210 185C220 190 225 200 228 210L235 207C230 195 222 188 210 185" fill="#F5D0A9" stroke="#F5D0A9" strokeWidth="2" strokeLinecap="round" />

        {/* Phone in hand */}
        <rect x="112" y="195" width="30" height="50" rx="6" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
        <rect x="115" y="200" width="24" height="38" rx="3" fill="#3B82F6" fillOpacity="0.3" />
        {/* Phone screen content */}
        <rect x="118" y="204" width="18" height="3" rx="1" fill="white" fillOpacity="0.6" />
        <rect x="118" y="210" width="14" height="3" rx="1" fill="white" fillOpacity="0.4" />
        <rect x="118" y="218" width="18" height="10" rx="2" fill="#16A34A" fillOpacity="0.5" />
        <rect x="118" y="232" width="18" height="3" rx="1" fill="white" fillOpacity="0.3" />
        <circle cx="127" cy="241" r="2" fill="#22C55E" />

        {/* Lower body / skirt */}
        <path d="M155 240C155 240 160 280 155 310L205 310C200 280 205 240 205 240" fill="#1E293B" />

        {/* Floating card - sales (animated) */}
        <g className="auth-animate-float">
          <rect x="230" y="100" width="85" height="55" rx="10" fill="white" fillOpacity="0.95" />
          <text x="242" y="118" fontSize="8" fontWeight="600" fill="#475569">Sales Today</text>
          <text x="242" y="133" fontSize="14" fontWeight="700" fill="#1E293B">GHS 2,450</text>
          <rect x="242" y="140" width="30" height="4" rx="2" fill="#DCFCE7" />
          <rect x="242" y="140" width="18" height="4" rx="2" fill="#16A34A" />
          <text x="276" y="143" fontSize="6" fill="#16A34A">+12%</text>
        </g>

        {/* Floating card - stock (animated) */}
        <g className="auth-animate-float-slow" style={{ animationDelay: '1.5s' }}>
          <rect x="25" y="150" width="80" height="45" rx="10" fill="white" fillOpacity="0.95" />
          <circle cx="42" cy="168" r="8" fill="#DCFCE7" />
          <path d="M38 168L41 171L47 165" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="55" y="166" fontSize="7" fontWeight="600" fill="#475569">Stock OK</text>
          <text x="55" y="176" fontSize="6" fill="#94A3B8">12 items left</text>
        </g>

        {/* Floating card - rating (animated) */}
        <g className="auth-animate-float" style={{ animationDelay: '0.8s' }}>
          <rect x="40" y="75" width="75" height="40" rx="10" fill="white" fillOpacity="0.95" />
          <text x="52" y="93" fontSize="7" fontWeight="600" fill="#475569">Rating</text>
          <text x="52" y="106" fontSize="9" fill="#D97706">★★★★★</text>
        </g>

        {/* Floating dots with shimmer */}
        <circle cx="280" cy="180" r="3" fill="#2563EB" fillOpacity="0.4" className="auth-animate-shimmer" />
        <circle cx="60" cy="250" r="4" fill="#22C55E" fillOpacity="0.3" className="auth-animate-shimmer" style={{ animationDelay: '0.5s' }} />
        <circle cx="300" cy="230" r="2.5" fill="#D97706" fillOpacity="0.3" className="auth-animate-shimmer" style={{ animationDelay: '1s' }} />
        <circle cx="100" cy="90" r="2" fill="#3B82F6" fillOpacity="0.4" className="auth-animate-shimmer" style={{ animationDelay: '1.5s' }} />
      </svg>
    </div>
  )
}
