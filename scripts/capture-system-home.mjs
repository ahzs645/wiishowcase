// Targeted visual regression: the HOME actions must stay in the native 2+1 layout.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";
const output = "docs/system-menu-fixes",
  report = { checks: [], captures: [] };
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
    const c = await browser.newContext({
        viewport: { width, height },
        timezoneId: "America/Vancouver",
      }),
      p = await c.newPage();
    await p.addInitScript(() => {
      const OriginalDate = Date;
      window.Date = class extends OriginalDate {
        constructor(...args) {
          super(...(args.length ? args : ["2026-10-12T19:00:00Z"]));
        }
        static now() {
          return new OriginalDate("2026-10-12T19:00:00Z").getTime();
        }
      };
      localStorage.setItem(
        "wiishowcase.system.v1",
        JSON.stringify({
          version: 1,
          settings: { timeOffset: 95400000 },
          slots: [
            "disc",
            "mii",
            "photo",
            "shop",
            "news",
            "onliine",
            "pokemon-ranch",
            "forecast",
          ],
        }),
      );
    });
    await p.goto(
      "http://localhost:4955/wiishowcase/?screen=menu&channelPreview=1",
    );
    await p.locator(".menu-slot").first().waitFor();
    await p.waitForTimeout(2000);
    await p.keyboard.press("Control+h");
    await p.getByRole("button", { name: "Wii Menu", exact: true }).waitFor();
    await p.waitForTimeout(400);
    await p.mouse.move(width - 1, height - 1);
    const buttons = p.locator(".home-menu-buttons > button"),
      rects = await buttons.evaluateAll((items) =>
        items.map((el) => el.getBoundingClientRect().toJSON()),
      );
    assert.ok(
      Math.abs(rects[0].y - rects[1].y) < 1 && rects[2].y > rects[0].bottom,
      "HOME keeps two actions above the guide",
    );
    const geometry = await p.evaluate(interfaceGeometry);
    assert.deepEqual(geometry.failures, []);
    const image = `current/home-menu-${width}x${height}.png`;
    await p.screenshot({ path: `${output}/${image}` });
    report.captures.push({ id: "home-menu", width, height, image, geometry });
    report.checks.push(
      `${width}x${height}: HOME 2+1 placement, text bounds and pointer hits`,
    );
    await c.close();
  }
} finally {
  await browser.close();
}
const core = JSON.parse(await fs.readFile(`${output}/core-captures.json`));
for (const c of report.captures) {
  const old = core.captures.find(
    (x) => x.id === c.id && x.width === c.width && x.height === c.height,
  );
  assert.ok(old);
  Object.assign(old, c);
}
await fs.writeFile(
  `${output}/core-captures.json`,
  JSON.stringify(core, null, 2) + "\n",
);
await fs.writeFile(
  `${output}/home-layout-checks.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log("PASS four HOME captures retain native 2+1 action placement.");
