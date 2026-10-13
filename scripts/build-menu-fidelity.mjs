import fs from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  output = path.join(root, "docs/menu-fidelity");
const results = JSON.parse(
  await fs.readFile(path.join(output, "results.json"), "utf8"),
);
const sources = JSON.parse(
  await fs.readFile(
    path.join(root, "docs/interface-audit/references.json"),
    "utf8",
  ),
).references;
const entries = results.captures.map((c) => ({
  ...c,
  id: "menu-settled",
  title: "Wii Menu",
  reference: sources.find((r) => r.id === c.reference),
  baseline: { width: c.width, height: c.height, image: c.before },
  note:
    c.mode === "4:3"
      ? "Matched 17:06 / Fri 03/01 and fixed native icon frames. Compare the visible card bounds, continuous page edge, finer background, curve, clock and footer. The reference has additional installed channels; their contents differ."
      : "The widescreen source is a small, cropped promotional image with another channel lineup and footer label. This establishes grid coverage and proportions; precise wide pixel fidelity remains unverified.",
}));
await fs.writeFile(
  path.join(output, "comparison.json"),
  JSON.stringify(
    { previousRevision: results.beforeRevision, entries },
    null,
    2,
  ) + "\n",
);
// Reuse the checked comparison viewer layout; retain its aspect-preserving
// source display and opacity/difference/progress controls.
let html = await fs.readFile(
  path.join(root, "docs/interface-sizing/index.html"),
  "utf8",
);
html = html
  .replace(
    /const entries=\[.*?\],names=/s,
    `const entries=${JSON.stringify(entries).replaceAll("<", "\\u003c")},names=`,
  )
  .replace(/<p><a id="latest-menu".*?<\/p>/, "")
  .replaceAll(
    "Wii sizing and typography comparisons",
    "Wii menu reference alignment",
  )
  .replaceAll("Wii sizing and typography", "Wii menu — corrected geometry")
  .replace(
    "Online reference, previous implementation and refined sizing.",
    "Wii reference, preserved 3e96806 menu and corrected implementation.",
  )
  .replace(
    "before='../interface-improvements/'+e.baseline.image",
    "before=e.baseline.image",
  )
  .replaceAll("c8c9da9", "3e96806")
  .replace(
    'href="../interface-improvements/">Previous implementation pass',
    'href="../interface-sizing/">Previous sizing pass',
  )
  .replace("+(e.height===480?' · scaled from 720 lines':'')", "")
  .replace(
    "Its 720-line screenshots are scaled proportionally when comparing native sizes. Refined 480-line images are separate browser captures, with text bounds and pointer targets checked in each state.",
    "Before and corrected images are separate captures at the same size. The 4:3 clock/date and native icon animation phases are aligned for comparison; this does not change live playback.",
  )
  .replace(
    "Manual illustrations are small and sometimes cropped. Font metrics and some artwork still differ; these comparisons do not establish an exact pixel accuracy score.",
    "The 4:3 reference is a 640×476 capture with a small crop. The widescreen source is a low-resolution promotional image. Channel lineups and date-font metrics differ; this is not an overall pixel accuracy score.",
  )
  .replace(
    'href="../interface-sizing.md">Sizing and validation report',
    'href="../menu-fidelity.md">Menu correction and measured alignment report',
  );
await fs.writeFile(path.join(output, "index.html"), html);
console.log(`Built ${entries.length} matched-state menu comparisons.`);
