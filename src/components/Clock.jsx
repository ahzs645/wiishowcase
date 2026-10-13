import { useState, useEffect } from "react";
import { useSystemSetting } from "../lib/systemState";
import { formatMenuTime } from "../lib/menuClock";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SEGMENTS = {
  a: "M4 0h14l3 2.5-3 2.5H4L1 2.5Z",
  b: "M20 4 22 7v7l-2 3-2-3V7Z",
  c: "M20 20 22 23v7l-2 3-2-3v-7Z",
  d: "M4 31h14l3 2.5-3 2.5H4l-3-2.5Z",
  e: "M2 20 4 23v7l-2 3L0 30v-7Z",
  f: "M2 4 4 7v7l-2 3L0 14V7Z",
  g: "M4 15.5h14l3 2.5-3 2.5H4L1 18Z",
};
const DIGITS = [
  "abcdef",
  "bc",
  "abged",
  "abgcd",
  "fgbc",
  "afgcd",
  "afgecd",
  "abc",
  "abcdefg",
  "abfgcd",
];
function ClockDigits({ time }) {
  let x = 0;
  const width = [...time].reduce(
    (sum, character) => sum + (character === ":" ? 16 : 28),
    -4,
  );
  return (
    <svg
      className="menu-clock-digits"
      viewBox={`0 0 ${width} 36`}
      style={{ "--clock-width": width }}
      aria-hidden="true"
    >
      {[...time].map((character, index) => {
        const left = x;
        x += character === ":" ? 16 : 28;
        return (
          <g key={index} transform={`translate(${left},0)`}>
            {character === ":" ? (
              <>
                <circle cx="6.5" cy="10" r="2.5" />
                <circle cx="6.5" cy="26" r="2.5" />
              </>
            ) : character === "1" ? (
              <path d="M11 0 13 3v11l-2 3-2-3V3ZM11 19 13 22v11l-2 3-2-3V22Z" />
            ) : (
              [...DIGITS[Number(character)]].map((segment) => (
                <path key={segment} d={SEGMENTS[segment]} />
              ))
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function formatMenuDate(date, country = "United States") {
  const dayName = DAYS[date.getDay()];
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return country === "United States"
    ? `${dayName} ${month}/${day}`
    : `${dayName} ${day}/${month}`;
}

export function useDateTime() {
  const offset = useSystemSetting("timeOffset");
  const country = useSystemSetting("country");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const adjusted = new Date(now.getTime() + offset);
  return {
    ...formatMenuTime(adjusted, country),
    date: formatMenuDate(adjusted, country),
  };
}

export function ClockTime({ time, period = "" }) {
  const label = period ? `${time} ${period}` : time;
  return (
    <div className="menu-clock menu-clock-above">
      <div className="menu-clock-time" role="timer" aria-label={label}>
        <span className="system-visually-hidden">{label}</span>
        <ClockDigits time={time} />
        {period && (
          <span className="menu-clock-period" aria-hidden="true">
            {period}
          </span>
        )}
      </div>
    </div>
  );
}

export function ClockDate({ date, hidden = false }) {
  if (hidden) return null;

  return (
    <div className="menu-clock menu-clock-below">
      <div className="menu-clock-date">{date}</div>
    </div>
  );
}
