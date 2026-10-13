import { useState, useEffect } from "react";
import { useSystemSetting } from "../lib/systemState";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(date) {
  const hour = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${min}`;
}

export function formatMenuDate(date, country = "United States") {
  const dayName = DAYS[date.getDay()];
  const month = date.getMonth() + 1;
  return country === "United States"
    ? `${dayName} ${month}/${date.getDate()}`
    : `${dayName} ${date.getDate()}/${month}`;
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
    time: formatTime(adjusted),
    date: formatMenuDate(adjusted, country),
  };
}

export function ClockTime({ time }) {
  return (
    <div className="menu-clock menu-clock-above">
      <div className="menu-clock-time">{time}</div>
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
