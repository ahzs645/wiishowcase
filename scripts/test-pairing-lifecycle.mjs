import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
const base = "http://localhost:4964/wiishowcase/",
  report = { checks: [], errors: [] };
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", "4964", "--strictPort"],
  { stdio: "ignore" },
);
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const check = (label, value) => {
  assert.ok(value, label);
  report.checks.push(label);
  console.log("PASS", label);
};
try {
  const p = await browser.newPage({ viewport: { width: 640, height: 480 } });
  p.on("pageerror", (e) => report.errors.push(e.message));
  await p.route("**/src/lib/WebRTCConnection*", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: `window.testPeers=[];window.pairingMode='slow';export function createConnection(options){const peer={sent:[],createOffer:()=>window.pairingMode==='slow'?new Promise(resolve=>window.resolveOffer=resolve):window.pairingMode==='fail'?Promise.reject(new Error('Network setup failed.')):Promise.resolve('test-offer'),acceptAnswer:async()=>{throw new Error('Bad answer')},send(message){this.sent.push(message)},close(){this.closed=true;setTimeout(()=>options.onChannelClose(),20)},connect(){options.onStateChange('connected');options.onChannelOpen()}};window.testPeers.push(peer);return peer;}`,
    }),
  );
  const b = (name) => p.getByRole("button", { name, exact: true });
  await p.goto(`${base}?screen=menu&channelPreview=1`);
  await p.locator(".menu-slot").first().waitFor();
  await p.keyboard.press("Control+h");
  await b("Wii Remote Settings").click();
  await b("Reconnect").click();
  await p.getByText("Generating connection code...").waitFor();
  await b("Close pairing").click();
  check(
    "Closing while generating closes its reserved peer",
    await p.evaluate(() => window.testPeers[0].closed),
  );
  await p.evaluate(() => window.resolveOffer("late-offer"));
  await p.waitForTimeout(50);
  check(
    "Late offer cannot reopen or leak the closed session",
    (await p.locator(".pairing-card").count()) === 0,
  );
  await p.evaluate(() => (window.pairingMode = "fail"));
  await p.keyboard.press("Control+h");
  await b("Wii Remote Settings").click();
  await b("Reconnect").click();
  await p.getByText("Network setup failed.", { exact: true }).waitFor();
  check("Offer-generation failure reaches a retryable state", true);
  for (let i = 0; i < 4; i++) {
    await b("Retry").click();
    await p.getByText("Network setup failed.", { exact: true }).waitFor();
  }
  check(
    "Repeated failures release pending controller slots",
    await p.evaluate(() => window.testPeers.length === 6),
  );
  await p.evaluate(() => (window.pairingMode = "ready"));
  await b("Retry").click();
  await p.getByLabel("Remote answer code").fill("invalid");
  await b("Connect").click();
  await p
    .getByText(
      "That answer code could not be accepted. Please retry pairing.",
      { exact: true },
    )
    .waitFor();
  check("Invalid manual answer has a visible recovery path", true);
  await b("Retry").click();
  await p.getByLabel("Remote answer code").waitFor();
  await p.evaluate(() => window.testPeers.at(-1).connect());
  await p.getByText("Wii Remote connected!", { exact: true }).waitFor();
  check(
    "Recovery reuses Player 2 rather than leaking its slot",
    await p.evaluate(() =>
      window.testPeers
        .at(-1)
        .sent.some((m) => m.type === "welcome" && m.controllerId === 0),
    ),
  );
  await b("Close pairing").click();
  check(
    "Closing an established pairing keeps the controller connected",
    await p.evaluate(() => !window.testPeers.at(-1).closed),
  );
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  server.kill();
  await fs.writeFile(
    "docs/system-menu-refinement/pairing-lifecycle-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
