import fs from "node:fs";
import { spawnSync } from "node:child_process";

// Build exactly the code used by the dev server; do not patch source files at build time.
fs.copyFileSync("index.source.html", "index.html");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["vite", "build"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
