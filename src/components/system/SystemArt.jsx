export default function SystemArt({ kind }) {
  return (
    <svg
      className="system-tile-art-svg"
      viewBox="0 0 180 125"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`system-art-${kind}`} x2="0" y2="1">
          <stop stopColor="#fafafa" />
          <stop offset="1" stopColor="#aab1b5" />
        </linearGradient>
      </defs>
      <g fill={`url(#system-art-${kind})`} stroke="#939b9e" strokeWidth="3">
        {kind === "data" ? (
          <>
            <path d="M15 35h34l12 12h24v52H15z" />
            <path d="M18 52h67l-9 45H10z" />
            <rect x="99" y="48" width="25" height="45" rx="2" />
            <path d="M105 53h13v8h-13zM104 75h15v10h-15z" />
            <rect x="136" y="48" width="29" height="45" rx="2" />
            <path d="M142 61h18M142 69h18M142 77h18" />
          </>
        ) : kind === "channels" ? (
          <>
            <rect x="47" y="24" width="82" height="76" rx="5" />
            {Array.from({ length: 9 }, (_, i) => (
              <rect
                key={i}
                x={56 + (i % 3) * 22}
                y={35 + Math.floor(i / 3) * 20}
                width="17"
                height="14"
                rx="2"
              />
            ))}
          </>
        ) : (
          <>
            <path d="M20 35h43l12 13h27v52H20z" />
            <path d="M23 56h80l-14 41H12z" />
            <rect x="116" y="49" width="42" height="50" rx="4" />
            <path d="M124 61h26M124 69h26M124 77h26" />
          </>
        )}
      </g>
    </svg>
  );
}
