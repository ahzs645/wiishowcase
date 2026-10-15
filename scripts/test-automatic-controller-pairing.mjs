// Real HTTP signaling and real WebRTC transport through a local TCP TURN server.
// TURN_SERVER_BINARY selects an installed coturn binary; credentials are ephemeral.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { createRelayServer } from "../server/relay.mjs";
const require = createRequire(import.meta.url),
  temp = await fs.mkdtemp(path.join(os.tmpdir(), "wii-pairing-"));
const report = {
  checks: [],
  errors: [],
  http: {
    hostPolls: 0,
    companionPosts: 0,
    configRequests: 0,
    hostConfigRequests: 0,
    companionConfigRequests: 0,
  },
  transport:
    "Native Chromium WebRTC via ephemeral localhost coturn/TCP; isolated browser contexts; BroadcastChannel disabled.",
};
const check = (name, value) => {
  assert.ok(value, name);
  report.checks.push(name);
  console.log("PASS", name);
};
const password = randomUUID(),
  turnPort = 13479;
const turn = spawn(
  process.env.TURN_SERVER_BINARY || "turnserver",
  [
    "--no-cli",
    "--no-tls",
    "--no-dtls",
    "--no-udp",
    "--listening-ip=127.0.0.1",
    "--relay-ip=127.0.0.1",
    `--listening-port=${turnPort}`,
    "--min-port=49300",
    "--max-port=49330",
    "--realm=wiishowcase-test",
    `--static-auth-secret=${password}`,
    "--use-auth-secret",
    "--allow-loopback-peers",
    "--no-multicast-peers",
    "--relay-threads=1",
    `--pidfile=${temp}/turn.pid`,
    `--log-file=${temp}/turn.log`,
  ],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      ...(process.env.TURN_LIBRARY_PATH
        ? { LD_LIBRARY_PATH: process.env.TURN_LIBRARY_PATH }
        : {}),
    },
  },
);
let turnError;
turn.on("error", (error) => {
  turnError = error;
});
const relay = createRelayServer({
  allowedOrigins: ["http://localhost:4963"],
  turn: {
    urls: [`turn:127.0.0.1:${turnPort}?transport=tcp`],
    sharedSecret: password,
    relayOnly: true,
  },
});
await new Promise((resolve) => relay.listen(0, "127.0.0.1", resolve));
const relayOrigin = `http://127.0.0.1:${relay.address().port}`;
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--port", "4963", "--strictPort"],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      VITE_RTC_CONFIG_URL: `${relayOrigin}/api/rtc-config`,
      VITE_SIGNALING_RELAY_URL: `${relayOrigin}/api/signal`,
    },
  },
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const base = "http://localhost:4963/wiishowcase/";
try {
  for (let i = 0; i < 100; i++) {
    if (turnError) throw turnError;
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const makeContext = async (viewport, companion = false) => {
    const context = await browser.newContext({ viewport, hasTouch: companion });
    await context.addInitScript(() => {
      window.BroadcastChannel = class {
        constructor() {
          throw new Error("Isolated pairing test");
        }
      };
      const NativePC = window.RTCPeerConnection;
      window.testPCs = [];
      window.RTCPeerConnection = class extends NativePC {
        constructor(config) {
          super(config);
          window.testPCs.push(this);
        }
      };
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    p.on("request", (req) => {
      if (req.url().includes("/api/rtc-config") && req.method() === "GET") {
        report.http.configRequests++;
        if (companion) report.http.companionConfigRequests++;
        else report.http.hostConfigRequests++;
      }
      if (req.url().includes("/api/signal/")) {
        if (req.method() === "GET") report.http.hostPolls++;
        if (req.method() === "POST") report.http.companionPosts++;
      }
    });
    return { context, page: p };
  };
  const host = await makeContext({ width: 640, height: 480 });
  const h = host.page;
  await h.goto(`${base}?screen=menu&channelPreview=1`);
  await h.locator(".menu-slot").first().waitFor();
  await h.keyboard.press("Control+h");
  await h
    .getByRole("button", { name: "Wii Remote Settings", exact: true })
    .click();
  await h.getByRole("button", { name: "Reconnect", exact: true }).click();
  await h.locator(".pairing-qr svg").waitFor({ timeout: 25000 });
  await h.addScriptTag({
    content: await fs.readFile(require.resolve("jsqr"), "utf8"),
  });
  const png = await h.locator(".pairing-qr").screenshot();
  let url = await h.evaluate(
    async (source) => {
      const im = new Image();
      im.src = source;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(im, 0, 0);
      return jsQR(
        ctx.getImageData(0, 0, c.width, c.height).data,
        c.width,
        c.height,
      )?.data;
    },
    `data:image/png;base64,${png.toString("base64")}`,
  );
  check(
    "Rendered 480-line QR with real network candidates decodes",
    url?.includes("#/companion/"),
  );
  const target = new URL(url);
  target.host = new URL(base).host;
  const companion = await makeContext({ width: 390, height: 844 }, true),
    c = companion.page;
  await c.goto(target.href);
  await h
    .getByText("Wii Remote connected!", { exact: true })
    .waitFor({ timeout: 25000 });
  await c.locator(".companion-active").waitFor();
  check("Automatic HTTP exchange connects isolated host and companion", true);
  check(
    "Both peers fetched temporary TURN credentials from the actual cross-origin service",
    report.http.hostConfigRequests > 0 &&
      report.http.companionConfigRequests > 0,
  );
  check(
    "Automatic path used GET and POST",
    report.http.hostPolls > 0 && report.http.companionPosts > 0,
  );
  check(
    "Host answer field was never filled",
    (await h.getByLabel("Remote answer code").count()) === 0,
  );
  report.connections = {
    host: await h.evaluate(() => window.testPCs.at(-1).connectionState),
    companion: await c.evaluate(() => window.testPCs.at(-1).connectionState),
  };
  check(
    "Both native peer connections are connected",
    report.connections.host === "connected" &&
      report.connections.companion === "connected",
  );
  check(
    "Companion receives Player 2 assignment",
    (await c.locator(".companion-player-badge").innerText()) === "Player 2",
  );
  await fs.mkdir("docs/system-menu-refinement", { recursive: true });
  await h.screenshot({
    path: "docs/system-menu-refinement/automatic-pairing-connected.png",
  });
  await c.screenshot({
    path: "docs/system-menu-refinement/automatic-companion-connected.png",
  });
  await h.getByRole("button", { name: "Close pairing", exact: true }).click();
  const home = c.locator(".companion-btn-home");
  await home.dispatchEvent("touchstart");
  await new Promise((r) => setTimeout(r, 150));
  await home.dispatchEvent("touchend");
  await h.locator(".home-menu-overlay").waitFor();
  check("Actual companion HOME input reaches host over data channel", true);
  await c.getByRole("button", { name: "Disconnect", exact: true }).click();
  await h.waitForFunction(() =>
    document.querySelector('[aria-label="Player 2: not connected"]'),
  );
  check("Disconnect removes the paired controller", true);
  await host.context.close();
  await companion.context.close();
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  vite.kill();
  turn.kill();
  relay.closeAllConnections();
  await new Promise((resolve) => relay.close(resolve));
  await fs.writeFile(
    "docs/system-menu-refinement/automatic-pairing-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await fs.rm(temp, { recursive: true, force: true });
}
