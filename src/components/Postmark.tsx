interface Props {
  city: string;
  date: string;
}

export default function Postmark({ city, date }: Props) {
  // Truncate city if too long
  const cityLine = city.length > 22 ? city.slice(0, 22) + "…" : city;

  return (
    <svg
      viewBox="0 0 180 80"
      className="w-44 opacity-60"
      aria-label={`Postmarked ${city}, ${date}`}
    >
      {/* Outer circle */}
      <circle cx="62" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner circle */}
      <circle cx="62" cy="40" r="29" fill="none" stroke="currentColor" strokeWidth="0.75" />

      {/* Top arc text — DISPATCHED */}
      <path id="top-arc" d="M 32,28 A 30,30 0 0,1 92,28" fill="none" />
      <text fontSize="6.5" letterSpacing="2" fill="currentColor" textAnchor="middle">
        <textPath href="#top-arc" startOffset="50%">DISPATCHED</textPath>
      </text>

      {/* Date in center */}
      <text
        x="62"
        y="43"
        textAnchor="middle"
        fontSize="7.5"
        letterSpacing="1"
        fill="currentColor"
        fontFamily="var(--font-mono)"
      >
        {date}
      </text>

      {/* Bottom arc text — city */}
      <path id="bottom-arc" d="M 32,52 A 30,30 0 0,0 92,52" fill="none" />
      <text fontSize="6" letterSpacing="1.5" fill="currentColor" textAnchor="middle">
        <textPath href="#bottom-arc" startOffset="50%">{cityLine.toUpperCase()}</textPath>
      </text>

      {/* Cancellation lines */}
      <line x1="104" y1="20" x2="178" y2="20" stroke="currentColor" strokeWidth="1.2" />
      <line x1="104" y1="29" x2="178" y2="29" stroke="currentColor" strokeWidth="1.2" />
      <line x1="104" y1="38" x2="178" y2="38" stroke="currentColor" strokeWidth="1.2" />
      <line x1="104" y1="47" x2="178" y2="47" stroke="currentColor" strokeWidth="1.2" />
      <line x1="104" y1="56" x2="178" y2="56" stroke="currentColor" strokeWidth="1.2" />
      <line x1="104" y1="65" x2="178" y2="65" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
