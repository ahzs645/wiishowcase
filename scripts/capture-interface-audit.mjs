import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const output = path.join(root, "docs/interface-audit");
await fs.mkdir(path.join(output, "current"), { recursive: true });
const base = process.env.INTERFACE_BASE || "http://localhost:4950/wiishowcase/";
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  captureDate: "Fixed test time: 2026-10-12 12:00 America/Vancouver",
  captures: [],
  behavior: [],
};
try {
  for (const [mode, width] of [
    ["4:3", 960],
    ["16:9", 1280],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height: 720 },
      timezoneId: "America/Vancouver",
    });
    await page.clock.setFixedTime(new Date("2026-10-12T12:00:00-07:00"));
    const errors = [],
      missing = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) missing.push(response.url());
    });
    const load = async (screen) => {
      await page.goto(`${base}?screen=${screen}&channelPreview=1`);
      await page.waitForTimeout(700);
    };
    const capture = async (id, note = "") => {
      await page.mouse.move(1, 1);
      await page.waitForTimeout(250);
      const image = `current/${id}-${width}x720.png`;
      await page.screenshot({ path: path.join(output, image) });
      report.captures.push({ id, mode, width, height: 720, image, note });
      console.log(`${mode}: ${id}`);
    };
    await load("safety");
    await capture("safety");
    await load("menu");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-channel-target="icon"]')].every(
          (el) => el.dataset.channelReady === "true",
        ),
      null,
      { timeout: 90000 },
    );
    await capture(
      "menu",
      "Eight-channel presentation preview; Forecast is opt-in.",
    );
    await page.waitForTimeout(4000);
    await capture(
      "menu-settled",
      "Four seconds after all icon renderers reported ready; animation phases are not synchronized to references.",
    );
    const card = page.locator('[data-channel-index="3"]');
    await card.hover();
    await page.waitForTimeout(150);
    await page.screenshot({
      path: path.join(output, `current/menu-shop-hover-${width}x720.png`),
    });
    report.captures.push({
      id: "menu-shop-hover",
      mode,
      width,
      height: 720,
      image: `current/menu-shop-hover-${width}x720.png`,
    });
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.waitForTimeout(700);
    await capture("menu-page-two");
    await page
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await page.waitForTimeout(700);
    await page
      .getByRole("button", { name: "Open Settings", exact: true })
      .click();
    await page.waitForTimeout(500);
    await capture("options");
    for (const name of ["Data Management", "Wii Settings"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.waitForTimeout(200);
      report.behavior.push({
        mode,
        control: name,
        stayedOnOptions: await page.locator(".wii-settings-nav").isVisible(),
      });
    }
    await page
      .getByRole("button", { name: "Wii System Update", exact: true })
      .click();
    await page.waitForTimeout(100);
    await capture("update-checking");
    await page
      .getByText("There is no need to update.", { exact: false })
      .waitFor({ timeout: 15000 });
    await capture("update-latest");
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await page.locator(".wii-settings-back").click();
    await page.waitForTimeout(500);
    await page.keyboard.press("Control+h");
    await page.waitForTimeout(500);
    await capture("home-menu");
    const remoteSettings = page.getByText("Wii Remote Settings", {
      exact: true,
    });
    await remoteSettings.click();
    await page.waitForTimeout(100);
    report.behavior.push({
      mode,
      control: "Wii Remote Settings",
      opensRemoteControls:
        (await page.getByText("Rumble", { exact: true }).count()) > 0,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open Mail", exact: true }).click();
    await page.waitForTimeout(1000);
    await page
      .locator(".message-board-card-avatar img")
      .first()
      .waitFor({ timeout: 60000 });
    await page.waitForFunction(
      () => {
        const image = document.querySelector(".message-board-card-avatar img");
        return image?.complete && image.naturalWidth > 100;
      },
      null,
      { timeout: 60000 },
    );
    await capture("message-board");
    await page.getByRole("button", { name: "Notepad", exact: true }).click();
    await page.waitForTimeout(150);
    report.behavior.push({
      mode,
      control: "Notepad",
      createMessageAvailable:
        (await page.getByText("Create a Message", { exact: true }).count()) > 0,
    });
    await page.locator(".message-board-card").first().click();
    await page.waitForTimeout(500);
    await capture("message-open");
    await page
      .locator(".message-board-opened")
      .click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(200);
    for (let day = 1; day <= 3; day++) {
      await page.locator(".board-page-arrow.channel-page-arrow-next").click();
      await page.waitForTimeout(600);
      if (day === 2) await capture("message-empty");
    }
    await page.locator(".message-board-card").first().click();
    await page.waitForTimeout(300);
    await capture(
      "message-open-memo",
      "Memo variant, matching the memo reference category; sample text and avatar differ.",
    );
    await page
      .locator(".message-board-opened")
      .click({ position: { x: 5, y: 5 } });
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.waitForTimeout(700);
    await capture("calendar");
    await load("menu");
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-channel-target="icon"]')].every(
          (el) => el.dataset.channelReady === "true",
        ),
      null,
      { timeout: 90000 },
    );
    for (const [index, id] of [
      [0, "disc"],
      [1, "mii"],
      [2, "photo"],
      [3, "shop"],
      [4, "news"],
      [6, "pokemon-ranch"],
      [7, "forecast"],
    ]) {
      await page.locator(`[data-channel-index="${index}"]`).click();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '.ch-selection.visible [data-channel-target="banner"]',
          )?.dataset.channelReady === "true",
        null,
        { timeout: 60000 },
      );
      await page.waitForTimeout(id === "shop" ? 3500 : 1000);
      await capture(
        `banner-${id}`,
        "Animation phase and channel data may differ from the online reference.",
      );
      if (id === "shop") {
        await page.getByRole("button", { name: "Start", exact: true }).click();
        await page.waitForTimeout(100);
        report.behavior.push({
          mode,
          control: "Shop Start",
          remainsInSelection:
            (await page.locator(".ch-selection.visible").count()) > 0,
        });
      }
      await page.getByRole("button", { name: "Wii Menu", exact: true }).click();
      await page.waitForTimeout(500);
    }
    // The shared component is not mounted by the Showcase's message composer.
    // Load it explicitly for a clearly labelled standalone component capture.
    await page.route("**/assets/audio/kbd_*.wav", async (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      await route.fulfill({
        contentType: "audio/wav",
        body: await fs.readFile(path.join(root, "Wii.css/assets/audio", name)),
      });
    });
    await page.addScriptTag({
      content: await fs.readFile(
        path.join(root, "Wii.css/js/wii-keyboard.js"),
        "utf8",
      ),
    });
    await page.evaluate(() => {
      const keyboard = document.createElement("wii-keyboard");
      keyboard.setAttribute("muted", "");
      document.body.append(keyboard);
      keyboard.open({ message: "Enter a message" });
    });
    await page.waitForTimeout(700);
    await capture(
      "keyboard",
      "Standalone shared component; composer integration is missing.",
    );
    assertNoErrors();
    function assertNoErrors() {
      if (errors.length) throw new Error(errors.join("\n"));
    }
    report.captures.at(-1).networkFailures = missing;
    await page.close();
  }
  await fs.writeFile(
    path.join(output, "current-results.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    `Saved ${report.captures.length} captures and ${report.behavior.length} interaction observations.`,
  );
} finally {
  await browser.close();
}
