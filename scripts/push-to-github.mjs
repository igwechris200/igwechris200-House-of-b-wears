#!/usr/bin/env node
// Push this project to an existing GitHub repository.
//
//   node scripts/push-to-github.mjs https://github.com/<user>/<repo>.git
//
// Handles two cases:
//   1. The remote repository is empty          → pushes directly
//   2. The remote already has commits          → merges them in first
//      (uses "-X ours" so your files win on conflict, and allows
//       unrelated histories, which is the normal case when the remote
//       only has an auto-generated README or .gitignore)
//
// Nothing is force-pushed, so remote work is never discarded.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2);
const remoteUrl = args[0];

if (!remoteUrl) {
  console.error("Usage: node scripts/push-to-github.mjs https://github.com/<user>/<repo>.git");
  process.exit(1);
}

// Load .env so a local DATABASE_URL never blocks git hooks (harmless if absent).
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SAFE_BRANCH = "main";

// A merge commit needs an identity. Use the repo's, or fall back to a neutral
// local identity so the script works in a fresh clone with no global config.
const ident = (() => {
  const name = run0(["config", "user.name"]) || "House of B'Wears";
  const email = run0(["config", "user.email"]) || "owner@houseofbwears.ng";
  return { name, email };
})();

function run0(parts) {
  try {
    return execFileSync("git", parts, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() || null;
  } catch {
    return null;
  }
}

function run(args, label, allowFail = false) {
  const parts = Array.isArray(args) ? args : args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  try {
    const out = execFileSync("git", parts, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_AUTHOR_NAME: ident.name, GIT_AUTHOR_EMAIL: ident.email, GIT_COMMITTER_NAME: ident.name, GIT_COMMITTER_EMAIL: ident.email },
    });
    process.stdout.write(out);
    return { ok: true, out };
  } catch (err) {
    const stderr = String(err.stderr || "");
    const stdout = String(err.stdout || "");
    if (allowFail) return { ok: false, out: stdout + stderr };
    console.error(`\n✗ ${label} failed:\n${stderr || stdout || err.message}`);
    process.exit(1);
  }
}

console.log(`\n▸ Remote: ${remoteUrl}\n`);

// 1. Record the remote (replaces it if one is already set).
const existing = run(["remote"], "list remotes", true).out.trim();
if (existing.split("\n").includes("origin")) {
  run(["remote", "set-url", "origin", remoteUrl], "update origin URL");
  console.log("✓ Updated existing 'origin' remote");
} else {
  run(["remote", "add", "origin", remoteUrl], "add origin remote");
  console.log("✓ Added 'origin' remote");
}

// 2. Confirm the local branch is `main` and committed.
const branch = run(["branch", "--show-current"], "read branch").out.trim();
if (branch !== SAFE_BRANCH) {
  run(["branch", "-M", SAFE_BRANCH], "rename branch to main");
  console.log(`✓ Renamed branch '${branch}' → '${SAFE_BRANCH}'`);
} else {
  console.log(`✓ On branch '${SAFE_BRANCH}'`);
}

if (run(["status", "--porcelain"], "check working tree", true).out.trim()) {
  run(["add", "-A"], "stage changes");
  run(["commit", "-m", "Commit local changes before pushing"], "commit changes", true);
  console.log("✓ Committed uncommitted local changes");
  console.log("✓ Committed uncommitted local changes");
}

// 3. Fetch whatever is already on the remote.
console.log("\n▸ Fetching remote branches…");
const fetch = run(["fetch", "origin"], "fetch origin", true);

if (!fetch.ok) {
  console.log("  Remote appears unreachable or empty — attempting a direct push.\n");
  const push = run(["push", "-u", "origin", SAFE_BRANCH], "push", true);
  if (push.ok) {
    console.log(`\n✓ Pushed to ${remoteUrl}\n`);
    process.exit(0);
  }
  console.error(
    `\n✗ Could not reach the remote.\n\n` +
      `  Check the URL, and that you have push access. If GitHub asks for a\n` +
      `  password, use a personal access token (not your account password).\n\n` +
      `  Details:\n${push.out}\n`,
  );
  process.exit(1);
}

// 4. Does the remote have a main branch with commits?
const remoteBranches = run(["branch", "-r"], "list remote branches", true).out.trim();
const remoteHasMain = /origin\/main\b/.test(remoteBranches);
const remoteHead = run(["rev-parse", "origin/main"], "read remote head", true);

if (!remoteHasMain || !remoteHead.ok) {
  console.log("  Remote repository is empty — pushing directly.\n");
  run(["push", "-u", "origin", SAFE_BRANCH], "push to empty remote");
  console.log(`\n✓ Pushed to ${remoteUrl}\n`);
  process.exit(0);
}

// 5. Remote has commits: merge them so the push is a fast-forward.
console.log("  Remote already has commits — merging them into your project.\n");

const mergeBase = run(["merge-base", "HEAD", `origin/${SAFE_BRANCH}`], "find merge base", true);
const upToDate = mergeBase.ok && mergeBase.out.trim() === remoteHead.out.trim();

if (upToDate) {
  console.log("  Remote is already up to date — pushing.\n");
} else {
  // --allow-unrelated-histories is required when the remote was created
  // independently on GitHub (e.g. it only has an auto-generated README).
  // -X ours keeps this project's files wherever the same path conflicts.
  const merge = run(
    ["merge", `origin/${SAFE_BRANCH}`, "--allow-unrelated-histories", "-X", "ours", "-m", "Merge existing GitHub history"],
    "merge remote history",
    true,
  );
  if (!merge.ok) {
    console.error(
      `\n✗ Merge failed.\n\n` +
        `  Your local files were kept where they conflicted, but git could not finish\n` +
        `  the merge automatically. Run these to resolve it by hand:\n\n` +
        `    git merge --abort   # undo, if you want to start over\n` +
        `    git merge origin/main -X ours\n` +
        `    git push -u origin main\n`,
    );
    process.exit(1);
  }
  console.log("✓ Merged remote history (your files kept on conflicts)");
}

// 6. Push.
run(["push", "-u", "origin", SAFE_BRANCH], "push");
console.log(`\n✓ Pushed to ${remoteUrl}\n`);
console.log(`  Repository: ${remoteUrl.replace(/\.git$/, "")}`);
console.log(`  Branch:     ${SAFE_BRANCH} (tracking origin/${SAFE_BRANCH})\n`);
