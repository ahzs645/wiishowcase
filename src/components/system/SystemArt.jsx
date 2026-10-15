// Measured silhouettes for Settings tiles; original pane textures are unavailable.
export default function SystemArt({ kind }) {
  const console = (x = 14) => (
    <g>
      <path d={`M${x} 26l44-11v83l-44 9z`} fill="#d5d9da" />
      <path d={`M${x + 44} 15l10 5v79l-10-1z`} fill="#a9afb1" />
      <path d={`M${x + 8} 36l28-6v3l-28 6z`} fill="#8e999f" />
      <path d={`M${x + 9} 94l18-4`} stroke="#8e999f" strokeWidth="2" />
      <circle cx={x + 34} cy="91" r="2" fill="#98aab3" />
    </g>
  );
  const sd = (x = 84) => (
    <g>
      <path d={`M${x} 53l8-8h22v46h-30z`} />
      <rect x={x + 5} y="61" width="20" height="18" fill="#e9eaea" />
      <path d={`M${x + 5} 49v7m6-7v7m6-7v7`} strokeWidth="2" />
    </g>
  );
  const card = (x = 125) => (
    <g>
      <rect x={x} y="42" width="32" height="48" rx="2" />
      <rect x={x + 4} y="47" width="24" height="14" fill="#e4e6e6" />
      <path d={`M${x + 5} 68h22m-22 7h22m-22 7h22`} strokeWidth="2" />
    </g>
  );
  return (
    <svg
      className="system-tile-art-svg"
      viewBox="0 0 180 125"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`system-art-${kind}`} x2="0" y2="1">
          <stop stopColor="#f4f5f5" />
          <stop offset="1" stopColor="#b8bfc1" />
        </linearGradient>
      </defs>
      <g
        fill={`url(#system-art-${kind})`}
        stroke="#939b9e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        {kind === "channels" ? (
          <>
            <rect x="49" y="22" width="75" height="75" rx="5" />
            <rect x="58" y="30" width="75" height="75" rx="5" />
            <rect x="68" y="40" width="76" height="69" rx="5" />
            <text
              x="105"
              y="83"
              fontFamily="var(--system-font-family)"
              fontSize="29"
              textAnchor="middle"
              fill="#9da7ab"
              stroke="none"
            >
              Wii
            </text>
          </>
        ) : kind === "gamecube" ? (
          <g transform="translate(-34,-8) scale(1.35)">{card(86)}</g>
        ) : kind === "wii" ? (
          <>
            {console(44)}
            {sd(113)}
          </>
        ) : (
          <>
            {console()}
            {sd()}
            {card()}
          </>
        )}
      </g>
    </svg>
  );
}
