import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";
const base = process.env.FIXES_BASE || "http://localhost:4955/wiishowcase/";
const output =
  process.env.FIXES_ARTIFACTS || "/workspace/scratch/system-fixes-interactions";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const report = { checks: [], geometry: [], errors: [] };
const check = (label, value) => {
  assert.ok(value, label);
  report.checks.push(label);
  console.log("PASS", label);
};
try {
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const context = await browser.newContext({
        viewport: { width, height },
        timezoneId: "America/Vancouver",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) =>
      report.errors.push({ width, height, error: e.message }),
    );
    await page.route("**/api/signal/**", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/html",
        body: "No automatic relay in this fallback test.",
      }),
    );
    const b = (name, scope = page) =>
      scope.getByRole("button", { name, exact: true });
    const state = () =>
      page.evaluate(async () => {
        const { systemSnapshot } =
          await import("/wiishowcase/src/lib/systemState.js");
        return systemSnapshot();
      });
    const back = () =>
      b("Back", page.locator(".system-settings-shell footer")).click();
    const geometry = async (id) => {
      await page.mouse.move(width - 1, height - 1);
      await page.waitForTimeout(150);
      const g = await page.evaluate(interfaceGeometry);
      report.geometry.push({ id, width, height, ...g });
      assert.deepEqual(g.failures, [], `${id} ${width}x${height}`);
      await page.screenshot({ path: `${output}/${id}-${width}x${height}.png` });
    };
    await page.goto(`${base}?screen=settings&channelPreview=1`);
    await b("Wii Settings").click();
    await b("Sound").click();
    const choiceBefore = await page
      .locator(".native-choice-list")
      .boundingBox();
    await b("Confirm").click();
    await page.getByText("Settings saved.", { exact: true }).waitFor();
    const choiceAfter = await page.locator(".native-choice-list").boundingBox();
    check(
      `${width}: saving choices does not move the selector`,
      Math.abs(choiceBefore.y - choiceAfter.y) < 1,
    );
    const sound = (await state()).settings.sound;
    await b(sound === "Mono" ? "Stereo" : "Mono").click();
    await back();
    await b("Sound").click();
    check(
      `${width}: Back discards unconfirmed choice`,
      (await state()).settings.sound === sound &&
        (await b(sound).getAttribute("aria-pressed")) === "true",
    );
    await back();
    await b("Calendar").click();
    await b("Date").click();
    const dateBefore = await page
      .locator(".native-number-selector")
      .boundingBox();
    await b("Confirm").click();
    await page.getByText("Settings saved.", { exact: true }).waitFor();
    const dateAfter = await page
      .locator(".native-number-selector")
      .boundingBox();
    check(
      `${width}: saving date does not move its digit columns`,
      Math.abs(dateBefore.y - dateAfter.y) < 1,
    );
    await page.getByLabel("Year", { exact: true }).fill("2028");
    await page.getByLabel("Month", { exact: true }).fill("2");
    await page.getByLabel("Day", { exact: true }).fill("29");
    await page.getByLabel("Year", { exact: true }).focus();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("2027");
    await page.waitForFunction(
      () => document.querySelector('input[aria-label="Day"]').value === "28",
    );
    check(
      `${width}: date clamps leap day`,
      (await page.getByLabel("Day", { exact: true }).inputValue()) === "28",
    );
    await geometry("date-draft");
    await back();
    await back();
    await b("Settings page 2").click();
    await b("WiiConnect24").click();
    await b("Standby Connection").click();
    await b("On").click();
    await b("Confirm").click();
    check(
      `${width}: standby preference saves`,
      (await state()).settings.standby === true,
    );
    await back();
    await b("Slot Illumination").click();
    await b("Dim").click();
    await b("Confirm").click();
    check(
      `${width}: illumination preference saves`,
      (await state()).settings.slotIllumination === "Dim",
    );
    await back();
    await back();
    await b("Parental Controls").click();
    await b("Highest Game Rating Allowed: All ages").click();
    await b("Teen").click();
    await b("Confirm").click();
    check(
      `${width}: rating preference saves`,
      (await state()).settings.parentalRating === "Teen",
    );
    await geometry("rating-confirmed");
    await back();
    await b("Secret Question").click();
    await b("Enter answer").click();
    const kb = page.locator("wii-keyboard .is-open");
    await kb.locator(".wii-keyboard-input").fill("Pasta");
    await b("OK", kb).click();
    await b("Confirm").click();
    check(
      `${width}: secret answer saves`,
      (await state()).settings.secretAnswer === "Pasta",
    );
    await back();
    await back();
    await b("Internet").click();
    await b("Connection Settings").click();
    await page.getByRole("button", { name: /^Connection 1/ }).click();
    await b("Wireless Connection").click();
    check(
      `${width}: connection profile saves`,
      (await state()).settings.connections[0] === "Wireless Connection",
    );
    await back();
    await back();
    await back();
    await b("Settings page 3").click();
    await b("Wii System Update").click();
    await page
      .getByText("There is no need to update.", { exact: false })
      .waitFor();
    await geometry("update-current");
    check(
      `${width}: Update isolates background`,
      await page.locator("#root").evaluate((el) => el.inert),
    );
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i % 2 ? "Shift+Tab" : "Tab");
      check(
        `${width}: Update focus stays inside ${i}`,
        await page
          .locator(".system-update-dialog")
          .evaluate((el) => el.contains(document.activeElement)),
      );
    }
    await page.keyboard.press("Escape");
    check(
      `${width}: Update Escape preserves Settings`,
      (await page.locator('[data-settings-path="Wii Settings"]').count()) === 1,
    );
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await page.locator(".menu-slot").first().waitFor();
    await page.keyboard.press("Control+h");
    await b("Operations Guide").click();
    await geometry("operations-guide");
    await page.keyboard.press("Escape");
    await b("Wii Remote Settings").click();
    await b("Reconnect").click();
    await page.locator(".pairing-qr svg").waitFor({ timeout: 30000 });
    await page
      .getByText("Automatic exchange is unavailable here.", { exact: false })
      .waitFor();
    await geometry("reconnect");
    await b("Close pairing").click();
    await page.keyboard.press("Escape");
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await b("Open Mail").click();
    await b("Notepad").click();
    await b("Memo", page.getByRole("dialog")).click();
    await b("Write a memo").click();
    await b("Phone", kb).click();
    await geometry("system-phone");
    await b("Phone 123 mode", kb).click();
    await geometry("system-phone-numeric");
    await kb.locator(".is-phone-key").first().click();
    check(
      `${width}: phone numeric types digit`,
      (await kb.locator(".wii-keyboard-input").inputValue()).endsWith("1"),
    );
    await b("Phone abc mode", kb).click();
    check(
      `${width}: phone restores letter group`,
      (await kb.locator(".wii-keyboard-key--2").innerText()) === "abc",
    );
    await b("Phone ABC mode", kb).click();
    await kb.locator(".wii-keyboard-key--2").click();
    check(
      `${width}: phone uppercase click`,
      (await kb.locator(".wii-keyboard-input").inputValue()).endsWith("A"),
    );
    await b("More", kb).click();
    await geometry("system-phone-accents");
    await b("More", kb).click();
    await b("Phone abc mode", kb).click();
    await b("QWERTY", kb).click();
    await kb.locator(".wii-keyboard-input").fill("Real keyboard");
    await page.keyboard.press("End");
    await page.keyboard.type(" works");
    check(
      `${width}: physical keyboard types`,
      (await kb.locator(".wii-keyboard-input").inputValue()) ===
        "Real keyboard works",
    );
    await b("OK", kb).click();
    await b("Post", page.getByRole("dialog")).click();
    await b("OK", page.getByRole("dialog")).click();
    await b("Open Memo from Memo").click();
    await geometry("letter-open");
    await b("Erase letter").click();
    await b("No", page.getByRole("dialog")).click();
    await b("Back", page.getByRole("dialog")).click();
    check(
      `${width}: letter erase cancellation preserves message`,
      (await state()).messages.some((m) => m.preview === "Real keyboard works"),
    );
    await context.close();
  }
} finally {
  await fs.writeFile(
    `${output}/results.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
assert.deepEqual(report.errors, []);
console.log(
  `${report.checks.length} interaction checks and ${report.geometry.length} geometry captures passed.`,
);
