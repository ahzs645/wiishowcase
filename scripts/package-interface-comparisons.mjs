import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "dist/comparisons");
await fs.mkdir(target, { recursive: true });
for (const name of [
  "interface-audit",
  "interface-improvements",
  "interface-sizing",
  "menu-fidelity",
  "menu-typography",
  "menu-versions",
  "layout-reference",
  "interface-audit.md",
  "interface-improvements.md",
  "interface-sizing.md",
  "menu-fidelity.md",
  "menu-typography.md",
  "menu-versions.md",
  "layout-reference.md",
]) {
  const source = path.join(root, "docs", name);
  try {
    await fs.access(source);
  } catch {
    continue;
  }
  await fs.cp(source, path.join(target, name), { recursive: true });
}
console.log("Packaged source-linked interface comparison viewers.");
