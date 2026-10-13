// Native 4.3 clock policy follows product region, not Country. Country remains
// an automatic profile choice for existing saves; an explicit region overrides it.
// Source: koopthekoopa/wii-ipl, scene/channelSelect/iplClock.cpp::calc_tex.
import { MENU_LAYOUT } from "../layout/menu.js";
const CLOCK = MENU_LAYOUT.clock;
export function resolveMenuRegion(country, region = "auto") {
  if (Object.hasOwn(CLOCK.regions, region)) return region;
  return Object.hasOwn(CLOCK.countryRegions, country)
    ? CLOCK.countryRegions[country]
    : CLOCK.fallbackRegion;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function formatMenuDate(
  date,
  country = "United States",
  region = "auto",
) {
  const dayName = DAYS[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // English U-profile captures consistently use unpadded month/day. The
  // current English European profile retains padded day/month. Full J/K date
  // localization is not implemented by the English UI.
  const profile = CLOCK.regions[resolveMenuRegion(country, region)];
  const parts = profile.dateOrder === "month/day" ? [month, day] : [day, month];
  return `${dayName} ${parts.map((value) => (profile.datePadding ? String(value).padStart(2, "0") : String(value))).join("/")}`;
}

export function formatMenuTime(
  date,
  country = "United States",
  region = "auto",
) {
  const profile = CLOCK.regions[resolveMenuRegion(country, region)];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const twelveHour = profile.hourCycle === 12;
  const hour = twelveHour ? hours % 12 : hours;
  return {
    time: `${twelveHour ? hour || profile.zeroHour : hour}:${minutes}`,
    period: twelveHour ? (hours < 12 ? "AM" : "PM") : "",
    ...(profile.periodSide === "before" ? { periodSide: "before" } : {}),
  };
}
