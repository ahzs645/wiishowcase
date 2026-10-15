import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
const base =
  process.env.COMPARISON_URL || "http://localhost:4957/system-menu-fixes/";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const report = { combinations: 0, errors: [], missing: [] };
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400)
      report.missing.push({ url: r.url(), status: r.status() });
  });
  await page.goto(base);
  await page
    .locator("#interface option")
    .first()
    .waitFor({ state: "attached" });
  const ids = await page
    .locator("#interface option")
    .evaluateAll((o) => o.map((n) => n.value));
  assert.equal(ids.length, Number(process.env.EXPECTED_COMPARISON_STATES || 64));
  for (const id of ids)
    for (const mode of ["4:3", "16:9"])
      for (const height of ["480", "720"]) {
        await page.selectOption("#interface", id);
        await page.selectOption("#mode", mode);
        await page.selectOption("#height", height);
        for (const layer of ["before", "reference"]) {
          await page.selectOption("#layer", layer);
          await page.waitForFunction(() =>
            [...document.images]
              .filter(
                (i) =>
                  i.getAttribute("src") &&
                  getComputedStyle(i).display !== "none",
              )
              .every((i) => i.complete && i.naturalWidth > 0),
          );
          assert.ok(
            (await page.locator("#confidence").innerText()).length > 10,
          );
          report.combinations++;
        }
        assert.equal(
          await page.locator("#after").evaluate((i) => i.naturalHeight),
          Number(height),
        );
      }
  await page.selectOption("#interface", "date");
  await page.selectOption("#layer", "reference");
  await page.locator("#alpha").fill("75");
  assert.equal(
    await page.locator("#overlay").evaluate((i) => getComputedStyle(i).opacity),
    "0.75",
  );
  await page.locator("#difference").check();
  assert.equal(
    await page
      .locator("#overlay")
      .evaluate((i) => getComputedStyle(i).mixBlendMode),
    "difference",
  );
  await page.selectOption("#interface", "screen-settings");
  assert.match(await page.locator("#confidence").innerText(), /No same-view/);
  await page.selectOption("#interface", "standby-downloads");
  await page.selectOption("#layer", "before");
  if (process.env.SYSTEM_COMPARISON_OUTPUT)
    assert.ok(!(await page.locator("#no-before").isVisible()));
  else assert.ok(await page.locator("#no-before").isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.missing, []);
  console.log(
    `PASS ${report.combinations} overlay combinations; opacity, difference, missing-source labels and narrow viewport.`,
  );
} finally {
  await fs.writeFile(
    `${process.env.SYSTEM_COMPARISON_OUTPUT || "docs/system-menu-fixes"}/viewer-validation.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
