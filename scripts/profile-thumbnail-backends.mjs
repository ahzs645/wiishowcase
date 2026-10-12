// Compare the actual Disc/Shop thumbnail settings on both renderer backends.
// Captures six native-animation frames and three 60-redraw timing windows.
// These are renderer CPU timings under headless software WebGL, not display FPS.
// Usage: SMOKE_CHROMIUM=/usr/bin/chromium npm run profile:thumbnails
// CHANNEL_ARTIFACTS selects the output directory; CHANNEL_CPU_SLOWDOWN defaults
// to 4. No production files or settings are modified by this profiler.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 4935;
const base = `http://localhost:${port}/wiishowcase/`;
const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/vite/bin/vite.js"),
    "--port",
    `${port}`,
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
let exited = false;
server.on("exit", () => {
  exited = true;
});
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) {
    if (exited) throw new Error("Benchmark Vite server exited");
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (Date.now() > deadline)
      throw new Error("Benchmark Vite startup timed out");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const out =
    process.env.CHANNEL_ARTIFACTS ||
    (await fs.mkdtemp(path.join(os.tmpdir(), "showcase-backends-")));
  await fs.mkdir(out, { recursive: true });
  browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROMIUM || undefined,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 1100, height: 850 },
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", {
    rate: Number(process.env.CHANNEL_CPU_SLOWDOWN || 4),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/thumbnail-benchmark.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body><main></main></body></html>",
    }),
  );
  await page.goto(`${base}thumbnail-benchmark.html`);
  const result = await page.evaluate(async () => {
    const { loadRendererBundle } =
      await import("/wiishowcase/wewad/packages/wii-channel-renderer/src/bundleLoader.js");
    const { createRendererFromBundle } =
      await import("/wiishowcase/wewad/packages/wii-channel-renderer/src/bundleRenderer.js");
    document.body.innerHTML =
      '<main style="padding:30px;background:#777;font:16px sans-serif;display:flex;gap:20px;flex-wrap:wrap"></main>';
    const container = document.querySelector("main");
    const channels = {};
    for (const channel of ["disc", "shop"]) {
      const bundle = await loadRendererBundle(
        await (
          await fetch(`/wiishowcase/channels/${channel}.zip`)
        ).arrayBuffer(),
        { targets: ["icon"], audio: false },
      );
      const tests = [];
      for (const backend of ["canvas", "webgl"]) {
        const canvas = document.createElement("canvas");
        const started = performance.now();
        const { renderer } = createRendererFromBundle(canvas, bundle, "icon", {
          rendererBackend: backend,
          tevQuality: backend === "webgl" ? "accurate" : undefined,
          animOverride:
            channel === "disc" ? "arc/anim/my_DiskCh_b.brlan" : undefined,
          maxDevicePixelRatio: 1.5,
          displayAspect: "16:9",
          subframePlayback: false,
        });
        const initMs = performance.now() - started;
        const frames = [];
        const pixels = [];
        for (const f of [0, 30, 120, 240, 480, 960]) {
          renderer.renderFrame(f);
          renderer.renderFrame(f);
          const wrapper = document.createElement("div");
          wrapper.innerHTML = `${channel} ${backend} frame ${f}<br>`;
          const capture = document.createElement("canvas");
          capture.width = canvas.width;
          capture.height = canvas.height;
          capture.getContext("2d").drawImage(canvas, 0, 0);
          capture.style.width = "170px";
          wrapper.append(capture);
          container.append(wrapper);
          pixels.push([
            ...capture
              .getContext("2d")
              .getImageData(0, 0, capture.width, capture.height).data,
          ]);
        }
        for (const windowStart of [0, 240, 720]) {
          const samples = [];
          for (let f = 0; f < 60; f++) {
            const started = performance.now();
            renderer.renderFrame(windowStart + f * 3);
            samples.push(performance.now() - started);
          }
          frames.push({
            startFrame: windowStart,
            samples,
            meanMs: samples.reduce((a, b) => a + b) / samples.length,
            p95Ms: [...samples].sort((a, b) => a - b)[
              Math.floor(samples.length * 0.95)
            ],
          });
        }
        tests.push({
          backend: renderer.backend ?? "canvas",
          initMs,
          frames,
          width: canvas.width,
          height: canvas.height,
          pixels,
          glError: renderer._glState?.gl?.getError?.() ?? null,
        });
        renderer.dispose();
      }
      const [a, b] = tests;
      const error = a.pixels.map((p, i) => {
        const q = b.pixels[i];
        let sum = 0,
          max = 0,
          differingPixels = 0;
        for (let j = 0; j < p.length; j += 4) {
          let different = false;
          for (let k = 0; k < 4; k++) {
            const d = Math.abs(p[j + k] - q[j + k]);
            sum += d;
            max = Math.max(max, d);
            if (d > 8) different = true;
          }
          if (different) differingPixels++;
        }
        return {
          frame: [0, 30, 120, 240, 480, 960][i],
          meanAbsoluteError: sum / p.length,
          maxChannelError: max,
          pixelsOver8: differingPixels / (p.length / 4),
        };
      });
      channels[channel] = {
        tests: tests.map(({ pixels, ...r }) => ({
          ...r,
          timingWindows: r.frames.map(({ samples, ...window }) => window),
        })),
        errors: error,
      };
    }
    return channels;
  });
  await page.screenshot({
    path: `${out}/canvas-webgl-grid.png`,
    fullPage: true,
  });
  await fs.writeFile(
    `${out}/results.json`,
    JSON.stringify(
      {
        cpuSlowdown: Number(process.env.CHANNEL_CPU_SLOWDOWN || 4),
        channels: result,
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        channels: Object.fromEntries(
          Object.entries(result).map(([k, v]) => [
            k,
            { tests: v.tests.map(({ frames, ...r }) => r), errors: v.errors },
          ]),
        ),
        errors,
      },
      null,
      2,
    ),
  );
  console.log(`Screenshots and metrics: ${out}`);
} finally {
  await browser?.close();
  server.kill();
}
