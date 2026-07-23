#!/usr/bin/env node
/**
 * Writes public/version.json with the current commit SHA so deployed clients
 * can detect when a newer build is live (see src/lib/updateChecker.js).
 * Runs automatically via the `prebuild` npm script.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function getCommitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const commitSha = getCommitSha();
const buildNumber = commitSha ? commitSha.slice(0, 7) : `local-${Date.now()}`;

const versionInfo = {
  version: pkg.version,
  buildNumber,
  commitSha: commitSha ?? 'unknown',
  buildTime: new Date().toISOString(),
};

const outPath = path.join(root, 'public', 'version.json');
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(versionInfo, null, 2)}\n`);
console.log(`[version] ${outPath}: ${versionInfo.version} (${buildNumber})`);
