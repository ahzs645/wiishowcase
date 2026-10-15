// Audit additional destinations omitted from the original 30-state regression.
// Geometry failures are recorded rather than hiding the screen that exposed them.
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";

const output = process.env.OTHER_MENU_ARTIFACTS || "docs/other-menus";
await fs.mkdir(`${output}/current`, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--port",
    "4958",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
const base = "http://localhost:4958/wiishowcase/";
const report = {
  baselineRevision: "f198c02fd8c787a5581c0957486f8b164aca6732",
  captureDate: "2026-10-14",
  fixtureTime: "2026-10-12 12:00 America/Vancouver",
  captures: [],
  errors: [],
  missing: [],
  fonts: [],
};
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const routes = [
  ["calendar-settings", "Calendar settings", 1, ["Calendar"], null],
  ["screen-settings", "Screen settings", 1, ["Screen"], null],
  [
    "screen-position",
    "Screen Position",
    1,
    ["Screen", "Screen Position"],
    "manual-341",
  ],
  [
    "tv-resolution",
    "TV Resolution",
    1,
    ["Screen", "TV Resolution"],
    "manual-352",
  ],
  [
    "burn-in",
    "Screen Burn-in Reduction",
    1,
    ["Screen", "Screen Burn-in Reduction"],
    "manual-353",
  ],
  ["sensor-bar", "Sensor Bar settings", 2, ["Sensor Bar"], null],
  [
    "sensor-position",
    "Sensor Bar Position",
    2,
    ["Sensor Bar", "Sensor Bar Position"],
    "manual-382",
  ],
  [
    "sensitivity",
    "Sensor sensitivity",
    2,
    ["Sensor Bar", "Sensitivity"],
    "manual-383",
  ],
  [
    "parental-controls",
    "Parental Controls setup",
    2,
    ["Parental Controls"],
    "manual-364",
  ],
  ["internet", "Internet settings", 2, ["Internet"], "manual-407"],
  [
    "wiiconnect24",
    "WiiConnect24",
    2,
    ["WiiConnect24", "WiiConnect24 On/Off"],
    "manual-451",
  ],
  ["connect24-menu", "WiiConnect24 settings", 2, ["WiiConnect24"], null],
  [
    "standby-downloads",
    "Standby Connection",
    2,
    ["WiiConnect24", "Standby Connection"],
    "manual-452",
  ],
  [
    "slot-illumination",
    "Slot Illumination",
    2,
    ["WiiConnect24", "Slot Illumination"],
    "manual-453",
  ],
  [
    "parental-rating",
    "Game Rating",
    2,
    ["Parental Controls", "Highest Game Rating Allowed: All ages"],
    "manual-365",
  ],
  [
    "secret-question",
    "Secret Question",
    2,
    ["Parental Controls", "Secret Question"],
    null,
  ],
  [
    "connection-profiles",
    "Connection Settings",
    2,
    ["Internet", "Connection Settings"],
    "manual-661",
  ],
  [
    "connection-type",
    "Connection Type",
    2,
    ["Internet", "Connection Settings", "Connection 1 None"],
    "manual-660",
  ],
  [
    "console-information",
    "Console Information",
    2,
    ["Internet", "Console Information"],
    null,
  ],
  [
    "user-agreements",
    "User Agreements",
    2,
    ["Internet", "User Agreements"],
    null,
  ],
  ["language", "Language", 3, ["Language"], "manual-448"],
  ["country", "Country", 3, ["Country"], "manual-450"],
  [
    "format-memory",
    "Format Wii System Memory",
    3,
    ["Format Wii System Memory"],
    "manual-447",
  ],
  [
    "format-confirm",
    "Format confirmation",
    3,
    ["Format Wii System Memory", "Format"],
    "manual-447",
  ],
  [
    "update-current",
    "System update result",
    3,
    ["Wii System Update"],
    "manual-449",
  ],
];
try {
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const mode = width / height > 1.5 ? "16:9" : "4:3";
    const context = await browser.newContext({
      viewport: { width, height },
      timezoneId: "America/Vancouver",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      report.errors.push({ width, height, error: e.message }),
    );
    page.on("response", (r) => {
      if (r.status() >= 400 && new URL(r.url()).origin === new URL(base).origin)
        report.missing.push({ url: r.url(), status: r.status() });
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
      // Test only local browser data. Seed one contact for detail/erase dialogs.
      const key = "wiishowcase.system.v1";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            slots: Array.from(
              { length: 48 },
              (_, i) =>
                [
                  "disc",
                  "mii",
                  "photo",
                  "shop",
                  "news",
                  "onliine",
                  "pokemon-ranch",
                  "forecast",
                ][i] ?? null,
            ),
            friends: [
              {
                id: "audit-friend",
                name: "Grandma",
                address: "1234567890123456",
              },
            ],
          }),
        );
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const button = (name, scope = page) =>
      scope.getByRole("button", { name, exact: true });
    const gotoSettings = async () => {
      await page.goto(`${base}?screen=settings&channelPreview=1`);
      await button("Wii Settings").waitFor();
    };
    const snap = async (
      id,
      title,
      reference = null,
      referenceRole = "same-view",
    ) => {
      await page.mouse.move(width - 1, height - 1);
      await page.waitForTimeout(250);
      await page.evaluate(() => document.fonts.ready);
      const image = `current/${id}-${width}x${height}.png`;
      await page.screenshot({ path: `${output}/${image}` });
      const geometry = await page.evaluate(interfaceGeometry);
      const elements = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            "h1,h2,.system-detail,.system-button,.system-wii-logo,.home-menu-title,.wii-keyboard-input,input,select,textarea,.system-settings-list,.system-tile,.data-grid,.data-slot,.home-menu-buttons,.message-board-memo",
          ),
        ]
          .filter(
            (e) =>
              e.getClientRects().length &&
              getComputedStyle(e).visibility !== "hidden",
          )
          .map((e) => ({
            selector:
              e.tagName.toLowerCase() + "." + [...e.classList].join("."),
            text: (e.getAttribute("aria-label") || e.innerText || "")
              .trim()
              .slice(0, 100),
            type: e.getAttribute("type"),
            fontFamily: getComputedStyle(e).fontFamily,
            fontSize: getComputedStyle(e).fontSize,
            rect: e.getBoundingClientRect().toJSON(),
          })),
      );
      const { root } = await cdp.send("DOM.getDocument");
      const fonts = [];
      for (const selector of [
        ".system-settings-shell h1",
        ".system-settings-list .system-button",
        ".system-detail",
        ".home-menu-title",
        ".system-dialog h2",
      ]) {
        const { nodeId } = await cdp.send("DOM.querySelector", {
          nodeId: root.nodeId,
          selector,
        });
        if (nodeId)
          fonts.push({
            selector,
            ...(await cdp.send("CSS.getPlatformFontsForNode", { nodeId })),
          });
      }
      report.captures.push({
        id,
        title,
        mode,
        width,
        height,
        image,
        reference,
        referenceRole,
        geometry,
        elements,
      });
      if (fonts.length) report.fonts.push({ id, width, height, fonts });
      console.log(
        `CAPTURE ${id} ${width}×${height}; ${geometry.failures.length} geometry findings`,
      );
    };
    for (const [id, title, number, labels, reference] of routes) {
      await gotoSettings();
      await button("Wii Settings").click();
      if (number !== 1) await button(`Settings page ${number}`).click();
      for (const label of labels) await button(label).click();
      if (id === "update-current")
        await page
          .getByText("There is no need to update.", { exact: false })
          .waitFor();
      await snap(
        id,
        title,
        reference,
        ["parental-controls", "format-confirm", "update-current"].includes(id)
          ? "related-state"
          : "same-view",
      );
    }
    await gotoSettings();
    await button("Data Management").click();
    await button("Save Data").click();
    await button("Nintendo GameCube").click();
    await snap(
      "gamecube-data",
      "GameCube Save Data",
      "manual-314",
      "related-view",
    );
    await gotoSettings();
    await button("Data Management").click();
    await button("Save Data").click();
    await button("Wii").click();
    await button("Wii Sports data").click();
    await snap(
      "save-selected",
      "Save Data item actions",
      "manual-314",
      "related-state",
    );
    await button("Copy", page.getByRole("dialog")).click();
    await snap(
      "save-copy-confirm",
      "Save Data Copy confirmation",
      "manual-314",
      "related-state",
    );
    await gotoSettings();
    await button("Data Management").click();
    await button("Channels").click();
    await button("Mii Channel data").click();
    await snap(
      "channel-selected",
      "Channel Data item actions",
      "manual-314",
      "related-view",
    );
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await page.locator(".menu-slot").first().waitFor();
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+h");
    await button("Operations Guide").click();
    await snap("operations-guide", "Operations Guide", null);
    await page.keyboard.press("Escape");
    await button("Wii Remote Settings").click();
    await button("Reconnect").click();
    await page.locator(".pairing-card").waitFor();
    await snap(
      "reconnect",
      "Reconnect / browser pairing",
      "manual-464",
      "browser-adaptation",
    );
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await button("Open Mail").click();
    await page.waitForTimeout(600);
    await button("Notepad").click();
    await button("Address Book", page.getByRole("dialog")).click();
    await button("Register", page.getByRole("dialog")).click();
    await snap(
      "address-register",
      "Register a friend",
      "manual-291",
      "related-state",
    );
    await button("Back", page.getByRole("dialog")).click();
    await page.getByRole("button", { name: "Grandma", exact: false }).click();
    await snap(
      "friend-details",
      "Address Book friend actions",
      "manual-278",
      "related-state",
    );
    await button("Erase", page.getByRole("dialog")).click();
    await snap(
      "friend-erase",
      "Erase friend confirmation",
      "manual-278",
      "related-state",
    );
    await page.goto(`${base}?screen=menu&channelPreview=1`);
    await button("Open Mail").click();
    await page.waitForTimeout(600);
    await button("Notepad").click();
    await button("Memo", page.getByRole("dialog")).click();
    await button("Write a memo").click();
    const keyboard = page.locator("wii-keyboard .is-open");
    await keyboard.locator(".wii-keyboard-input").fill("hel");
    await keyboard.locator('[data-action="prediction"]').first().waitFor();
    await snap(
      "keyboard-predictions",
      "System keyboard with suggestions",
      "manual-497",
    );
    await context.close();
  }
} finally {
  await fs.writeFile(
    `${output}/additional-captures.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
  server.kill();
}
