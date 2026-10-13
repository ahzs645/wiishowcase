import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { formatMenuTime } from "../src/lib/menuClock.js";

const output = "docs/menu-typography";
await fs.mkdir(output, { recursive: true });
const report = {
  checks: [],
  specimens: [],
  errors: [],
  missing: [],
  fontRequests: [],
};
function check(label, value) {
  assert.ok(value, label);
  report.checks.push(label);
}
for (const [hours, minutes, country, expected] of [
  [0, 0, "United States", { time: "12:00", period: "AM" }],
  [12, 0, "United States", { time: "12:00", period: "PM" }],
  [23, 59, "United States", { time: "11:59", period: "PM" }],
  [0, 0, "United Kingdom", { time: "0:00", period: "" }],
  [17, 6, "United Kingdom", { time: "17:06", period: "" }],
]) {
  assert.deepEqual(
    formatMenuTime(new Date(2024, 2, 1, hours, minutes), country),
    expected,
  );
  report.checks.push(
    `${country}: ${hours}:${minutes} formats as ${expected.time} ${expected.period}`.trim(),
  );
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      timezoneId: "America/Vancouver",
    });
    await context.addInitScript(() => {
      if (!localStorage.getItem("wiishowcase.system.v1"))
        localStorage.setItem(
          "wiishowcase.system.v1",
          JSON.stringify({
            version: 1,
            settings: { country: "United States" },
          }),
        );
      window.__menuDate = "2013-01-29T08:59:00Z";
      const OriginalDate = Date;
      window.Date = class extends OriginalDate {
        constructor(...args) {
          super(...(args.length ? args : [window.__menuDate]));
        }
        static now() {
          return new OriginalDate(window.__menuDate).getTime();
        }
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("response", (response) => {
      if (response.status() >= 400) report.missing.push(response.url());
      if (response.url().includes("mplus-1p-bold-latin.woff"))
        report.fontRequests.push({
          url: response.url(),
          status: response.status(),
        });
    });
    await page.goto(
      "http://localhost:4955/wiishowcase/?screen=menu&channelPreview=1",
    );
    await page.locator(".menu-clock-digits").waitFor();
    await page.evaluate(() => document.fonts.ready);
    check(
      `${width}×${height}: real bundled font loaded`,
      await page.evaluate(() =>
        [...document.fonts].some(
          (face) => face.family === "Wii Menu Date" && face.status === "loaded",
        ),
      ),
    );
    check(
      `${width}×${height}: US midnight label rendered`,
      (await page.getByRole("timer").getAttribute("aria-label")) === "12:59 AM",
    );
    const geometry = await page.evaluate(() => {
      const date = document.querySelector(".menu-clock-date"),
        digits = document.querySelector(".menu-clock-digits"),
        period = document.querySelector(".menu-clock-period");
      const rect = (el) => el.getBoundingClientRect().toJSON();
      return {
        date: rect(date),
        digits: rect(digits),
        period: rect(period),
        size: parseFloat(getComputedStyle(date).fontSize),
        family: getComputedStyle(date).fontFamily,
        weight: getComputedStyle(date).fontWeight,
        synthesis: getComputedStyle(date).fontSynthesis,
      };
    });
    const scale = height / 480;
    check(
      `${width}×${height}: proportional date and clock sizing`,
      Math.abs(geometry.size - 32 * scale) < 0.1 &&
        Math.abs(geometry.digits.height - 35 * scale) < 0.1,
    );
    check(
      `${width}×${height}: AM label fits and stays beside centered digits`,
      geometry.period.left > geometry.digits.right &&
        geometry.period.right < width &&
        Math.abs(
          (geometry.digits.left + geometry.digits.right) / 2 - width / 2,
        ) < 1,
    );
    check(
      `${width}×${height}: date uses the bundled bold face without synthetic weight`,
      geometry.family.includes("Wii Menu Date") &&
        geometry.weight === "700" &&
        geometry.synthesis === "none",
    );
    await page.evaluate(() => {
      window.__menuDate = "2013-01-29T20:00:00Z";
    });
    await page.waitForFunction(
      () => document.querySelector('[role="timer"]').ariaLabel === "12:00 PM",
    );
    check(
      `${width}×${height}: noon transition updates the visible period`,
      (await page.locator(".menu-clock-period").innerText()) === "PM",
    );
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("wiishowcase.system.v1"));
      state.settings.country = "United Kingdom";
      localStorage.setItem("wiishowcase.system.v1", JSON.stringify(state));
    });
    await page.reload();
    await page.locator(".menu-clock-digits").waitFor();
    check(
      `${width}×${height}: UK profile retains 24-hour clock without period`,
      (await page.getByRole("timer").getAttribute("aria-label")) === "0:59" &&
        (await page.locator(".menu-clock-period").count()) === 0,
    );
    const mode = width / height < 1.5 ? "4:3" : "16:9";
    const text =
      mode === "4:3"
        ? { time: "17:06", period: "", date: "Fri 03/01" }
        : { time: "12:59", period: "AM", date: "Tue 1/29" };
    await page.evaluate(async (text) => {
      const fixture =
        await import("/wiishowcase/scripts/fixtures/menu-typography.jsx");
      fixture.mountTypographySample(text);
    }, text);
    await page.locator(".typography-specimen .menu-clock-date").waitFor();
    await page.evaluate(() => document.fonts.ready);
    const image = `specimen-${width}x${height}.png`;
    await page.screenshot({ path: `${output}/${image}` });
    report.specimens.push({
      width,
      height,
      mode,
      image,
      ...text,
      geometry,
      scope:
        "Controlled ClockTime/ClockDate components with source-matched text; not a production menu state.",
    });
    await context.close();
  }
  check(
    "No browser errors or missing assets",
    report.errors.length === 0 && report.missing.length === 0,
  );
  check(
    "Font served successfully under the deployed base path",
    report.fontRequests.length >= 4 &&
      report.fontRequests.every(
      (r) => [200, 304].includes(r.status) && r.url.includes("/wiishowcase/fonts/menu/"),
      ),
  );
  console.log(
    `PASS ${report.checks.length} typography checks, four controlled specimens.`,
  );
} finally {
  await fs.writeFile(
    `${output}/results.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
