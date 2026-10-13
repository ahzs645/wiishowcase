// Native 4.3 clock policy follows product region, not Country. Country remains
// an automatic profile choice for existing saves; an explicit region overrides it.
// Source: koopthekoopa/wii-ipl, scene/channelSelect/iplClock.cpp::calc_tex.
export function resolveMenuRegion(country, region = "auto") {
  if (["U", "E", "J", "K"].includes(region)) return region;
  if (["United States", "Canada"].includes(country)) return "U";
  if (country === "Japan") return "J";
  return "E";
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
  return resolveMenuRegion(country, region) === "U"
    ? `${dayName} ${month}/${day}`
    : `${dayName} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function formatMenuTime(
  date,
  country = "United States",
  region = "auto",
) {
  const profile = resolveMenuRegion(country, region);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const twelveHour = profile !== "E";
  const hour = twelveHour ? hours % 12 : hours;
  return {
    time: `${twelveHour && profile !== "J" ? hour || 12 : hour}:${minutes}`,
    period: twelveHour ? (hours < 12 ? "AM" : "PM") : "",
    ...(["J", "K"].includes(profile) ? { periodSide: "before" } : {}),
  };
}
