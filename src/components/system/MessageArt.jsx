// Structural recreations of the three Message Board choices, not font glyphs.
export default function MessageArt({ kind }) {
  return (
    <svg
      className="message-choice-art"
      viewBox="0 0 130 150"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`message-art-${kind.replaceAll(" ", "-")}`}
          x2="0"
          y2="1"
        >
          <stop stopColor="#fafcfb" />
          <stop offset="1" stopColor="#d1d9d8" />
        </linearGradient>
      </defs>
      {kind === "Letter" ? (
        <g stroke="#9eaaa8" strokeWidth="3" strokeLinejoin="round">
          <path d="M9 68 65 19l56 49v64H9z" fill="#c5c6b3" />
          <path d="M9 68h112v64H9z" fill="#fffcbb" />
          <path d="m9 68 56 36 56-36" fill="none" />
          <path d="M12 129 49 98m69 31L82 98" fill="none" />
        </g>
      ) : (
        <g stroke="#aab6b4" strokeWidth="3">
          <rect
            x="14"
            y={kind === "Memo" ? 38 : 14}
            width="102"
            height={kind === "Memo" ? 96 : 120}
            rx="5"
            fill={`url(#message-art-${kind.replaceAll(" ", "-")})`}
          />
          <rect
            x="21"
            y={kind === "Memo" ? 47 : 23}
            width="88"
            height={kind === "Memo" ? 77 : 101}
            rx="2"
            fill="#fff"
            stroke="#d4dddc"
          />
          {kind === "Memo" ? (
            <path d="M29 111h72M59 129h12" stroke="#d1d9d8" />
          ) : (
            <g stroke="#68c7d4" fill="none">
              <path d="M64 59c-23-25-32 13-10 11 16-2 11-22 28-17 18 5 6 26-4 18z" />
              <path d="M33 82h64m-46 8h27" strokeWidth="4" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
