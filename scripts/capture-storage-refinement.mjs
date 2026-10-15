import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { interfaceGeometry } from "./lib/interface-geometry.mjs";

const output = "docs/storage-menu-refinement";
await fs.mkdir(`${output}/current`, { recursive: true });
await fs.mkdir(`${output}/before`, { recursive: true });
const baseline = JSON.parse(await fs.readFile("docs/system-menu-refinement/comparison.json", "utf8"));
const native = JSON.parse(await fs.readFile(`${output}/native-measurements.json`, "utf8"));
const report = {
  baselineRevision: "75c61ab9a6ce7bd56ef3ff26366ce0a1d40f0c71",
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceIncludesWorkingTree: true,
  captures: [], checks: [], errors: [], missing: [],
  limits: [
    "Native sources are 131–164-pixel-wide Nintendo manual illustrations. Edge uncertainty is about 4–8 logical pixels after enlargement; no pixel-accuracy percentage is claimed.",
    "All native sources are 4:3. Wide mode keeps a centered 640-unit content area; it awaits an independent native 16:9 storage reference.",
    "M PLUS 1p glyphs, SVG silhouettes and control surfaces remain permitted reconstructions, not original Nintendo fonts/textures.",
    "GameCube, Channels and item dialogs use related native references. Browser storage and unavailable block counts remain browser adapters.",
  ],
};
const check = (name, ok) => { assert.ok(ok, name); report.checks.push(name); };
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", "4967", "--strictPort"], { stdio: "ignore" });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  for (let i = 0; i < 100; i++) {
    try { await fetch("http://localhost:4967/wiishowcase/"); break; }
    catch { await new Promise(r => setTimeout(r, 100)); }
  }
  for (const [width, height] of [[640,480],[854,480],[960,720],[1280,720]]) {
    const mode = width / height < 1.5 ? "4:3" : "16:9";
    const context = await browser.newContext({ viewport: { width, height }, timezoneId: "America/Vancouver" });
    const p = await context.newPage();
    p.on("pageerror", e => report.errors.push({ width, message: e.message }));
    p.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("favicon.ico")) report.missing.push({width,url:r.url(),status:r.status()}); });
    await p.addInitScript(() => {
      const OriginalDate = Date;
      window.Date = class extends OriginalDate {
        constructor(...args) { super(...(args.length ? args : ["2026-10-12T19:00:00Z"])); }
        static now() { return new OriginalDate("2026-10-12T19:00:00Z").getTime(); }
      };
    });
    const b = (name, scope = p) => scope.getByRole("button", { name, exact: true });
    const back = () => b("Back", p.locator(".system-settings-shell footer")).click();
    const state = () => p.evaluate(() => JSON.parse(localStorage.getItem("wiishowcase.system.v1")));
    const snap = async (id, title, reference, referenceRole = "same-view") => {
      await p.mouse.move(width - 2, height - 2);
      await p.evaluate(() => { if (!document.querySelector('[aria-modal="true"]')) document.activeElement?.blur(); });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      const geometry = await p.evaluate(interfaceGeometry);
      assert.deepEqual(geometry.failures, [], `${id} ${width}: controls, text and pointer hits`);
      if (id === "save-grid" || id === "gamecube-data") {
        check(`${id} ${width}: footer status is visible above the footer surface`, await p.locator(".data-status").evaluate(el => {
          const r = el.getBoundingClientRect();
          return el.textContent.trim().length > 0 && el.contains(document.elementFromPoint(r.x+r.width/2, r.y+r.height/2));
        }));
      }
      const metrics = await p.evaluate(() => Object.fromEntries([
        ".system-settings-shell header", ".system-settings-shell h1", ".system-tile-grid", ".system-tile", ".system-tile > span:last-child", ".data-grid", ".data-slot", ".system-tabs", ".wii-settings-back", ".data-status", ".system-settings-shell footer",
      ].map(selector => {
        const el = document.querySelector(selector);
        return [selector, el ? { rect: el.getBoundingClientRect().toJSON(), fontFamily: getComputedStyle(el).fontFamily, fontSize: getComputedStyle(el).fontSize } : null];
      })));
      const filename = `${id}-${width}x${height}.png`;
      await p.screenshot({ path: `${output}/current/${filename}` });
      const previous = baseline.states.find(s => s.id === id)?.captures.find(c => c.width === width && c.height === height);
      let before = null;
      if (previous) { before = `before/${filename}`; await fs.copyFile(`docs/system-menu-refinement/${previous.image}`, `${output}/${before}`); }
      report.captures.push({ id, title, mode, width, height, image: `current/${filename}`, before, reference, referenceRole, geometry, metrics });
      console.log(`PASS ${id} ${width}×${height}`);
    };
    await p.goto("http://localhost:4967/wiishowcase/?screen=settings&channelPreview=1");
    await p.mouse.move(width - 2, height - 2);
    await p.waitForTimeout(1500);
    await snap("options", "Wii Options", "manual-316");
    const options = report.captures.at(-1).metrics;
    if (mode === "4:3") {
      const s = height / 480, tile = options[".system-tile"].rect, footer = options[".system-settings-shell footer"].rect;
      const source = native.measurements.find(m => m.reference === "manual-316");
      const [x,y,w] = source.cyanTileEdges[0].containFit640x480;
      check(`${width}: tile edges align with independent manual pixels within source uncertainty`, Math.abs(tile.x/s-x)<8 && Math.abs(tile.y/s-y)<8 && Math.abs(tile.width/s-w)<8);
      check(`${width}: footer aligns with independent native divider`, Math.abs(footer.y/s-source.footerDividerContainY)<8);
    }
    check(`${width}: tile labels load the bundled face`, await p.evaluate(() => document.fonts.check('500 20px "Wii System"')));
    await b("Data Management").focus();
    await p.keyboard.press("Enter");
    await snap("data-root", "Data Management", "manual-315");
    await b("Save Data").click();
    await snap("save-chooser", "Save Data platforms", "manual-312");
    check(`${width}: GameCube label fits on two lines`, (await b("Nintendo GameCube").innerText()).includes("\n"));
    await b("Wii").click();
    await snap("save-grid", "Wii Save Data", "manual-314");
    const grid = report.captures.at(-1).metrics;
    if (mode === "4:3") check(`${width}: grid top aligns with native manual`, Math.abs(grid[".data-grid"].rect.y/(height/480)-86)<8);
    check(`${width}: storage has fifteen visible slots`, await p.locator(".data-slot").count() === 15);
    await b("SD Card").click();
    await snap("save-sd", "SD Card save data", "manual-314", "related-state");
    check(`${width}: SD tab shows its empty inventory`, await p.locator(".data-slot:not(:disabled)").count() === 0);
    await b("Wii").click();
    await b("Wii Sports data").click();
    await snap("save-selected", "Save Data item actions", "manual-314", "related-state");
    const initial = await state();
    await b("Copy", p.getByRole("dialog")).click();
    await snap("save-copy-confirm", "Save Data Copy confirmation", "manual-314", "related-state");
    await b("No", p.getByRole("dialog")).click();
    await b("Back", p.getByRole("dialog")).click();
    check(`${width}: Copy cancellation preserves browser inventory`, JSON.stringify(await state()) === JSON.stringify(initial));
    await back();
    await b("Nintendo GameCube").click();
    await snap("gamecube-data", "GameCube Save Data", "manual-314", "related-view");
    check(`${width}: GameCube starts on Slot A`, await b("Slot A").getAttribute("aria-pressed") === "true");
    await b("Slot B").click();
    await snap("gamecube-slot-b", "GameCube Slot B", "manual-314", "related-view");
    check(`${width}: Slot B becomes selected`, await b("Slot B").getAttribute("aria-pressed") === "true");
    await back(); await back();
    await b("Channels").click();
    await snap("channels-data", "Channel Data Management", "manual-314", "related-view");
    check(`${width}: Disc excluded from storage inventory`, await b("Disc Channel data").count() === 0);
    await b("Mii Channel data").click();
    await snap("channel-selected", "Channel item actions", "manual-314", "related-view");
    await p.keyboard.press("Escape");
    check(`${width}: Escape closes only the selected-item dialog`, await p.getByRole("dialog").count() === 0 && await p.locator(".data-grid").count() === 1);
    await back(); await back();
    check(`${width}: Back returns through hierarchy to Options`, await p.locator('[data-settings-path="Options"]').count() === 1);
    await context.close();
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.missing, []);
} finally {
  await browser.close(); server.kill();
  await fs.writeFile(`${output}/validation.json`, JSON.stringify(report, null, 2) + "\n");
}
console.log(`PASS ${report.captures.length} captures, ${report.checks.length} interaction/source checks`);
