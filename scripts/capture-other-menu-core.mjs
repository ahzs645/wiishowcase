import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";
const output = process.env.OTHER_MENU_ARTIFACTS || "docs/other-menus";
const temporary = !process.env.OTHER_MENU_CORE_SOURCE;
const source =
  process.env.OTHER_MENU_CORE_SOURCE ||
  (await fs.mkdtemp(path.join(os.tmpdir(), "wii-other-menus-")));
try {
  if (temporary)
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["scripts/test-system-interface.mjs"],
        {
          stdio: "inherit",
          env: { ...process.env, SYSTEM_SIZING: "1", SYSTEM_ARTIFACTS: source },
        },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(Error(`Core menu capture exited ${code}`)),
      );
    });
  const results = JSON.parse(
    await fs.readFile(path.join(source, "results.json"), "utf8"),
  );
  const geometry = JSON.parse(
    await fs.readFile(path.join(source, "sizing-checks.json"), "utf8"),
  );
  if (
    results.errors.length ||
    results.missing.length ||
    results.captures.length !== 60
  )
    throw Error("Core regression did not finish cleanly");
  await fs.mkdir(`${output}/current`, { recursive: true });
  const captures = [];
  for (const capture of results.captures.filter(
    (c) => !c.id.startsWith("menu-"),
  )) {
    for (const [width, height, directory] of [
      [capture.width, capture.height, "after"],
      [capture.mode === "4:3" ? 640 : 854, 480, "native"],
    ]) {
      const filename = `${capture.id}-${width}x${height}.png`;
      await fs.copyFile(
        path.join(source, directory, filename),
        `${output}/current/${filename}`,
      );
      const check = geometry.find(
        (g) => g.id === capture.id && g.width === width && g.height === height,
      );
      if (!check) throw Error(`Missing geometry check for ${filename}`);
      captures.push({
        ...capture,
        width,
        height,
        image: `current/${filename}`,
        geometry: check,
        referenceRole: "same-view",
      });
    }
  }
  await fs.writeFile(
    `${output}/core-captures.json`,
    JSON.stringify(
      {
        baselineRevision: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        captures,
        checks: results.checks,
        errors: results.errors,
        missing: results.missing,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Collected ${captures.length} non-menu captures from the core regression.`,
  );
} finally {
  if (temporary) await fs.rm(source, { recursive: true, force: true });
}
