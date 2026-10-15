import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";
const report = {
  method:
    "Actual DOM and platform fonts after independent source measurement. DOM bounds and source bright-fill bounds differ; do not interpret deltas as a native pixel-accuracy score.",
  captures: [],
};
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
    const p = await browser.newPage({ viewport: { width, height } });
    await p.goto(
      "http://localhost:4955/wiishowcase/?screen=settings&channelPreview=1",
    );
    const b = (name) => p.getByRole("button", { name, exact: true });
    await b("Wii Settings").click();
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    for (const id of ["settings-one", "date"]) {
      if (id === "date") {
        await b("Calendar").click();
        await b("Date").click();
      }
      await p.evaluate(() => document.fonts.ready);
      await p.mouse.move(width - 1, height - 1);
      const geometry = await p.evaluate(interfaceGeometry);
      assert.deepEqual(geometry.failures, []);
      const metrics = await p.evaluate(() => {
        const selectors = [
          ".system-settings-shell h1",
          ".system-version",
          ".system-settings-list .system-button",
          ".wii-settings-back",
          ".native-settings-arrow",
          ".system-settings-pages",
          ".native-number-column input",
        ];
        return Object.fromEntries(
          selectors.map((s) => {
            const e = document.querySelector(s);
            return [
              s,
              e
                ? {
                    rect: e.getBoundingClientRect().toJSON(),
                    fontFamily: getComputedStyle(e).fontFamily,
                    fontSize: getComputedStyle(e).fontSize,
                    fontWeight: getComputedStyle(e).fontWeight,
                  }
                : null,
            ];
          }),
        );
      });
      const { root } = await cdp.send("DOM.getDocument");
      const selector =
        id === "date"
          ? ".native-number-separator"
          : ".system-settings-list .system-button";
      const { nodeId } = await cdp.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector,
      });
      const fonts = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      assert.ok(
        fonts.fonts.some((f) => f.isCustomFont),
        `${id} ${width}: ${JSON.stringify(fonts)}`,
      );
      report.captures.push({ id, width, height, metrics, fonts });
    }
    await p.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(
  "docs/system-menu-refinement/rendered-settings-measurements.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log("PASS 8 Settings/font measurements at both aspects and heights.");
