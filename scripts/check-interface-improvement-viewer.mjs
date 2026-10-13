import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const report = {
  combinations: 0,
  errors,
  brokenImages: [],
  overlay: false,
  difference: false,
};
try {
  await page.goto("http://localhost:4957/interface-improvements/");
  const options = await page
    .locator("#interface option")
    .evaluateAll((els) => els.map((el) => el.value));
  for (const id of options)
    for (const mode of ["4:3", "16:9"]) {
      await page.selectOption("#interface", id);
      await page.selectOption("#mode", mode);
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".frame img")].every(
          (im) => im.complete && im.naturalWidth > 0,
        ),
      );
      const broken = await page
        .locator(".frame img")
        .evaluateAll((els) =>
          els
            .filter((im) => !im.complete || !im.naturalWidth)
            .map((im) => im.src),
        );
      report.brokenImages.push(...broken);
      report.combinations++;
    }
  await page.locator("#alpha").fill("75");
  report.overlay = await page
    .locator("#overlay-image")
    .evaluate((el) => getComputedStyle(el).opacity === "0.75");
  await page.locator("#difference").check();
  report.difference = await page
    .locator("#overlay-image")
    .evaluate((el) => getComputedStyle(el).mixBlendMode === "difference");
  assert.equal(errors.length, 0);
  assert.equal(report.brokenImages.length, 0);
  assert.ok(report.overlay && report.difference);
  await page.selectOption("#interface", "menu-settled");
  await page.selectOption("#mode", "4:3");
  await page.locator("#difference").uncheck();
  await page.locator("#alpha").fill("50");
  await page.screenshot({ path: "docs/interface-improvements/viewer.png" });
  console.log("PASS", JSON.stringify(report));
} finally {
  await fs.writeFile(
    "docs/interface-improvements/viewer-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
