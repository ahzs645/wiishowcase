import { useState, useEffect } from "react";
import { useSystemSetting } from "../lib/systemState";
import { formatMenuTime, formatMenuDate } from "../lib/menuClock";
import { MENU_LAYOUT } from "../layout/menu";
export { formatMenuDate } from "../lib/menuClock";

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
  // Native 4.3 hides the leading hour pane without reflowing the other panes.
  // Reserve that cell so minutes and the AM/PM label do not move at 9 -> 10.
  const config = MENU_LAYOUT.clock;
  const advance = (character) =>
    character === ":" ? config.colonAdvance : config.digitAdvance;
  const characters = [...time.padStart(config.cells, " ")];
  let x = 0;
  const width = characters.reduce(
    (sum, character) => sum + advance(character),
    -config.trailingTrim,
  );
  return (
    <svg
      className="menu-clock-digits"
      viewBox={`0 0 ${width} ${config.viewBoxHeight}`}
      style={{ "--clock-width": width }}
      aria-hidden="true"
    >
      {characters.map((character, index) => {
        const left = x;
        x += advance(character);
        return (
          <g key={index} transform={`translate(${left},0)`}>
            {character === " " ? null : character === ":" ? (
              <>
                {config.colonY.map((y) => (
                  <circle
                    key={y}
                    cx={config.colonX}
                    cy={y}
                    r={config.colonRadius}
                  />
                ))}
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

export function useDateTime() {
  const offset = useSystemSetting("timeOffset");
  const country = useSystemSetting("country");
  const region = useSystemSetting("menuRegion");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const adjusted = new Date(now.getTime() + offset);
  return {
    ...formatMenuTime(adjusted, country, region),
    date: formatMenuDate(adjusted, country, region),
  };
}

export function ClockTime({ time, period = "", periodSide = "after" }) {
  const label = period
    ? periodSide === "before"
      ? `${period} ${time}`
      : `${time} ${period}`
    : time;
  return (
    <div className="menu-clock menu-clock-above">
      <div className="menu-clock-time" role="timer" aria-label={label}>
        <span className="system-visually-hidden">{label}</span>
        <ClockDigits time={time} />
        {period && (
          <span
            className={`menu-clock-period${periodSide === "before" ? " is-before" : ""}`}
            aria-hidden="true"
          >
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
