#!/usr/bin/env node

import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const targets = [
  path.join(repoRoot, "cache", "patterns"),
  path.join(repoRoot, "apps", "web", "public", "cache", "patterns"),
];

for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`[clean-patterns] Removed ${target}`);
  } else {
    console.log(`[clean-patterns] Skipped ${target} (not found)`);
  }
}

