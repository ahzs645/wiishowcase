import { WiiButton } from "./SystemUI";
import { resolveMenuRegion } from "../../lib/menuClock";
import { useEffect, useState } from "react";

export function ChoiceList({ values, value, onChange, label, wide = false }) {
  return (
    <div
      className={`native-choice-list${wide ? " is-wide" : ""}`}
      role="group"
      aria-label={label}
      data-count={values.length}
    >
      {values.map((item) => {
        const [key, text] = Array.isArray(item) ? item : [item, item];
        return (
          <WiiButton
            key={String(key)}
            aria-pressed={value === key}
            onClick={() => onChange(key)}
          >
            {text}
          </WiiButton>
        );
      })}
    </div>
  );
}

export function NumberColumn({ label, value, min, max, digits = 2, onChange }) {
  const format = (number) => String(number).padStart(digits, "0");
  const [text, setText] = useState(() => format(value));
  useEffect(() => setText(format(value)), [value, digits]);
  const change = (next) => onChange(next > max ? min : next < min ? max : next);
  return (
    <div className="native-number-column">
      <button
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => change(value + 1)}
      >
        <svg viewBox="0 0 32 22" aria-hidden="true">
          <path d="M2 20 16 2l14 18-14-6z" />
        </svg>
      </button>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={text}
        onChange={(e) => {
          const next = Number(e.target.value);
          setText(e.target.value);
          if (e.target.value && next >= min && next <= max) onChange(next);
        }}
        onBlur={() => {
          const next =
            text === "" ? value : Math.min(max, Math.max(min, Number(text)));
          onChange(next);
          setText(format(next));
        }}
      />
      <button
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => change(value - 1)}
      >
        <svg viewBox="0 0 32 22" aria-hidden="true">
          <path d="m2 2 14 18L30 2 16 8z" />
        </svg>
      </button>
    </div>
  );
}

export function DateSelector({ value, onChange, country, region }) {
  const [year, month, day] = value.split("-").map(Number);
  const update = (field, next) => {
    const y = field === "year" ? next : year,
      m = field === "month" ? next : month;
    const d = Math.min(
      field === "day" ? next : day,
      new Date(y, m, 0).getDate(),
    );
    onChange(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  };
  const fields = {
    month: ["Month", month, 1, 12],
    day: ["Day", day, 1, new Date(year, month, 0).getDate()],
    year: ["Year", year, 2000, 2099],
  };
  const order =
    resolveMenuRegion(country, region) === "U"
      ? ["month", "day", "year"]
      : ["day", "month", "year"];
  return (
    <div
      className="native-number-selector"
      role="group"
      aria-label="Console date"
    >
      {order.map((key, i) => (
        <div className="native-number-part" key={key}>
          {i > 0 && <span className="native-number-separator">/</span>}
          <NumberColumn
            label={fields[key][0]}
            value={fields[key][1]}
            min={fields[key][2]}
            max={fields[key][3]}
            digits={key === "year" ? 4 : 2}
            onChange={(v) => update(key, v)}
          />
        </div>
      ))}
    </div>
  );
}

export function TimeSelector({ value, onChange }) {
  const [hour, minute] = value.split(":").map(Number);
  return (
    <div
      className="native-number-selector"
      role="group"
      aria-label="Console time"
    >
      <NumberColumn
        label="Hour"
        value={hour}
        min={0}
        max={23}
        onChange={(v) =>
          onChange(
            `${String(v).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          )
        }
      />
      <span className="native-number-separator">:</span>
      <NumberColumn
        label="Minute"
        value={minute}
        min={0}
        max={59}
        onChange={(v) =>
          onChange(
            `${String(hour).padStart(2, "0")}:${String(v).padStart(2, "0")}`,
          )
        }
      />
    </div>
  );
}
