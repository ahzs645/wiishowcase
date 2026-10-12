import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const output = path.join(process.cwd(), "docs/interface-audit");
const base = process.env.INTERFACE_BASE || "http://localhost:4950/wiishowcase/";
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const [mode, width] of [
    ["4:3", 640],
    ["16:9", 854],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height: 480 },
      timezoneId: "America/Vancouver",
    });
    await page.clock.setFixedTime(new Date("2026-10-12T12:00:00-07:00"));
    await page.goto(`${base}?screen=settings`);
    await page.waitForTimeout(700);
    const image = `current/options-${width}x480.png`;
    await page.screenshot({ path: path.join(output, image) });
    const buttons = await page
      .locator(".wii-settings-navbtn")
      .evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return {
            label: el.getAttribute("aria-label"),
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            centerHit: el.contains(hit),
            insideFrame: r.bottom <= innerHeight && r.right <= innerWidth,
          };
        }),
      );
    assert.equal(buttons.length, 3);
    assert.ok(
      buttons.every((button) => button.centerHit && button.insideFrame),
    );
    results.push({ mode, width, height: 480, image, buttons });
    await page.close();
  }
  await fs.writeFile(
    path.join(output, "native-size-checks.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    "PASS Options 640×480 and 854×480: six button centers hit and bounds inside the frame.",
  );
} finally {
  await browser.close();
}
