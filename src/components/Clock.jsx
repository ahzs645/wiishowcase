import { useState, useEffect } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(date) {
  const hour = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${min}`;
}

export function formatMenuDate(date) {
  const dayName = DAYS[date.getDay()];
  const month = date.getMonth() + 1;
  return `${dayName} ${date.getDate()}/${month}`;
}

export function useDateTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return { time: formatTime(now), date: formatMenuDate(now) };
}

export function ClockTime({ time }) {
  return (
    <div className="menu-clock menu-clock-above">
      <div className="menu-clock-time">{time}</div>
    </div>
  );
}

export function ClockDate({ date }) {
  return (
    <div className="menu-clock menu-clock-below">
      <div className="menu-clock-date">{date}</div>
    </div>
  );
}
