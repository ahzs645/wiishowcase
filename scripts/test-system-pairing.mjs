// Dev server required for the source-module fixture import and React fixture.
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
const report = { checks: [], captures: [] };
const check = (label, v) => {
  assert.ok(v, label);
  report.checks.push(label);
  console.log("PASS", label);
};
try {
  if (!process.env.SD_ONLY) {
  const hostContext = await browser.newContext({
      viewport: { width: 640, height: 480 },
    }),
    host = await hostContext.newPage();
  await hostContext.addInitScript(() => {
    const PC = window.RTCPeerConnection;
    window.testPCs = [];
    window.RTCPeerConnection = class extends PC {
      constructor(...args) {
        super(...args);
        window.testPCs.push(this);
      }
    };
  });
  await host.route("**/api/signal/**", (r) =>
    r.fulfill({
      status: 404,
      contentType: "text/html",
      body: "Missing relay fixture",
    }),
  );
  await host.goto(`${base}?screen=menu&channelPreview=1`);
  await host.locator(".menu-slot").first().waitFor();
  await host.keyboard.press("Control+h");
  await host
    .getByRole("button", { name: "Wii Remote Settings", exact: true })
    .click();
  await host.getByRole("button", { name: "Reconnect", exact: true }).click();
  await host.locator(".pairing-qr svg").waitFor();
  await host
    .getByText("Automatic exchange is unavailable here.", { exact: false })
    .waitFor();
  const jsQR = await fs.readFile(
    "/workspace/miicreateor/node_modules/jsqr/dist/jsQR.js",
    "utf8",
  );
  await host.addScriptTag({ content: jsQR });
  const qrPng = await host.locator(".pairing-qr").screenshot();
  await fs.writeFile(`${output}/pairing-qr.png`, qrPng);
  const url = await host.evaluate(
    async (png) => {
      const img = new Image();
      img.src = png;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return window.jsQR(
        ctx.getImageData(0, 0, c.width, c.height).data,
        c.width,
        c.height,
      )?.data;
    },
    `data:image/png;base64,${qrPng.toString("base64")}`,
  );
  check(
    "Visible 480-line QR decodes at rendered resolution",
    url?.includes("#/companion/"),
  );
  const companionContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    companion = await companionContext.newPage();
  await companionContext.addInitScript(() => {
    const PC = window.RTCPeerConnection;
    window.testPCs = [];
    window.RTCPeerConnection = class extends PC {
      constructor(...args) {
        super(...args);
        window.testPCs.push(this);
      }
    };
  });
  await companion.route("**/api/signal/**", (r) =>
    r.fulfill({
      status: 404,
      contentType: "text/html",
      body: "Missing relay fixture",
    }),
  );
  const target = new URL(url),
    local = new URL(base);
  target.host = local.host;
  target.protocol = local.protocol;
  await companion.goto(target.href);
  const answer = companion.locator(".companion-answer-box textarea");
  await answer.waitFor({ timeout: 45000 });
  await host.getByLabel("Remote answer code").fill(await answer.inputValue());
  await host.getByRole("button", { name: "Connect", exact: true }).click();
  await host.waitForFunction(
    () => window.testPCs.at(-1)?.remoteDescription?.type === "answer",
  );
  check("Manual answer code is accepted in an isolated host context", true);
  report.manualExchange = await host.evaluate(() => {
    const pc = window.testPCs.at(-1);
    return {
      signalingState: pc.signalingState,
      connectionState: pc.connectionState,
      candidateCount: (pc.localDescription?.sdp.match(/a=candidate:/g) || [])
        .length,
    };
  });
  if (!report.manualExchange.candidateCount)
    report.manualExchange.limitation =
      "This execution environment supplies no ICE candidates, even without STUN. SDP negotiation was accepted; a connected data channel and physical-device pairing could not be verified.";
  else {
    await host
      .getByText("Wii Remote connected!", { exact: true })
      .waitFor({ timeout: 20000 });
    check("Manual exchange opens real WebRTC data channel", true);
  }
  await host.screenshot({ path: `${output}/pairing-negotiated.png` });
  await companion.screenshot({ path: `${output}/companion-negotiated.png` });
  await companionContext.close();
  await hostContext.close();
  }
  // The current eight-channel inventory cannot fill 47 unique internal slots.
  // Mount the real SD component with an in-memory future-inventory fixture.
  for (const [width, height] of [
    [640, 480],
    [854, 480],
    [960, 720],
    [1280, 720],
  ]) {
    const c = await browser.newContext({ viewport: { width, height } }),
      p = await c.newPage();
    await p.goto(`${base}?screen=menu&channelPreview=1`);
    await p.locator(".menu-slot").first().waitFor();
    await p.evaluate(async () => {
      const { default: React } =
        await import("/wiishowcase/node_modules/.vite/deps/react.js");
      const { default: ReactDOM } =
        await import("/wiishowcase/node_modules/.vite/deps/react-dom_client.js");
      const { createRoot } = ReactDOM;
      const { default: SDMenu } =
        await import("/wiishowcase/src/components/system/SDMenu.jsx");
      // A live Vite server may append a cache-busting timestamp after HMR.
      // Seed the state instance consumed by the application, not a second
      // singleton created by importing the bare URL alongside that version.
      const stateURL = performance.getEntriesByType("resource")
        .map(r => r.name)
        .find(url => new URL(url).pathname.endsWith("/src/lib/systemState.js"));
      const { updateSystem } = await import(stateURL || "/wiishowcase/src/lib/systemState.js");
      updateSystem((s) => ({
        ...s,
        sd: ["mii"],
        slots: Array.from({ length: 48 }, (_, i) =>
          i ? `future-${i}` : "disc",
        ),
      }));
      const fixture = document.createElement("div");
      document.querySelector(".wii").append(fixture);
      fixture.style.cssText = "position:absolute;inset:0;z-index:10000";
      createRoot(fixture).render(
        React.createElement(SDMenu, {
          visible: true,
          onBack() {},
          onChannel() {
            window.fixtureStarted = true;
          },
          onManage() {
            window.fixtureManaged = true;
          },
        }),
      );
    });
    await p.locator(".system-sd-screen .wii-channel-ui").first().click();
    await p.getByRole("button", { name: "Start", exact: true }).click();
    await p
      .getByRole("dialog", { name: "Wii System Memory is full", exact: true })
      .waitFor();
    await p.mouse.move(width - 1, height - 1);
    const geometry = await p.evaluate(interfaceGeometry);
    check(`${width}: SD full-menu dialog fits`, geometry.failures.length === 0);
    const image = `current/sd-memory-error-${width}x${height}.png`;
    await fs.mkdir(`${output}/current`, { recursive: true });
    await p.screenshot({ path: `${output}/${image}` });
    report.captures.push({
      id: "sd-memory-error",
      title: "SD full Wii Menu slot flow (simulated inventory)",
      mode: width / height > 1.5 ? "16:9" : "4:3",
      width,
      height,
      image,
      reference: "manual-484",
      referenceRole: "browser-adaptation",
      geometry,
    });
    await p
      .getByRole("button", { name: "Data Management", exact: true })
      .click();
    check(
      `${width}: SD full-menu management callback works`,
      await p.evaluate(
        () => window.fixtureManaged === true && window.fixtureStarted !== true,
      ),
    );
    await c.close();
  }
} finally {
  await fs.writeFile(
    `${output}/pairing-and-sd.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
