import React from 'react';

/**
 * Premium, lightweight central weather illustrations (Pure SVG & CSS).
 * No Three.js, WebGL, or heavy libraries. Fully responsive and GPU accelerated.
 */

export function SunVisual({ size = 200 }) {
  return (
    <div className="central-visual-wrapper sun-visual" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="central-weather-svg"
        aria-label="Sun and clear sky illustration"
      >
        <defs>
          {/* Radial gradient for central sun disk */}
          <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#FBBF24" />
            <stop offset="85%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Golden atmospheric halo */}
          <radialGradient id="sunHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.45)" />
            <stop offset="60%" stopColor="rgba(245, 158, 11, 0.18)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0)" />
          </radialGradient>

          {/* Soft outer aura */}
          <filter id="sunGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient atmospheric glow ring */}
        <circle cx="100" cy="100" r="92" fill="url(#sunHalo)" className="sun-halo-pulse" />

        {/* Golden Radiating Rays (Geometric & Modern) */}
        <g className="sun-rays-spin">
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 100 100)`}>
              <line
                x1="100"
                y1="22"
                x2="100"
                y2="38"
                stroke="#FBBF24"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.85"
              />
              <circle cx="100" cy="14" r="2.5" fill="#FEF08A" opacity="0.9" />
            </g>
          ))}
        </g>

        {/* Inner glow disc */}
        <circle cx="100" cy="100" r="58" fill="url(#sunHalo)" opacity="0.6" />

        {/* Central Sun Core */}
        <circle
          cx="100"
          cy="100"
          r="48"
          fill="url(#sunCore)"
          filter="url(#sunGlow)"
          className="sun-core-pulse"
        />

        {/* Subtle specular glint */}
        <ellipse cx="85" cy="85" rx="16" ry="10" transform="rotate(-30 85 85)" fill="rgba(255, 255, 255, 0.35)" />
      </svg>
    </div>
  );
}

export function CloudVisual({ size = 200 }) {
  return (
    <div className="central-visual-wrapper cloud-visual" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="central-weather-svg"
        aria-label="Normal cloud illustration"
      >
        <defs>
          <linearGradient id="cloudGradMain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id="cloudGradBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
          <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(15, 23, 42, 0.35)" />
          </filter>
        </defs>

        {/* Background secondary cloud */}
        <g className="cloud-drift-back" opacity="0.75" transform="translate(18, -12) scale(0.85)">
          <path
            d="M 50 120 
               A 22 22 0 0 1 70 95 
               A 32 32 0 0 1 125 90 
               A 25 25 0 0 1 155 120 
               Z"
            fill="url(#cloudGradBack)"
          />
        </g>

        {/* Primary foreground cloud */}
        <g className="cloud-float-main" filter="url(#cloudShadow)">
          <path
            d="M 45 135
               C 32 135, 25 124, 25 112
               C 25 98, 38 88, 52 90
               C 58 72, 78 60, 102 60
               C 126 60, 146 74, 150 94
               C 165 95, 175 106, 175 120
               C 175 132, 164 135, 150 135
               Z"
            fill="url(#cloudGradMain)"
          />
          {/* Subtle rim highlight */}
          <path
            d="M 55 90
               C 62 75, 79 65, 102 65
               C 123 65, 140 76, 145 92"
            fill="none"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function DarkCloudVisual({ size = 200 }) {
  return (
    <div className="central-visual-wrapper dark-cloud-visual" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="central-weather-svg"
        aria-label="Dark atmospheric cloud illustration"
      >
        <defs>
          <linearGradient id="darkCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="45%" stopColor="#334155" />
            <stop offset="85%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="deepAtmosphere" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </linearGradient>
          <filter id="darkGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="rgba(0, 0, 0, 0.6)" />
          </filter>
        </defs>

        {/* Ambient atmospheric backdrop */}
        <circle cx="100" cy="105" r="75" fill="url(#deepAtmosphere)" />

        {/* Dark brooding cloud formation */}
        <g className="dark-cloud-pulse" filter="url(#darkGlow)">
          <path
            d="M 40 135
               C 26 135, 18 122, 20 108
               C 22 94, 35 84, 50 86
               C 56 66, 78 52, 102 52
               C 128 52, 150 68, 154 90
               C 170 92, 182 104, 180 120
               C 178 134, 164 135, 150 135
               Z"
            fill="url(#darkCloudGrad)"
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="1.5"
          />
          {/* Moody Silver-lining rim highlight */}
          <path
            d="M 52 86
               C 58 69, 78 55, 102 55
               C 125 55, 145 69, 149 88"
            fill="none"
            stroke="rgba(203, 213, 225, 0.45)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}

export function RainCloudVisual({ size = 200 }) {
  return (
    <div className="central-visual-wrapper rain-cloud-visual" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="central-weather-svg"
        aria-label="Cloud with rain illustration"
      >
        <defs>
          <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>
          <linearGradient id="rainDropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <filter id="rainCloudShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(0, 0, 0, 0.5)" />
          </filter>
        </defs>

        {/* Rain Cloud Body */}
        <g filter="url(#rainCloudShadow)">
          <path
            d="M 45 110
               C 32 110, 24 100, 26 88
               C 28 76, 40 68, 54 70
               C 60 52, 79 40, 102 40
               C 125 40, 144 54, 148 72
               C 162 74, 174 84, 172 98
               C 170 110, 158 110, 146 110
               Z"
            fill="url(#rainCloudGrad)"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="1.2"
          />
        </g>

        {/* Animated Rain Drops falling naturally */}
        <g className="rain-streaks-group">
          <line x1="55" y1="122" x2="48" y2="148" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-1" />
          <line x1="75" y1="124" x2="68" y2="152" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-2" />
          <line x1="98" y1="120" x2="91" y2="156" stroke="url(#rainDropGrad)" strokeWidth="3" strokeLinecap="round" className="raindrop drop-3" />
          <line x1="120" y1="124" x2="113" y2="152" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-4" />
          <line x1="142" y1="122" x2="135" y2="148" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-5" />
          
          {/* Secondary staggered row */}
          <line x1="66" y1="146" x2="60" y2="170" stroke="url(#rainDropGrad)" strokeWidth="2" strokeLinecap="round" className="raindrop drop-6" />
          <line x1="88" y1="150" x2="82" y2="176" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-7" />
          <line x1="110" y1="148" x2="104" y2="174" stroke="url(#rainDropGrad)" strokeWidth="2.5" strokeLinecap="round" className="raindrop drop-8" />
          <line x1="130" y1="146" x2="124" y2="170" stroke="url(#rainDropGrad)" strokeWidth="2" strokeLinecap="round" className="raindrop drop-9" />
        </g>
      </svg>
    </div>
  );
}

export function LightningCloudVisual({ size = 200 }) {
  return (
    <div className="central-visual-wrapper lightning-cloud-visual" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="central-weather-svg"
        aria-label="Thunder and lightning cloud illustration"
      >
        <defs>
          <linearGradient id="thunderCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="45%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#050814" />
          </linearGradient>
          <linearGradient id="lightningBoltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <filter id="lightningGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient storm aura */}
        <ellipse cx="100" cy="115" rx="70" ry="45" fill="rgba(168, 85, 247, 0.18)" className="storm-flash-aura" />

        {/* Thunderstorm Cloud Body */}
        <g className="storm-cloud-rumble">
          <path
            d="M 45 105
               C 32 105, 24 95, 26 83
               C 28 71, 40 63, 54 65
               C 60 47, 79 35, 102 35
               C 125 35, 144 49, 148 67
               C 162 69, 174 79, 172 93
               C 170 105, 158 105, 146 105
               Z"
            fill="url(#thunderCloudGrad)"
            stroke="rgba(168, 85, 247, 0.4)"
            strokeWidth="1.5"
          />
          <path
            d="M 54 65
               C 60 49, 79 38, 102 38
               C 123 38, 140 50, 145 66"
            fill="none"
            stroke="rgba(192, 132, 252, 0.5)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Electric Lightning Bolt */}
        <g className="lightning-bolt-anim" filter="url(#lightningGlow)">
          <polygon
            points="104,82 86,122 101,122 90,165 122,112 105,112 118,82"
            fill="url(#lightningBoltGrad)"
            stroke="#FEF08A"
            strokeWidth="0.8"
          />
        </g>
      </svg>
    </div>
  );
}
