import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const report = { checks: [], errors: [] };
try {
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const p = await browser.newPage({ viewport: { width, height } });
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.goto(
      "http://localhost:4955/wiishowcase/?screen=menu&channelPreview=1",
    );
    const b = (name) => p.getByRole("button", { name, exact: true });
    await b("Open Mail").click();
    await b("Notepad").click();
    await b("Memo").click();
    await b("Write a memo").click();
    const keyboard = p.locator("wii-keyboard .is-open");
    for (const mode of ["QWERTY", "Phone"]) {
      if (mode === "Phone") await b("Phone").click();
      await keyboard.evaluate((el) => {
        const controls = [
          ...el.querySelectorAll("input,textarea,button:not(:disabled)"),
        ].filter(
          (e) =>
            e.getClientRects().length &&
            getComputedStyle(e).visibility !== "hidden",
        );
        window.testKeyboardEnds = { first: controls[0], last: controls.at(-1) };
        controls.at(-1).focus();
      });
      await p.keyboard.press("Tab");
      assert.ok(
        await p.evaluate(
          () => document.activeElement === window.testKeyboardEnds.first,
        ),
      );
      await p.keyboard.press("Shift+Tab");
      assert.ok(
        await p.evaluate(
          () => document.activeElement === window.testKeyboardEnds.last,
        ),
      );
      report.checks.push(
        `${width}x${height}: ${mode} Tab / Shift+Tab wrap only through visible controls`,
      );
    }
    await p.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(
    "docs/system-menu-fixes/keyboard-focus-checks.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
assert.deepEqual(report.errors, []);
console.log(`PASS ${report.checks.length} keyboard focus-loop checks.`);
