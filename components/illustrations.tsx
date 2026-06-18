// Clean, original SVG illustrations — math/learning themed, brand-coloured.
// No external assets, no licensing concerns. Render crisply at any size.

export function HeroStudy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 380" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* soft blobs */}
      <ellipse cx="250" cy="330" rx="180" ry="26" fill="#1A60AB" opacity="0.06" />
      <circle cx="360" cy="90" r="60" fill="#EFAE56" opacity="0.16" />
      <circle cx="120" cy="70" r="34" fill="#1A60AB" opacity="0.10" />
      {/* desk */}
      <rect x="120" y="250" width="240" height="14" rx="7" fill="#1A60AB" opacity="0.85" />
      <rect x="135" y="264" width="10" height="70" rx="5" fill="#0F3A6B" />
      <rect x="335" y="264" width="10" height="70" rx="5" fill="#0F3A6B" />
      {/* laptop */}
      <rect x="170" y="200" width="120" height="78" rx="8" fill="#0F3A6B" />
      <rect x="180" y="210" width="100" height="58" rx="4" fill="#F6F6F3" />
      <path d="M195 250 L215 230 L235 248 L260 222" stroke="#EFAE56" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="195" cy="250" r="3.5" fill="#1A60AB" /><circle cx="235" cy="248" r="3.5" fill="#1A60AB" /><circle cx="260" cy="222" r="3.5" fill="#1A60AB" />
      {/* person */}
      <circle cx="300" cy="150" r="26" fill="#EFAE56" />
      <path d="M274 150 a26 26 0 0 1 52 0 z" fill="#0F3A6B" />
      <rect x="282" y="176" width="36" height="52" rx="16" fill="#1A60AB" />
      <rect x="300" y="186" width="44" height="14" rx="7" fill="#1A60AB" transform="rotate(28 300 186)" />
      {/* floating math symbols */}
      <text x="120" y="150" fontFamily="monospace" fontSize="26" fill="#1A60AB" opacity="0.5">∑</text>
      <text x="380" y="200" fontFamily="monospace" fontSize="22" fill="#EFAE56">π</text>
      <text x="95" y="220" fontFamily="monospace" fontSize="20" fill="#7BA3CA">√</text>
      <text x="395" y="280" fontFamily="monospace" fontSize="24" fill="#1A60AB" opacity="0.4">∫</text>
    </svg>
  );
}

export function AgencyAnalytics({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 340" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="220" cy="120" r="92" fill="#EFAE56" opacity="0.12" />
      {/* board */}
      <rect x="120" y="40" width="200" height="130" rx="12" fill="#fff" stroke="#D6E3E9" strokeWidth="2" />
      {/* bars */}
      <rect x="145" y="120" width="22" height="34" rx="4" fill="#7BA3CA" />
      <rect x="178" y="96" width="22" height="58" rx="4" fill="#1A60AB" />
      <rect x="211" y="78" width="22" height="76" rx="4" fill="#EFAE56" />
      <rect x="244" y="104" width="22" height="50" rx="4" fill="#1A60AB" opacity="0.6" />
      <circle cx="288" cy="70" r="14" fill="#EFAE56" />
      <path d="M283 70 l4 4 l7 -8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* desk + person */}
      <rect x="120" y="250" width="200" height="12" rx="6" fill="#1A60AB" opacity="0.85" />
      <circle cx="200" cy="210" r="22" fill="#EFAE56" />
      <rect x="184" y="230" width="32" height="30" rx="12" fill="#1A60AB" />
      <text x="96" y="120" fontFamily="monospace" fontSize="22" fill="#1A60AB" opacity="0.45">x²</text>
      <text x="340" y="150" fontFamily="monospace" fontSize="20" fill="#EFAE56">%</text>
    </svg>
  );
}

export function DotsScatter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {[[20,20,5],[44,14,3],[18,52,3],[70,28,4],[96,18,5],[60,60,3],[90,70,4],[30,90,4],[64,96,3],[100,100,5]].map(([x,y,r],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill={i%2?"#EFAE56":"#1A60AB"} opacity={i%2?0.7:0.3} />
      ))}
    </svg>
  );
}
