import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildOverlayReport } from "./build-keyboard-overlay-report.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shopRoot = path.resolve(
  process.argv[2] ||
    "/workspace/scratch/channel-audit/shopping/wiishopchannel.net",
);
const vectorRoot = path.resolve(
  process.argv[3] || "/workspace/scratch/keyboard-overlay-vectors",
);
const currentRoot = path.join(root, "Wii.css");
const output =
  process.env.KEYBOARD_ARTIFACTS ||
  path.join(root, "docs/shop-keyboard/key-overlays");
await fs.mkdir(path.join(output, "keys"), { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".ttf": "font/ttf",
  ".json": "application/json",
};
const harness = (implementation) =>
  `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/${implementation}/dist/wii.css"><body style="font-family:var(--wii-font-family),sans-serif"><wii-keyboard></wii-keyboard><script src="/${implementation}/js/wii-keyboard.js"></script><script>window.kbd=document.querySelector('wii-keyboard');</script>`;
const roots = {
  shop: path.join(shopRoot, "dist"),
  vector: vectorRoot,
  current: currentRoot,
  evidence: output,
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/vector" || url.pathname === "/current") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(harness(url.pathname.slice(1)));
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const [, prefix, ...parts] = pathname.split("/");
    // Shop's built site uses absolute /img, /snd and /assets URLs.
    const base = roots[prefix] || roots.shop;
    const relative = roots[prefix] ? parts.join("/") : pathname.slice(1);
    let file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) throw new Error("Invalid path");
    try {
      if (!(await fs.stat(file)).isFile()) throw new Error();
    } catch {
      if (base === roots.shop && !path.extname(relative))
        file = path.join(base, "index.html");
      else throw new Error();
    }
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(4946, "127.0.0.1", resolve));
let browser;
const report = {
  referenceSize: { width: 608, height: 456 },
  deviceScaleFactor: 2,
  vectorRevision: "64bbb99",
  currentRevision: execFileSync(
    "git",
    ["-C", currentRoot, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim(),
  captureNotes:
    "Actual browser DOM on a common neutral background; fonts and key artwork are unmodified. Key crops include a 2px margin. Overlays align the centers, preserving measured sizes. Shop confirm keys close on mousedown, so no held-open pressed screenshot is fabricated.",
  implementations: {},
  keys: [],
};
try {
  browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROMIUM,
    args: ["--no-sandbox"],
  });
  for (const implementation of ["shop", "vector", "current"]) {
    const page = await browser.newPage({
      viewport: { width: 608, height: 456 },
      deviceScaleFactor: 2,
    });
    const errors = [],
      missingKeyboardImages = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        /keyboard.*\.png/.test(decodeURIComponent(response.url()))
      )
        missingKeyboardImages.push(response.url());
    });
    await page.addInitScript(() => {
      window.keyAudio = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (this.src.includes("kbd_"))
          window.keyAudio.push(this.src.split("/").pop());
        return play.call(this);
      };
    });
    await page.goto(
      `http://127.0.0.1:4946/${implementation === "shop" ? "wiiware" : implementation}`,
    );
    const isShop = implementation === "shop";
    const selector = isShop ? "#keyboard .key" : ".wii-keyboard-key";
    const input = page.locator(isShop ? "#keyprompt" : ".wii-keyboard-input");
    const open = async () => {
      if (isShop)
        await page.getByText("Search by Game Title", { exact: true }).click();
      else
        await page.evaluate(() =>
          kbd.open({
            message: "Search by Title",
            onConfirm: (value) => (window.confirmed = value),
            onCancel: () => (window.cancelled = true),
          }),
        );
      await page.waitForTimeout(550);
      await page
        .locator(selector)
        .evaluateAll((elements) =>
          elements.forEach((el) => (el.style.visibility = "")),
        );
      if (isShop)
        await page.waitForFunction(() =>
          [...document.querySelectorAll("#keyboard img")].every(
            (img) => img.complete && img.naturalWidth > 0,
          ),
        );
      if (!isShop && implementation === "vector")
        await page.locator('[data-action="caps"]').click();
      await page.evaluate((isShop) => {
        if (isShop) {
          for (const id of [
            "keybg",
            "keygradient1",
            "keygradient2",
            "keygbg1",
            "keygbg2",
          ])
            document.getElementById(id).style.visibility = "hidden";
          document.body.style.background = "#f5f7fa";
          if (!document.querySelector("#compare-neutral")) {
            const neutral = document.createElement("div");
            neutral.id = "compare-neutral";
            Object.assign(neutral.style, {
              position: "fixed",
              inset: "0",
              background: "#f5f7fa",
              zIndex: "994",
              pointerEvents: "none",
            });
            document.body.append(neutral);
          }
        } else {
          document.querySelector(".wii-keyboard").style.background = "#f5f7fa";
          document.querySelector(".wii-keyboard-bg").style.visibility =
            "hidden";
        }
        const actions = {
          Caps: "caps",
          Shift: "shift",
          Space: "space",
          Quit: "quit",
          OK: "ok",
          Backspace: "backspace",
        };
        for (const el of document.querySelectorAll(
          isShop ? "#keyboard .key" : ".wii-keyboard-key",
        )) {
          const label = isShop
            ? el.querySelector("b.keytext")?.textContent.trim() || "Backspace"
            : el.dataset.action || el.dataset.char;
          el.dataset.testid = isShop
            ? actions[label] || label.toLowerCase()
            : label;
        }
      }, isShop);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
      await page.evaluate(() => document.fonts.ready);
    };
    await open();
    const ids = await page
      .locator(selector)
      .evaluateAll((elements) => elements.map((el) => el.dataset.testid));
    assert.equal(ids.length, 53);
    if (!report.keys.length) report.keys = ids;
    const chosen = process.env.KEY_OVERLAY_KEYS
      ? process.env.KEY_OVERLAY_KEYS.split(",")
      : ids;
    const entries = {};
    const state = async () =>
      page.evaluate(
        (isShop) => ({
          value: document.querySelector(
            isShop ? "#keyprompt" : ".wii-keyboard-input",
          ).value,
          open: isShop
            ? Number(document.querySelector("#keyboard").style.opacity) > 0.5
            : kbd.isOpen,
          audio: window.keyAudio.slice(),
        }),
        isShop,
      );
    for (let index = 0; index < chosen.length; index++) {
      const id = chosen[index];
      const el = page.getByTestId(id);
      const states = {};
      await page
        .locator(selector)
        .evaluateAll(
          (elements, id) =>
            elements.forEach(
              (el) =>
                (el.style.visibility =
                  el.dataset.testid === id ? "visible" : "hidden"),
            ),
          id,
        );
      const settle = ["ok", "quit"].includes(id) ? 250 : 100;
      const capture = async (name) => {
        const box = await el.boundingBox();
        const metrics = await el.evaluate((el, isShop) => {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            transform: style.transform,
            background: getComputedStyle(
              isShop ? el.querySelector(".keycolor") || el : el,
            ).backgroundColor,
            font: getComputedStyle(
              isShop ? el.querySelector(".keytext") || el : el,
            ).fontFamily,
            fontSize: getComputedStyle(
              isShop ? el.querySelector(".keytext") || el : el,
            ).fontSize,
          };
        }, isShop);
        const filename = `keys/${implementation}-${index}-${name}.png`;
        await page.screenshot({
          path: path.join(output, filename),
          clip: {
            x: box.x - 2,
            y: box.y - 2,
            width: box.width + 4,
            height: box.height + 4,
          },
        });
        states[name] = { ...metrics, image: filename };
      };
      await page.mouse.move(0, 0);
      await page.waitForTimeout(settle);
      await capture("idle");
      await el.hover();
      await page.waitForTimeout(settle);
      await capture("hover");
      await page.evaluate(() => (window.keyAudio = []));
      const before = await state();
      await page.mouse.down();
      await page.waitForTimeout(settle);
      const down = await state();
      if (down.open) await capture("pressed");
      else
        states.pressed = {
          ...states.hover,
          image: null,
          note: "Closes on mousedown; no held-open pressed frame",
        };
      await page.mouse.up();
      await page.waitForTimeout(100);
      const up = await state();
      if (id.length === 1) {
        assert.equal(
          up.value,
          before.value + id,
          `${implementation}: ${id} did not insert exactly once`,
        );
        assert.equal(
          down.value,
          isShop ? up.value : before.value,
          `${implementation}: unexpected activation timing`,
        );
      }
      if (["ok", "quit"].includes(id))
        assert.equal(up.open, false, `${implementation}: ${id} did not close`);
      entries[id] = {
        states,
        click: {
          before,
          down,
          up,
          activation:
            before.value !== down.value ||
            before.open !== down.open ||
            down.audio.length
              ? "mousedown"
              : "mouseup/click",
        },
      };
      if (["caps", "shift", "quit", "ok"].includes(id)) {
        if (up.open) {
          await page.keyboard.press("Escape");
          await page.waitForTimeout(550);
        }
        if (isShop && !up.open && id === "ok")
          await page.goto("http://127.0.0.1:4946/wiiware");
        await open();
      }
      if ((index + 1) % 10 === 0)
        console.log(
          `${implementation}: ${index + 1}/${chosen.length} keys captured`,
        );
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(
      missingKeyboardImages,
      [],
      "Reference keyboard images failed to load",
    );
    report.implementations[implementation] = {
      entries,
      errors,
      missingKeyboardImages,
    };
    console.log(
      `${implementation}: captured ${chosen.length} keys in idle, hover and mousedown states`,
    );
    await page.close();
  }
  const mismatches = await buildOverlayReport(output, report, browser);
  assert.deepEqual(
    mismatches,
    [],
    "Current key size or color differs from Shop",
  );
  console.log(`Saved key evidence: ${output}`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
