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
      ? "Same date (Fri 03/01) and fixed native icon frames. The preserved version/reference show 17:06; the current US profile shows 5:06 PM. Compare card bounds, continuous page edge, curve, clock strokes, date font and footer. Installed channel contents differ."
      : "The widescreen source is an exact 16:9, 2560×1440 archived menu screenshot with a clock, date, SD button and message count. Time/date, channel inventory and animation phases differ. Capture settings and filtering are undocumented, so this supports layout and typography comparison without an exact pixel-fidelity claim.",
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
    "<h1>Wii menu — corrected geometry</h1>",
    '<h1>Wii menu — corrected geometry</h1><p><a href="../menu-typography/typography-comparison.png">Enlarged clock/date comparisons · both aspect ratios</a> · <a href="../menu-typography.md">Typography details</a></p>',
  )
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
    "Before and corrected images are separate captures at the same size. Date and native icon animation phases are aligned for 4:3 comparison. The current US profile formats 17:06 as 5:06 PM; digits differ from the preserved version and reference.",
  )
  .replace(
    "Manual illustrations are small and sometimes cropped. Font metrics and some artwork still differ; these comparisons do not establish an exact pixel accuracy score.",
    "The 4:3 reference is a 640×476 capture with a small crop. The widescreen reference is a 2560×1440 archived screenshot with undocumented capture settings. Time/date, channel lineups and font metrics differ; this is not an overall pixel accuracy score.",
  )
  .replace(
    'href="../interface-sizing.md">Sizing and validation report',
    'href="../menu-fidelity.md">Menu correction and measured alignment report',
  );
await fs.writeFile(path.join(output, "index.html"), html);
console.log(`Built ${entries.length} matched-state menu comparisons.`);
