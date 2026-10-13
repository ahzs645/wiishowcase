import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";

const output = path.resolve("docs/menu-fidelity");
const local = process.env.MENU_URL || "http://localhost:4950/wiishowcase/";
const production = "https://projects.ahmadjalil.com/wiishowcase/";
const beforeRevision = "3e96806fce2cf11cfb7073c7c08bd4a72bf6d677";
const iconFrames = {
  disc: 0,
  mii: 430,
  photo: 180,
  shop: 180,
  news: 0,
  forecast: 0,
  "pokemon-ranch": 0,
};
await fs.mkdir(path.join(output, "before"), { recursive: true });
await fs.mkdir(path.join(output, "after"), { recursive: true });
const report = {
  beforeRevision,
  date: "2024-03-01 17:06 America/Vancouver",
  iconFrames,
  captures: [],
  checks: [],
  errors: [],
};
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const check = (label, value) => {
  assert.ok(value, label);
  report.checks.push(label);
  console.log("PASS", label);
};
async function freezeIcons(page) {
  await page.evaluate((frames) => {
    for (const canvas of document.querySelectorAll(
      '[data-channel-target="icon"] canvas',
    )) {
      const renderer = canvas.channelRenderer;
      if (!renderer) continue;
      const channel = canvas
        .closest("[data-channel-target]")
        .dataset.channelBundle.split("/")
        .pop()
        .replace(/\.zip$/, "");
      renderer.stop();
      renderer.renderFrame(frames[channel] ?? 180);
    }
  }, iconFrames);
}
try {
  if (process.argv.includes("--capture-before")) {
    const versionPage = await browser.newPage();
    const response = await versionPage.goto(
      `${production}version.json?menu-before=3e96806`,
    );
    const version = JSON.parse(await response.text());
    await versionPage.close();
    assert.equal(
      version.commitSha,
      beforeRevision,
      "Preserved production baseline must be the previous menu implementation",
    );
  }
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const mode = width / height < 1.5 ? "4:3" : "16:9";
    const before = `before/menu-${width}x${height}.png`,
      image = `after/menu-${width}x${height}.png`;
    for (const baseline of process.argv.includes("--capture-before")
      ? [true, false]
      : [false]) {
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
                  dateKey: "2024-03-01",
                  sender: "Memo",
                  preview: "Menu reference fixture",
                  lines: [{ kind: "text", text: "Menu reference fixture" }],
                },
              ],
            }),
          );
        const OriginalDate = Date;
        window.Date = class extends OriginalDate {
          constructor(...args) {
            super(...(args.length ? args : ["2024-03-02T01:06:00Z"]));
          }
          static now() {
            return new OriginalDate("2024-03-02T01:06:00Z").getTime();
          }
        };
      });
      const page = await context.newPage();
      page.on("pageerror", (error) =>
        report.errors.push({ mode, width, baseline, message: error.message }),
      );
      await page.goto(
        `${baseline ? production : local}?screen=menu&channelPreview=1`,
      );
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-channel-target="icon"]')].every(
            (el) => el.dataset.channelReady === "true",
          ),
        null,
        { timeout: 90000 },
      );
      await page.waitForTimeout(800);
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(width - 2, 2);
      await page.addStyleTag({
        content:
          ".wii-pointer-sprite,.wii-pointer-trail{visibility:hidden!important}",
      });
      await freezeIcons(page);
      await page.screenshot({
        path: path.join(output, baseline ? before : image),
      });
      if (!baseline) {
        check(
          `${width}×${height}: bundled date font is loaded`,
          await page.evaluate(() =>
            [...document.fonts].some(
              (face) =>
                face.family === "Wii Menu Date" && face.status === "loaded",
            ),
          ),
        );
        const geometry = await page.evaluate(interfaceGeometry);
        check(
          `${width}×${height}: idle controls and labels fit`,
          geometry.failures.length === 0,
        );
        const metrics = await page.evaluate(() => {
          const rect = (selector) =>
            document.querySelector(selector).getBoundingClientRect().toJSON();
          return {
            first: rect('[data-slot-index="0"]'),
            next: rect('[data-slot-index="12"]'),
            stride: rect(".wii-channel-holder-grid").width,
            clip: document.querySelector("wii-channel-holder").style.clipPath,
            clock: rect(".menu-clock-digits"),
            date: rect(".menu-clock-date"),
          };
        });
        check(
          `${width}×${height}: adjacent page column is visible`,
          metrics.next.x < width - 8 && metrics.next.right > width,
        );
        check(
          `${width}×${height}: mail badge reflects one unread record`,
          (await page.locator(".menu-unread-count").innerText()) === "1",
        );
        for (let index = 1; index <= 3; index++) {
          await page
            .locator(".channel-holder-wrapper > .channel-page-arrow-next")
            .click();
          await page.waitForTimeout(600);
          const position = await page
            .locator(`[data-slot-index="${index * 12}"]`)
            .boundingBox();
          check(
            `${width}×${height}: page ${index + 1} retains grid alignment`,
            Math.abs(position.x - metrics.first.x) < 2,
          );
        }
        check(
          `${width}×${height}: last page hides next arrow`,
          (await page
            .locator(".channel-holder-wrapper > .channel-page-arrow-next")
            .count()) === 0,
        );
        for (let index = 0; index < 3; index++) {
          await page
            .locator(".channel-holder-wrapper > .channel-page-arrow-prev")
            .click();
          await page.waitForTimeout(550);
        }
        await page
          .getByRole("button", { name: "Move channels", exact: true })
          .focus();
        await page
          .getByRole("button", { name: "Move channels", exact: true })
          .click();
        await page.locator('[data-slot-index="1"]').click();
        await page
          .locator(".channel-holder-wrapper > .channel-page-arrow-next")
          .click();
        await page.waitForTimeout(600);
        await page.locator('[data-slot-index="12"]').click();
        await page.getByRole("button", { name: "Done", exact: true }).click();
        check(
          `${width}×${height}: reorder reaches another page`,
          await page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("wiishowcase.system.v1"))
                .slots[12] === "mii",
          ),
        );
        const resizeWidth = Math.round(width * 0.85),
          resizeHeight = Math.round(height * 0.85);
        await page.setViewportSize({
          width: resizeWidth,
          height: resizeHeight,
        });
        await page.waitForTimeout(500);
        const resized = await page.evaluate(() => ({
          first: document
            .querySelector('[data-slot-index="12"]')
            .getBoundingClientRect().x,
          left: document
            .querySelector('[data-slot-index="0"]')
            .getBoundingClientRect().x,
          stride: document
            .querySelector(".wii-channel-holder-grid")
            .getBoundingClientRect().width,
          scroll: document.querySelector(".channel-pages-viewport").scrollLeft,
        }));
        check(
          `${width}×${height}: resize preserves page and scroll stride`,
          Math.abs(resized.scroll - resized.stride) < 2,
        );
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);
        const currentHit = await page
          .locator('[data-slot-index="12"] .is-clickable')
          .evaluate((el) => {
            const r = el.getBoundingClientRect();
            return el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            );
          });
        check(
          `${width}×${height}: channel remains clickable after resize`,
          currentHit,
        );
        await page.reload();
        await page.waitForTimeout(500);
        check(
          `${width}×${height}: reordered slots survive reload`,
          await page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("wiishowcase.system.v1"))
                .slots[12] === "mii",
          ),
        );
        await page
          .getByRole("button", { name: "Open Mail", exact: true })
          .click();
        await page.waitForTimeout(650);
        await page
          .getByRole("button", { name: "Open Memo from Memo", exact: true })
          .click();
        check(
          `${width}×${height}: opening the record clears the unread badge`,
          (await page.locator(".menu-unread-count").count()) === 0,
        );
        report.captures.push({
          mode,
          width,
          height,
          image,
          before,
          metrics,
          reference: mode === "4:3" ? "copetti-home" : "mariowiki-menu-wide",
        });
      }
      await context.close();
    }
    await fs.access(path.join(output, before));
  }
  report.forcedFrames = [];
  for (const [aspect, width, height] of [
    ["4:3", 1280, 720],
    ["16:9", 960, 720],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(
      (aspect) =>
        localStorage.setItem(
          "wiishowcase.system.v1",
          JSON.stringify({ version: 1, settings: { aspect } }),
        ),
      aspect,
    );
    const page = await context.newPage();
    await page.goto(`${local}?screen=menu`);
    await page.waitForTimeout(300);
    const frames = await page.evaluate(() => ({
      root: document.querySelector(".wii").getBoundingClientRect().toJSON(),
      menu: document
        .querySelector(".wii-menu")
        .getBoundingClientRect()
        .toJSON(),
    }));
    check(
      `Forced ${aspect}: actual frame has requested ratio`,
      Math.abs(
        frames.root.width / frames.root.height -
          (aspect === "4:3" ? 4 / 3 : 16 / 9),
      ) < 0.001,
    );
    check(
      `Forced ${aspect}: menu fits the letterboxed frame`,
      ["x", "y", "width", "height"].every(
        (axis) => Math.abs(frames.root[axis] - frames.menu[axis]) < 1,
      ),
    );
    report.forcedFrames.push({ aspect, ...frames });
    await context.close();
  }
  check("No browser page errors", report.errors.length === 0);
} finally {
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
