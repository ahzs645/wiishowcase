import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const report = {
  combinations: 0,
  errors: [],
  missing: [],
  referenceLimits: true,
  opacity: false,
  difference: false,
  search: false,
  noReference: false,
  mobileFits: false,
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      report.missing.push({ url: r.url(), status: r.status() });
  });
  await page.goto("http://localhost:4957/other-menus/?historical=1");
  const ids = await page
    .locator("#interface option")
    .evaluateAll((options) => options.map((o) => o.value));
  assert.equal(ids.length, 54);
  for (const id of ids)
    for (const mode of ["4:3", "16:9"])
      for (const height of ["480", "720"]) {
        await page.selectOption("#interface", id);
        await page.selectOption("#mode", mode);
        await page.selectOption("#size", height);
        await page.waitForFunction(() =>
          [...document.images]
            .filter(
              (i) =>
                i.getAttribute("src") && getComputedStyle(i).display !== "none",
            )
            .every((i) => i.complete && i.naturalWidth > 0),
        );
        assert.equal(
          await page
            .locator("#current")
            .evaluate((image) => image.naturalHeight),
          Number(height),
        );
        assert.ok((await page.locator("#confidence").innerText()).length > 10);
        report.combinations++;
      }
  await page.selectOption("#interface", "channels-data");
  assert.match(
    await page.locator("#confidence").innerText(),
    /Related view\/state/,
  );
  await page.selectOption("#interface", "date");
  await page.locator("#alpha").fill("75");
  report.opacity = await page
    .locator("#overlay-reference")
    .evaluate((i) => getComputedStyle(i).opacity === "0.75");
  await page.locator("#difference").check();
  report.difference = await page
    .locator("#overlay-reference")
    .evaluate((i) => getComputedStyle(i).mixBlendMode === "difference");
  await page.selectOption("#interface", "screen-settings");
  report.noReference =
    (await page.locator("#alpha").isDisabled()) &&
    (await page.locator("#no-source").isVisible());
  await page.locator("#screen-search").fill("sensor");
  const filtered = await page.locator("#screens tr:visible").count();
  report.search = filtered > 0 && filtered < 54;
  await page.selectOption("#interface", "sound");
  await page.selectOption("#mode", "4:3");
  await page.selectOption("#size", "480");
  await page.locator("#comparison").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/other-menus/viewer.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobileFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  assert.ok(
    report.opacity &&
      report.difference &&
      report.noReference &&
      report.search &&
      report.mobileFits,
  );
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  console.log(
    `PASS ${report.combinations} viewer combinations, evidence labels, overlays, search and narrow viewport.`,
  );
} finally {
  await fs.writeFile(
    "docs/other-menus/viewer-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
