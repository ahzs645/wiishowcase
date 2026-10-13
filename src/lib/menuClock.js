// The US Wii menu uses a twelve-hour clock; other supported country profiles
// retain the twenty-four-hour display. Keep the period separate from the digits.
export function formatMenuTime(date, country = "United States") {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const twelveHour = country === "United States";
  return {
    time: `${twelveHour ? hours % 12 || 12 : hours}:${minutes}`,
    period: twelveHour ? (hours < 12 ? "AM" : "PM") : "",
  };
}
