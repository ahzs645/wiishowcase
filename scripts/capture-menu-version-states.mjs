import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";
const output = "docs/menu-versions";
await fs.mkdir(`${output}/after`, { recursive: true });
const sources = [
  {
    id: "mariowiki-menu-wide",
    mode: "16:9",
    country: "United States",
    region: "U",
    instant: "2013-01-29T08:59:00Z",
    time: "12:59 AM",
    date: "Tue 1/29",
    unread: true,
  },
  {
    id: "wikipedia-menu-wide",
    mode: "16:9",
    country: "United States",
    region: "U",
    instant: "2010-01-01T08:00:00Z",
    time: "12:00 AM",
    date: "Fri 1/1",
    unread: false,
  },
  {
    id: "copetti-home",
    mode: "4:3",
    country: "United Kingdom",
    region: "E",
    instant: "2020-01-04T01:06:00Z",
    time: "17:06",
    date: "Fri 03/01",
    unread: true,
  },
];
const report = {
  captures: [],
  checks: [],
  errors: [],
  missing: [],
  scope:
    "Actual app captures matching written reference time/date and unread count. Fixture years are chosen for weekday agreement, not identified from the source. Channel inventory/animation and SD insertion appearance may differ. Exact reference firmware unverified.",
};
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  for (const source of sources)
    for (const height of [480, 720]) {
      const width =
        source.mode === "4:3" ? (height * 4) / 3 : height === 480 ? 854 : 1280;
      const context = await browser.newContext({
        viewport: { width, height },
        timezoneId: "America/Vancouver",
      });
      await context.addInitScript((source) => {
        localStorage.setItem(
          "wiishowcase.system.v1",
          JSON.stringify({
            version: 1,
            settings: { country: source.country, menuRegion: source.region },
            slots: Array.from(
              { length: 48 },
              (_, i) =>
                [
                  "disc",
                  "mii",
                  "photo",
                  "shop",
                  "news",
                  "onliine",
                  "pokemon-ranch",
                  "forecast",
                ][i] || null,
            ),
            messages: [
              {
                id: "reference-memo",
                type: "memo",
                dateKey: "2013-01-29",
                sender: "Memo",
                preview: "Reference fixture",
                lines: [{ kind: "text", text: "Reference fixture" }],
              },
            ],
            read: source.unread ? [] : ["reference-memo"],
          }),
        );
        const OriginalDate = Date;
        window.Date = class extends OriginalDate {
          constructor(...args) {
            super(...(args.length ? args : [source.instant]));
          }
          static now() {
            return new OriginalDate(source.instant).getTime();
          }
        };
      }, source);
      const page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      page.on("response", (r) => {
        if (r.status() >= 400) report.missing.push(r.url());
      });
      await page.goto(
        "http://localhost:4950/wiishowcase/?screen=menu&channelPreview=1",
      );
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-channel-target="icon"]')].every(
            (el) => el.dataset.channelReady === "true",
          ),
        null,
        { timeout: 90000 },
      );
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.getByRole("timer").getAttribute("aria-label"),
        source.time,
      );
      assert.equal(
        await page.locator(".menu-clock-date").innerText(),
        source.date,
      );
      assert.equal(
        await page.locator(".menu-unread-count").count(),
        source.unread ? 1 : 0,
      );
      const geometry = await page.evaluate(interfaceGeometry);
      assert.deepEqual(geometry.failures, []);
      await page.evaluate(() => {
        const frames = {
          disc: 0,
          mii: 430,
          photo: 180,
          shop: 180,
          news: 0,
          forecast: 0,
          "pokemon-ranch": 0,
        };
        for (const canvas of document.querySelectorAll(
          '[data-channel-target="icon"] canvas',
        )) {
          const renderer = canvas.channelRenderer;
          if (!renderer) continue;
          const id = canvas
            .closest("[data-channel-target]")
            .dataset.channelBundle.split("/")
            .pop()
            .replace(/\.zip$/, "");
          renderer.stop();
          renderer.renderFrame(frames[id] ?? 180);
        }
      });
      await page.addStyleTag({
        content:
          ".wii-pointer-sprite,.wii-pointer-trail{visibility:hidden!important}",
      });
      const image = `after/${source.id}-${width}x${height}.png`;
      await page.screenshot({ path: `${output}/${image}` });
      report.captures.push({ ...source, width, height, image });
      report.checks.push(
        `${source.id} ${width}×${height}: exact written time/date, unread count, all channel icons ready and controls/text fit`,
      );
      await context.close();
    }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  console.log(
    `PASS ${report.captures.length} reference-state app captures; no browser errors or missing assets.`,
  );
} finally {
  await fs.writeFile(
    `${output}/state-capture-results.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
