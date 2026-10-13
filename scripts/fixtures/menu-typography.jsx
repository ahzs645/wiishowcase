// Controlled specimens for comparing identical text to the source screenshots.
// This fixture is served by Vite during validation and is not imported by the app.
import React from "react";
import { createRoot } from "react-dom/client";
import { ClockTime, ClockDate } from "../../src/components/Clock";

export function mountTypographySample({ time, period, date }) {
  for (const clock of document.querySelectorAll(".menu-clock")) {
    clock.style.visibility = "hidden";
  }
  const host = document.createElement("div");
  host.className = "typography-specimen";
  Object.assign(host.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
  });
  document.querySelector(".wii-menu").append(host);
  createRoot(host).render(
    <>
      <ClockTime time={time} period={period} />
      <ClockDate date={date} />
    </>,
  );
}
