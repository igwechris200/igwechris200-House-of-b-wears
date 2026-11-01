// Bundles scripts/test-admin-flows.ts (with the app's `@/` aliases) and runs it against DATABASE_URL.
// Usage: node scripts/run-admin-tests.mjs   (reads .env automatically)
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

// Load .env into process.env (without overriding existing variables)
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const outDir = path.join(process.cwd(), ".tmp");
mkdirSync(outDir, { recursive: true });
const outfile = path.join(outDir, "test-admin.cjs");

// `server-only` throws outside Next.js; replace it with an empty module for this test bundle.
const serverOnlyNoop = {
  name: "server-only-noop",
  setup(b) {
    b.onResolve({ filter: /^server-only$/ }, () => ({ path: "noop", namespace: "noop" }));
    b.onLoad({ filter: /.*/, namespace: "noop" }, () => ({ contents: "", loader: "js" }));
  },
};

await build({
  entryPoints: ["scripts/test-admin-flows.ts"],
  bundle: true,
  platform: "node",
  packages: "external",
  target: "node20",
  outfile,
  logLevel: "warning",
  plugins: [serverOnlyNoop],
});

const run = spawnSync(process.execPath, [outfile], { stdio: "inherit", env: process.env });
rmSync(outDir, { recursive: true, force: true });
process.exit(run.status ?? 1);
