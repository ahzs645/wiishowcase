import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.STORAGE_COMPARISON_URL || "http://localhost:4957/storage-menu-refinement/";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const report = { combinations: 0, errors: [], missing: [] };
try {
  const p = await browser.newPage({ viewport: {width:1440,height:1100} });
  p.on("pageerror", e => report.errors.push(e.message));
  p.on("response", r => { if (r.status() >= 400) report.missing.push({url:r.url(),status:r.status()}); });
  await p.goto(base);
  const ids = await p.locator("#interface option").evaluateAll(els => els.map(e => e.value));
  assert.equal(ids.length, 11);
  for (const id of ids) for (const mode of ["4:3","16:9"]) for (const height of ["480","720"]) {
    await p.selectOption("#interface", id);
    await p.selectOption("#mode", mode);
    await p.selectOption("#height", height);
    for (const layer of ["reference","before"]) {
      await p.selectOption("#layer", layer);
      await p.waitForFunction(() => [...document.images].filter(i => i.getAttribute("src") && getComputedStyle(i).display !== "none").every(i => i.complete && i.naturalWidth > 0));
      assert.equal(await p.locator("#after").evaluate(i=>i.naturalHeight), Number(height));
      const confidence = await p.locator("#confidence").innerText();
      if (layer === "reference" && mode === "16:9") assert.match(confidence,/not independently native-verified/);
      if (layer === "reference" && ["gamecube-data","channels-data","channel-selected"].includes(id)) assert.match(confidence,/related-view/);
      if (layer === "before" && ["save-sd","gamecube-slot-b"].includes(id)) assert.match(confidence,/No matching baseline/);
      report.combinations++;
    }
  }
  await p.selectOption("#layer", "reference");
  await p.locator("#alpha").fill("75");
  assert.equal(await p.locator("#overlay").evaluate(e=>getComputedStyle(e).opacity),"0.75");
  await p.locator("#difference").check();
  assert.equal(await p.locator("#overlay").evaluate(e=>getComputedStyle(e).mixBlendMode),"difference");
  const idBefore = await p.locator("#interface").inputValue();
  await p.locator("#next").click();
  assert.notEqual(await p.locator("#interface").inputValue(),idBefore);
  await p.locator("#previous").click();
  assert.equal(await p.locator("#interface").inputValue(),idBefore);
  await p.reload();
  assert.equal(await p.locator("#interface").inputValue(),idBefore);
  await p.setViewportSize({width:390,height:844});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(report.errors, []); assert.deepEqual(report.missing, []);
} finally {
  await fs.writeFile("docs/storage-menu-refinement/viewer-validation.json",JSON.stringify(report,null,2)+"\n");
  await browser.close();
}
console.log(`PASS ${report.combinations} storage overlay combinations, labels, controls, URL state and mobile width`);
