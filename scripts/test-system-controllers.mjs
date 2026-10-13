import { spawn } from "node:child_process";
import path from "node:path";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
// Exercise the actual React controls and input adapter with a deterministic
// transport. This does not claim real phone/infrared hardware coverage.
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", "4961", "--strictPort"],
  { cwd: path.resolve(import.meta.dirname, ".."), stdio: "ignore" },
);
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch("http://localhost:4961/wiishowcase/")).ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const browser = await chromium.launch({
  executablePath: process.env.SMOKE_CHROMIUM || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
page.setDefaultTimeout(8000);
page.on("console", (message) => {
  if (message.type() === "error") console.log("CONSOLE", message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400)
    console.log("HTTP", response.status(), response.url());
});
page.on("pageerror", (error) => console.log("PAGEERROR", error.message));
const checks = [];
try {
  await page.route("**/src/lib/WebRTCConnection*", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.testPeers=[];export function createConnection(options){const peer={sent:[],createOffer:async()=> 'test-offer',acceptAnswer:async()=>{},send(message){this.sent.push(message)},close(){this.closed=true;setTimeout(()=>{options.onStateChange('disconnected');options.onChannelClose()},50)},connect(){options.onStateChange('connected');options.onChannelOpen()},input(message){options.onMessage(message)}};window.testPeers.push(peer);return peer;}`,
    }),
  );
  await page.goto(
    "http://localhost:4961/wiishowcase/?screen=menu&channelPreview=1",
  );
  await page.locator(".wii-menu.visible").waitFor();
  await page.waitForTimeout(600);
  const button = (name, scope = page) =>
    scope.getByRole("button", { name, exact: true });
  const openPair = async () => {
    await page.keyboard.press("Control+h");
    await button("Wii Remote Settings").click();
    await button("Reconnect").click();
    await page.waitForFunction(() => window.testPeers.length > 0);
  };
  await openPair();
  await page.waitForTimeout(150);
  await page.evaluate(() => window.testPeers.at(-1).connect());
  await page.locator(".pairing-close").click();
  await page.keyboard.press("Control+h");
  await button("Wii Remote Settings").click();
  await button("Off", page.locator(".remote-settings-panel")).click();
  await button("On", page.locator(".remote-settings-panel")).click();
  assert.ok(
    await page.evaluate(() =>
      testPeers
        .at(-1)
        .sent.some((m) => m.type === "rumble" && m.duration === 100),
    ),
  );
  checks.push(
    "Turning rumble on after off sends a pulse through the controller transport",
  );
  await button("Reconnect").click();
  await page.waitForFunction(() => testPeers.length === 2);
  await page.waitForTimeout(100);
  await page.evaluate(() => testPeers.at(-1).connect());
  await page.locator(".pairing-close").click();
  assert.equal(
    await page.evaluate(
      () =>
        testPeers.at(-1).sent.find((m) => m.type === "welcome").controllerId,
    ),
    0,
  );
  checks.push(
    "Reconnect resets the pool and a stale close callback cannot release the new peer",
  );
  const point = async (index, buttons) => {
    const r = await page.locator(`[data-slot-index="${index}"]`).boundingBox();
    await page.evaluate(
      ({ x, y, buttons }) =>
        testPeers.at(-1).input({
          type: "state",
          pointer: { touching: true, x: x / innerWidth, y: y / innerHeight },
          buttons,
        }),
      { x: r.x + r.width / 2, y: r.y + r.height / 2, buttons },
    );
  };
  await point(1, { A: true, B: true });
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".menu-slot.is-picked").getAttribute("data-slot-index"),
    "1",
  );
  await point(10, { A: false, B: false });
  await point(10, { A: true, B: false });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wiishowcase.system.v1")).slots[10],
    ),
    "mii",
  );
  checks.push(
    "Paired A+B picks a channel and A places it without opening its banner",
  );
  await button("Done").click();
  await page.keyboard.press("Control+h");
  await page.locator(".home-menu-overlay").waitFor();
  if (await button("Wii Remote Settings").count())
    await button("Wii Remote Settings").click();
  await button("Reconnect").click();
  await page.waitForFunction(() => testPeers.length === 3);
  await page.locator(".pairing-close").click();
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => testPeers.at(-1).closed));
  checks.push("Closing a pending pairing tears down the unused connection");
  console.log("PASS", checks);
} finally {
  await fs.writeFile(
    "docs/interface-improvements/controller-results.json",
    JSON.stringify(
      {
        transport: "Deterministic browser mock; real React input/control flow",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  await browser.close();
  server.kill();
}
