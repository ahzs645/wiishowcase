import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const report = {
  combinations: 0,
  errors: [],
  missingImages: [],
  confidenceLabels: false,
  opacity: false,
  difference: false,
  outlines: false,
};
page.on("pageerror", (e) => report.errors.push(e.message));
try {
  await page.goto("http://localhost:4957/menu-versions/");
  await page
    .locator("#reference option")
    .first()
    .waitFor({ state: "attached" });
  const ids = await page
    .locator("#reference option")
    .evaluateAll((options) => options.map((e) => e.value));
  for (const id of ids)
    for (const height of ["480", "720"]) {
      await page.selectOption("#reference", id);
      await page.selectOption("#size", height);
      await page.waitForFunction(() =>
        [...document.images].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      );
      assert.match(
        await page.locator("#confidence").innerText(),
        /Exact firmware: not established/,
      );
      const dimensions = await page
        .locator("#after")
        .evaluate((e) => [e.naturalWidth, e.naturalHeight]);
      assert.equal(dimensions[1], Number(height));
      assert.equal(
        dimensions[0],
        id === "copetti-home"
          ? (Number(height) * 4) / 3
          : height === "480"
            ? 854
            : 1280,
      );
      report.combinations++;
    }
  report.confidenceLabels = true;
  await page.selectOption("#reference", "wikipedia-menu-wide");
  await page.locator("#alpha").fill("75");
  report.opacity = await page
    .locator("#overlay-after")
    .evaluate((e) => getComputedStyle(e).opacity === "0.75");
  await page.locator("#difference").check();
  report.difference = await page
    .locator("#overlay-after")
    .evaluate((e) => getComputedStyle(e).mixBlendMode === "difference");
  report.outlines = (await page.locator("#outlines rect").count()) === 2;
  await page.locator("#anchors").uncheck();
  assert.equal(
    await page
      .locator("#outlines")
      .evaluate((e) => getComputedStyle(e).display),
    "none",
  );
  assert.equal(report.errors.length, 0);
  assert.ok(report.opacity && report.difference && report.outlines);
  await page.locator("#difference").uncheck();
  await page.locator("#anchors").check();
  await page.locator("#alpha").fill("50");
  await page.selectOption("#reference", "mariowiki-menu-wide");
  await page.selectOption("#size", "480");
  await page.screenshot({
    path: "docs/menu-versions/viewer.png",
    fullPage: true,
  });
  console.log("PASS", JSON.stringify(report));
} finally {
  await fs.writeFile(
    "docs/menu-versions/viewer-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
