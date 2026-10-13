import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";
const root = path.resolve(import.meta.dirname, "..");
const isSizing = process.env.SYSTEM_SIZING || process.argv.includes("--sizing");
const output =
  process.env.SYSTEM_ARTIFACTS ||
  path.join(
    root,
    isSizing ? "docs/interface-sizing" : "docs/interface-improvements",
  );
await fs.mkdir(path.join(output, "after"), { recursive: true });
const port = 4956,
  base = `http://localhost:${port}/wiishowcase/`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--port",
    String(port),
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = {
  captureDate: "Fixed test time: 2026-10-12 12:00 America/Vancouver",
  captures: [],
  checks: [],
  errors: [],
  missing: [],
};
const sizing = [];
if (isSizing) await fs.mkdir(path.join(output, "native"), { recursive: true });
const check = (label, value) => {
  assert.ok(value, label);
  results.checks.push(label);
  console.log("PASS", label);
};
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  for (const [width, height] of [
    [960, 720],
    [1280, 720],
  ]) {
    const mode = width === 960 ? "4:3" : "16:9",
      context = await browser.newContext({
        viewport: { width, height },
        timezoneId: "America/Vancouver",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) =>
      results.errors.push({ mode, message: e.message }),
    );
    page.on("response", (res) => {
      if (res.status() >= 400 && !res.url().endsWith("favicon.ico"))
        results.missing.push({ mode, url: res.url(), status: res.status() });
    });
    await page.addInitScript(() => {
      const OriginalDate = Date;
      window.Date = class extends OriginalDate {
        constructor(...args) {
          super(...(args.length ? args : ["2026-10-12T19:00:00Z"]));
        }
        static now() {
          return new OriginalDate("2026-10-12T19:00:00Z").getTime();
        }
      };
    });
    const snap = async (
      id,
      title,
      reference,
      before = "options",
      note = "",
    ) => {
      await page.mouse.move(width - 3, height - 3);
      await page.waitForTimeout(650);
      await page.evaluate(() => document.fonts.ready);
      const image = `after/${id}-${width}x${height}.png`;
      await page.screenshot({ path: path.join(output, image) });
      if (isSizing) {
        const inspect = async (scale) => {
          const geometry = await page.evaluate(interfaceGeometry);
          sizing.push({ id, mode, scale, ...geometry });
          assert.deepEqual(
            geometry.failures,
            [],
            `${id} ${mode} ${scale}: visible text and controls fit and receive pointer hits`,
          );
        };
        await inspect("720-line");
        const nativeWidth = width === 960 ? 640 : 854;
        await page.setViewportSize({ width: nativeWidth, height: 480 });
        await page.mouse.move(nativeWidth - 3, 477);
        await page.waitForTimeout(350);
        await inspect("480-line");
        await page.screenshot({
          path: path.join(output, `native/${id}-${nativeWidth}x480.png`),
        });
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(350);
      }
      results.captures.push({
        id,
        title,
        mode,
        width,
        height,
        image,
        reference,
        before,
        note,
      });
    };
    const button = (name, scope = page) =>
      scope.getByRole("button", { name, exact: true });
    const state = () =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("wiishowcase.system.v1")),
      );
    const backSettings = () =>
      page.locator(".system-settings-shell footer button").click();
    const keyboard = page.locator("wii-keyboard .is-open");
    const typeKeyboard = async (value, multiline = false) => {
      await keyboard.waitFor();
      await page.waitForTimeout(150);
      await keyboard.locator(".wii-keyboard-input").fill(value);
      await button("OK", keyboard).click();
      await keyboard.waitFor({ state: "detached" });
    };
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[data-channel-target="icon"]')].every(
          (el) => el.dataset.channelReady === "true",
        ),
      null,
      { timeout: 90000 },
    );
    await page.waitForTimeout(4000);
    check(
      `${mode}: 48 slots across four pages`,
      (await page.locator(".menu-slot").count()) === 48,
    );
    await snap(
      "menu-settled",
      "Wii Menu",
      mode === "4:3" ? "copetti-home" : "nintendo-menu-2",
      "menu-settled",
      "Channel art and animation phases differ. Compare the shell proportions.",
    );
    await button("Move channels").click();
    await page.locator('[data-slot-index="0"]').click();
    check(
      `${mode}: fixed Disc cannot be picked`,
      (await page.locator(".is-picked").count()) === 0,
    );
    await page.locator('[data-slot-index="1"]').click();
    await page
      .locator(".channel-holder-wrapper > .channel-page-arrow-next")
      .click();
    await page.waitForTimeout(450);
    await page
      .locator(".channel-holder-wrapper > .channel-page-arrow-next")
      .click();
    await page.waitForTimeout(450);
    await page.locator('[data-slot-index="25"]').click();
    check(
      `${mode}: reordering across pages preserves fixed Disc`,
      (await state()).slots[25] === "mii" &&
        (await state()).slots[0] === "disc",
    );
    await snap(
      "menu-page-three",
      "Channel moved to page three",
      "nintendo-menu-1",
      "menu-page-two",
      "Before had two pages. Drag, right-click, Move channels and paired A+B select a channel to move.",
    );
    await button("Done").click();
    await page.reload();
    await page.waitForTimeout(1000);
    check(
      `${mode}: channel layout survives reload`,
      (await state()).slots[25] === "mii",
    );
    // Return Mii to its original slot using a real drag operation.
    for (let i = 0; i < 2; i++) {
      await page
        .locator(".channel-holder-wrapper > .channel-page-arrow-next")
        .click();
      await page.waitForTimeout(450);
    }
    await page.locator('[data-slot-index="25"]').dispatchEvent("dragstart", {
      dataTransfer: await page.evaluateHandle(() => new DataTransfer()),
    });
    // Explicit pick/place gives an accessible equivalent across page boundaries.
    await button("Move channels").click();
    await page.locator('[data-slot-index="25"]').click();
    for (let i = 0; i < 2; i++) {
      await page
        .locator(".channel-holder-wrapper > .channel-page-arrow-prev")
        .click();
      await page.waitForTimeout(450);
    }
    await page.locator('[data-slot-index="1"]').click();
    await button("Done").click();
    check(
      `${mode}: original layout restored`,
      (await state()).slots[1] === "mii",
    );
    await button("Open Settings").click();
    await snap("options", "Wii Options", "manual-316", "options");
    await button("Data Management").click();
    await snap(
      "data-root",
      "Data Management",
      "manual-315",
      "options",
      "Before this destination had no handler.",
    );
    await button("Save Data").click();
    await snap(
      "save-chooser",
      "Save Data platforms",
      "manual-312",
      "options",
      "Before this destination had no handler.",
    );
    await button("Wii").click();
    await snap(
      "save-grid",
      "Wii Save Data",
      "manual-314",
      "options",
      "Browser save entries; no physical console memory is read.",
    );
    await button("Wii Sports data").click();
    await button("Copy", page.getByRole("dialog")).click();
    await button("Yes", page.getByRole("dialog")).click();
    await button("SD Card").click();
    check(
      `${mode}: save-data copy reaches SD`,
      (await button("Wii Sports data").count()) === 1,
    );
    await button("Wii Sports data").click();
    await button("Erase", page.getByRole("dialog")).click();
    await button("No", page.getByRole("dialog")).click();
    await button("Back", page.getByRole("dialog")).click();
    check(
      `${mode}: erase cancellation preserves save`,
      (await state()).saves.length === 2,
    );
    await backSettings();
    await backSettings();
    await button("Channels").click();
    await snap(
      "channels-data",
      "Channel Data Management",
      "manual-314",
      "options",
      "Before this destination had no handler.",
    );
    await button("Mii Channel data").click();
    await button("Move", page.getByRole("dialog")).click();
    await button("Yes", page.getByRole("dialog")).click();
    check(
      `${mode}: channel moves from Wii to SD`,
      !(await state()).slots.includes("mii") &&
        (await state()).sd.includes("mii"),
    );
    await backSettings();
    await backSettings();
    await backSettings();
    await button("SD Card Menu").click();
    await page.waitForTimeout(900);
    await snap(
      "sd-menu",
      "SD Card Menu",
      "manual-472",
      "menu-settled",
      "Before the SD button and flow were absent. 240 slots across twenty pages.",
    );
    await page.locator(".sd-menu-grid .is-clickable").click();
    await snap(
      "sd-start",
      "SD Channel controls",
      "manual-474",
      "menu-settled",
      "Start opens the existing banner preview. Copy restores a Wii Menu entry.",
    );
    await button("Copy to Wii Menu", page.getByRole("dialog")).click();
    check(
      `${mode}: copying from SD restores menu and retains SD`,
      (await state()).slots.includes("mii") &&
        (await state()).sd.includes("mii"),
    );
    await button("Back", page.getByRole("dialog")).click();
    await button("Wii Menu", page.locator(".system-sd-screen")).click();
    await button("Open Settings").click();
    await button("Wii Settings").click();
    await snap(
      "settings-one",
      "Wii System Settings 1",
      mode === "4:3" ? "copetti-settings" : "settings-wii-guide",
      "options",
      "Before Settings was an unwired Options tile.",
    );
    await button("Console Nickname").click();
    await button("Wii", page.locator(".system-detail")).click();
    await typeKeyboard("Test Wii");
    check(
      `${mode}: nickname saved by real keyboard flow`,
      (await state()).settings.nickname === "Test Wii",
    );
    await snap("nickname", "Console Nickname", "manual-338", "options");
    await backSettings();
    await button("Calendar", page.locator(".system-settings")).click();
    await button("Date", page.locator(".system-settings")).click();
    await page.getByLabel("Console date").fill("2026-10-13");
    await button("Confirm").click();
    check(
      `${mode}: date setting updates offset`,
      (await state()).settings.timeOffset === 86400000,
    );
    await snap("date", "Console Date", "manual-339", "options");
    await backSettings();
    await button("Time", page.locator(".system-settings")).click();
    await page.getByLabel("Console time").fill("14:30");
    await button("Confirm").click();
    await snap("time", "Console Time", "manual-340", "options");
    await backSettings();
    await backSettings();
    await button("Screen").click();
    await button("Screen Position").click();
    await button("Right").click();
    check(
      `${mode}: screen position saved`,
      (await state()).settings.screenX === 1,
    );
    await button("Reset position").click();
    await backSettings();
    await button("Widescreen Settings").click();
    await snap("widescreen", "Widescreen Settings", "manual-342", "options");
    await button(
      mode === "4:3" ? "Widescreen (16:9)" : "Standard (4:3)",
    ).click();
    check(
      `${mode}: aspect preference changes channel mask class`,
      (await page.locator(mode === "4:3" ? ".wii-169" : ".wii-43").count()) ===
        1,
    );
    await button("Automatic").click();
    await backSettings();
    await backSettings();
    await button("Sound").click();
    await button("Mono").click();
    check(
      `${mode}: mono preference saved`,
      (await state()).settings.sound === "Mono",
    );
    await snap("sound", "Sound", "manual-354", "options");
    await button("Stereo").click();
    await backSettings();
    await button("Settings page 2").click();
    await snap(
      "settings-two",
      "Wii System Settings 2",
      "manual-327",
      "options",
    );
    await button("Sensor Bar").click();
    await button("Sensitivity").click();
    await page.getByLabel("Sensor sensitivity").fill("4");
    check(
      `${mode}: sensitivity saved`,
      (await state()).settings.sensorSensitivity === 4,
    );
    await backSettings();
    await backSettings();
    await button("Parental Controls").click();
    await page.getByLabel("New parental PIN").fill("1234");
    await button("Enable").click();
    await backSettings();
    await button("Internet").click();
    await page.getByLabel("Internet parental PIN").fill("0000");
    await button("Unlock").click();
    check(
      `${mode}: incorrect PIN does not unlock Internet`,
      (await button("Online channel data is off").count()) === 0,
    );
    await page.getByLabel("Internet parental PIN").fill("1234");
    await button("Unlock").click();
    await button("Online channel data is off").click();
    check(
      `${mode}: correct PIN permits Internet preference`,
      (await state()).settings.internet === true,
    );
    await backSettings();
    await button("Settings page 3").click();
    await snap(
      "settings-three",
      "Wii System Settings 3",
      "manual-328",
      "options",
    );
    await button("Language").click();
    await button("French").click();
    check(
      `${mode}: language is persisted`,
      (await state()).settings.language === "French",
    );
    await button("English").click();
    await backSettings();
    await button("Wii System Update").click();
    await page.waitForTimeout(600);
    await page.keyboard.press("Escape"); // update panel has own close handler
    const updateClose = page
      .locator(".wii-system-update-screen button")
      .filter({ hasText: /Back|Cancel|OK/ })
      .first();
    if (await updateClose.count()) await updateClose.click();
    // Navigate directly to Menu; all saved data survives reload and modal state resets.
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await page.waitForTimeout(700);
    await page.keyboard.press("Control+h");
    await snap(
      "home-menu",
      "HOME Menu",
      "manual-461",
      "home-menu",
      "Operations Guide is adapted to this application. Battery capacity is unavailable for browser controllers.",
    );
    await button("Wii Remote Settings").click();
    await snap(
      "remote-settings",
      "Wii Remote Settings",
      "manual-462",
      "home-menu",
      "Before this label had no action. Volume affects interface sound; rumble sends haptic messages to paired companions.",
    );
    await button("Decrease remote volume").click();
    await button("Off", page.locator(".remote-settings-panel")).click();
    check(
      `${mode}: remote volume and rumble persist`,
      Math.abs((await state()).settings.remoteVolume - 0.4) < 0.001 &&
        (await state()).settings.rumble === false,
    );
    await button("Close Wii Remote Settings").click();
    await button("Operations Guide").click();
    check(
      `${mode}: guide opens`,
      await page.locator(".home-operations-guide").isVisible(),
    );
    await page.keyboard.press("Escape");
    await button("⌂ Close").click();
    await button("Open Mail").click();
    await page.waitForTimeout(700);
    await snap(
      "message-board",
      "Message Board",
      "copetti-mail",
      "message-board",
    );
    await button("Notepad").click();
    await snap(
      "create-message",
      "Create Message",
      "manual-268",
      "message-board",
      "Before Notepad had no action.",
    );
    await button("Memo", page.getByRole("dialog")).click();
    await snap(
      "memo-composer",
      "Memo composer",
      "manual-265",
      "message-open-memo",
      "Before only sample letters could be read.",
    );
    await button("Write a memo").click();
    await snap(
      "system-keyboard",
      "System QWERTY keyboard",
      "manual-497",
      "keyboard",
      "Before shows the Shop-profile harness, which remains intact. System profile is now integrated into composition.",
    );
    await keyboard.locator(".wii-keyboard-input").fill("hel");
    check(
      `${mode}: word suggestions present for messages`,
      (await keyboard.locator('[data-action="prediction"]').count()) > 0,
    );
    await keyboard.locator('[data-action="prediction"]').first().click();
    await button("Return", keyboard).click();
    await keyboard.locator(".wii-keyboard-key--shift").click();
    check(
      `${mode}: system Shift switches symbols`,
      (await keyboard.locator(".wii-keyboard-key--q").innerText()) !== "q",
    );
    await keyboard.locator(".wii-keyboard-key--shift").click();
    await button("More", keyboard).click();
    await snap(
      "system-symbols",
      "System accent palette",
      "manual-497",
      "keyboard",
      "Accent palette and language selection are additions to the system profile.",
    );
    await button("More", keyboard).click();
    await button("Phone", keyboard).click();
    await snap(
      "system-phone",
      "System phone keyboard",
      "manual-496",
      "keyboard",
      "Phone keys cycle through the shown characters on repeated clicks.",
    );
    const phoneBase = await keyboard
      .locator(".wii-keyboard-key--2")
      .innerText();
    await keyboard.locator(".wii-keyboard-key--shift").click();
    check(
      `${mode}: phone Shift switches groups`,
      (await keyboard.locator(".wii-keyboard-key--2").innerText()) !==
        phoneBase,
    );
    await keyboard.locator(".wii-keyboard-key--shift").click();
    await button("More", keyboard).click();
    check(
      `${mode}: phone More exposes accents`,
      (await keyboard.locator(".wii-keyboard-key--1").innerText()) === "àâæ",
    );
    await button("More", keyboard).click();
    await button("QWERTY", keyboard).click();
    await typeKeyboard("Hello Wii\nSecond line", true);
    await button("＋ Add a Mii").click();
    await button("Post", page.getByRole("dialog")).click();
    check(
      `${mode}: memo creation persists multiline and Mii`,
      (await state()).messages.some(
        (m) => m.lines?.[1]?.text === "Second line" && m.miiDataUrl,
      ),
    );
    await button("OK", page.getByRole("dialog")).click();
    await page.getByRole("button", { name: "Open Memo from Memo" }).click();
    await snap(
      "message-open-memo",
      "Opened Memo",
      "nwr-43",
      "message-open-memo",
    );
    await page.keyboard.press("Escape");
    check(
      `${mode}: Escape closes memo before board`,
      (await page.locator(".message-board-screen.visible").count()) === 1 &&
        (await page.locator(".message-board-opened").count()) === 0,
    );
    await button("Calendar").click();
    await page.waitForTimeout(650);
    await snap(
      "calendar",
      "Message Board Calendar",
      "manual-257",
      "calendar",
      "Stored messages decorate dates; the highlighted day follows the console calendar setting. The reference is a cropped illustration.",
    );
    check(
      `${mode}: calendar highlights the configured console day`,
      (await page.locator(".wii-calendar-td-today").innerText()) === "13",
    );
    const calendarFocus = [];
    for (let tab = 0; tab < 6; tab++) {
      await page.keyboard.press("Tab");
      calendarFocus.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          return (
            el === document.body ||
            Boolean(
              el.closest(".wii-menu-calendar-wrapper,.calendar-back-track"),
            )
          );
        }),
      );
    }
    check(
      `${mode}: Tab skips covered board and off-screen footer controls`,
      calendarFocus.every(Boolean),
    );
    await page
      .locator(".wii-menu-calendar-wrapper .wii-calendar-td-today")
      .click();
    await page.waitForTimeout(650);
    await button("Notepad").click();
    await button("Address Book", page.getByRole("dialog")).click();
    await snap(
      "address-book",
      "Address Book",
      "manual-278",
      "message-board",
      "Before this flow was absent. Five contacts per page, twenty pages.",
    );
    await button("Register", page.getByRole("dialog")).click();
    await button("Enter nickname").click();
    await typeKeyboard("Grandma");
    await button("Enter address").click();
    await typeKeyboard("1234 5678 9012 3456");
    await button("Register friend").click();
    check(
      `${mode}: Address Book registration persists`,
      (await state()).friends.some((f) => f.name === "Grandma"),
    );
    await button("Grandma", page.locator(".address-book-list")).click();
    await button("Create Letter", page.getByRole("dialog")).click();
    await button("Write a letter").click();
    await typeKeyboard("See you tomorrow.");
    await snap(
      "letter-composer",
      "Letter composer",
      "manual-265",
      "message-board",
      "Letter saves locally; no delivery through Nintendo services.",
    );
    await button("Save Letter", page.getByRole("dialog")).click();
    await button("OK", page.getByRole("dialog")).click();
    check(
      `${mode}: letter saved to selected friend`,
      (await state()).messages.some(
        (m) => m.recipient === "Grandma" && m.delivery === "local",
      ),
    );
    await page
      .getByRole("button", {
        name: "Open Invitation from Test Wii",
        exact: true,
      })
      .last()
      .click();
    await snap(
      "letter-open",
      "Opened letter actions",
      "manual-254",
      "message-open",
      "Before Back, Reply and Erase actions were absent.",
    );
    await button("Reply", page.locator(".message-board-memo")).click();
    await button("Write a letter").click();
    await typeKeyboard("Reply saved.");
    await button(
      "Save Letter",
      page.getByRole("dialog", { name: "Letter", exact: true }),
    ).click();
    await button(
      "OK",
      page.getByRole("dialog", { name: "Letter", exact: true }),
    ).click();
    check(
      `${mode}: reply links to original letter`,
      (await state()).messages.some((m) => m.replyTo),
    );
    await button("Erase letter", page.locator(".message-board-memo")).click();
    await button(
      "No",
      page.getByRole("dialog", { name: "Erase letter", exact: true }),
    ).click();
    const count = (await state()).messages.length;
    await button("Erase letter", page.locator(".message-board-memo")).click();
    await button(
      "Yes",
      page.getByRole("dialog", { name: "Erase letter", exact: true }),
    ).click();
    check(
      `${mode}: confirmed erase removes one letter`,
      (await state()).messages.length === count - 1,
    );
    await page.reload();
    await page.waitForTimeout(700);
    check(
      `${mode}: messages, friends and settings survive reload`,
      (await state()).friends.length === 1 &&
        (await state()).settings.nickname === "Test Wii" &&
        (await state()).messages.some((m) => m.replyTo),
    );
    // Native display checks are separate from the common-height visual comparisons.
    await page.goto(`${base}?screen=settings&channelPreview=1`);
    await page.setViewportSize({
      width: width === 960 ? 640 : 854,
      height: 480,
    });
    await page.waitForTimeout(650);
    const hits = await page.locator(".system-tile").evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label: el.innerText,
          inside:
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight,
          hit: el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          ),
        };
      }),
    );
    check(
      `${mode}: native-size Options bounds and centre hits`,
      hits.every((x) => x.inside && x.hit),
    );
    results.checks.push({
      mode,
      nativeSize: width === 960 ? "640×480" : "854×480",
      hits,
    });
    // Reversible destructive-action flow: cancellation first, then confirmed local reset.
    await button("Wii Settings").click();
    await button("Settings page 3").click();
    await button("Format Wii System Memory").click();
    await button("Format").click();
    await button(
      "Back",
      page.getByRole("dialog", {
        name: "Format Wii System Memory",
        exact: true,
      }),
    ).click();
    check(
      `${mode}: format cancellation preserves local records`,
      (await state()).friends.length === 1,
    );
    await button("Format").click();
    await button("Erase saved data", page.getByRole("dialog")).click();
    check(
      `${mode}: confirmed format clears records and restores defaults`,
      (await state()).friends.length === 0 &&
        (await state()).messages.length === 0 &&
        (await state()).settings.nickname === "Wii",
    );
    await page.keyboard.press("Control+h");
    await button("Reset", page.locator(".home-menu-overlay")).click();
    await page.waitForTimeout(1400);
    check(
      `${mode}: HOME Reset reaches safety instead of stalling on black`,
      (await page.locator(".safety-screen.visible").count()) === 1,
    );
    await page.keyboard.press("a");
    await page.waitForTimeout(650);
    await button("SD Card Menu").click();
    await page.keyboard.press("Escape");
    check(
      `${mode}: Escape closes SD Menu`,
      (await page.locator(".system-sd-screen").count()) === 0,
    );
    await button("Open Mail").click();
    await page.waitForTimeout(600);
    await button("Notepad").click();
    await button("Memo", page.getByRole("dialog")).click();
    await button("Write a memo").click();
    await page.waitForTimeout(600);
    await page.mouse.move(0, 0);
    const keyHits = await keyboard
      .locator("button:not([hidden])")
      .evaluateAll((elements) =>
        elements.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            label: el.getAttribute("aria-label") || el.innerText,
            inside:
              r.left >= 0 &&
              r.top >= 0 &&
              r.right <= innerWidth &&
              r.bottom <= innerHeight,
            hit: el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            ),
          };
        }),
      );
    check(
      `${mode}: system keyboard keys fit and receive pointer hits at native size`,
      keyHits.every((key) => key.inside && key.hit),
    );
    await context.close();
  }
  check("No browser page errors", results.errors.length === 0);
  check("No missing production assets", results.missing.length === 0);
} finally {
  if (isSizing)
    await fs.writeFile(
      path.join(output, "sizing-checks.json"),
      JSON.stringify(sizing, null, 2) + "\n",
    );
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
