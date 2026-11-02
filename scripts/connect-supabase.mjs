#!/usr/bin/env node
// Connect this store to a Supabase (or any PostgreSQL) database.
//
//   node scripts/connect-supabase.mjs "postgresql://..." [--migrate-data]
//
// Steps:
//   1. Reads and validates the connection string
//   2. Tests it can actually connect
//   3. Applies the schema (src/db/schema.ts) via drizzle-kit push
//   4. Applies Row Level Security (supabase/migrations/20261102000100_row_level_security.sql)
//   5. With --migrate-data, copies rows from the local database first
//   6. Verifies the tables exist and reports row counts
//
// Writes the URL into .env as DATABASE_URL so the app uses it.
// Nothing is deleted: --migrate-data only INSERTs, and existing rows are
// skipped, so it is safe to run more than once.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const args = process.argv.slice(2);
const MIGRATE_DATA = args.includes("--migrate-data");
const urlArg = args.find((a) => !a.startsWith("--"));

const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;

function loadEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * Rewrites .env, replacing only DATABASE_URL and __NEXT_PRIVATE_ORIGIN while
 * preserving every other line — including comments and unknown keys — exactly
 * as they were. This matters because .env carries a warning comment about
 * ALLOW_COOKIELESS_ADMIN that must not be silently deleted.
 */
function saveEnv(file, vars) {
  const originals = existsSync(file) ? readFileSync(file, "utf8").split("\n") : [];
  const seen = new Set();
  const out = [];

  for (const line of originals) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && vars[m[1]] !== undefined) {
      out.push(`${m[1]}=${vars[m[1]]}`);
      seen.add(m[1]);
    } else {
      out.push(line);
    }
  }

  // Append any requested variable that was not already present
  for (const [k, v] of Object.entries(vars)) {
    if (!seen.has(k) && v !== undefined) out.push(`${k}=${v}`);
  }

  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "\n");
  writeFileSync(file, text);
}

function die(msg) {
  console.error(`\n${RED("✗")} ${msg}\n`);
  process.exit(1);
}

async function counts(client) {
  const tables = ["categories", "products", "users", "orders", "order_items", "payments", "discount_codes", "settings"];
  const out = {};
  for (const t of tables) {
    try {
      const r = await client.query(`select count(*)::int as c from ${t}`);
      out[t] = r.rows[0].c;
    } catch {
      out[t] = null;
    }
  }
  return out;
}

async function main() {
  console.log("\n▸ HOUSE OF B'WEARS — connect to Supabase\n");

  if (!urlArg) {
    console.log(`Usage:
  node scripts/connect-supabase.mjs "postgresql://..."          connect
  node scripts/connect-supabase.mjs "postgresql://..." --migrate-data

Get the connection string from:
  Supabase → Project Settings → Database → Connection string → URI

Use the Session pooler / connection-pooling URI if you deploy to a
serverless platform (Vercel, Netlify). Use the direct connection for a
long-running server.\n`);
    process.exit(1);
  }

  // ── 1. Validate the URL ────────────────────────────────────────────────
  let remote;
  try {
    remote = new URL(urlArg);
  } catch {
    die(`That does not look like a valid connection string: ${urlArg}`);
  }
  if (!/^postgres(ql)?:$/.test(remote.protocol)) {
    die(`Expected a postgresql:// URL, got protocol "${remote.protocol}"`);
  }
  if (!remote.password) {
    die("The connection string has no password in it. Copy the full URI from Supabase, which includes it.");
  }

  const isSupabase = /supabase\.(co|com|net)$/i.test(remote.hostname) || /supabase/i.test(remote.searchParams.get("options") || "");
  console.log(`  Host:     ${remote.hostname}:${remote.port || 5432}`);
  console.log(`  Database: ${remote.pathname.replace(/^\//, "") || "(default)"}`);
  console.log(`  Provider: ${isSupabase ? "Supabase" : "generic PostgreSQL"}\n`);

  // ── 2. Test the connection ─────────────────────────────────────────────
  console.log("▸ Testing connection…");
  const client = new pg.Client({
    connectionString: urlArg,
    ssl: remote.hostname === "localhost" || remote.hostname === "127.0.0.1" ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
  } catch (e) {
    await client.end().catch(() => {});
    const m = String(e.message || e);
    if (/ENOTFOUND|EAI_AGAIN/.test(m)) {
      die(`Cannot resolve host "${remote.hostname}". Check the project reference in the URL.`);
    }
    if (/ETIMEDOUT|timeout/i.test(m)) {
      die("Connection timed out. Supabase may be paused, or your network is blocking port 5432.\n  Try the Session pooler URI (port 5432 via supabase.co) or the Transaction pooler (port 6543).");
    }
    if (/password authentication failed/i.test(m)) {
      die("Password rejected. Re-copy the URI from Supabase → Database → Connection string, and reset the database password if needed.");
    }
    if (/database .* does not exist/i.test(m)) {
      die("Database name not found. Use the URI exactly as Supabase provides it.");
    }
    die(`Could not connect: ${m}`);
  }

  const version = (await client.query("select version()")).rows[0].version.split(",")[0];
  console.log(`  ${GREEN("✓")} Connected — ${version}\n`);

  const before = await counts(client);
  const alreadyPopulated = Object.values(before).some((n) => n > 0);

  // ── 3. Copy data out of the local database first, if asked ────────────
  let localData = null;
  if (MIGRATE_DATA) {
    console.log("▸ Reading data from the local database…");
    const local = new pg.Client({ connectionString: LOCAL_URL });
    try {
      await local.connect();
      localData = {
        categories: (await local.query("select * from categories order by id")).rows,
        products: (await local.query("select * from products order by id")).rows,
        users: (await local.query("select * from users order by id")).rows,
        discount_codes: (await local.query("select * from discount_codes order by id")).rows,
        settings: (await local.query("select * from settings where key <> 'seeded'")).rows,
        orders: (await local.query("select * from orders order by id")).rows,
        order_items: (await local.query("select * from order_items order by id")).rows,
        payments: (await local.query("select * from payments order by id")).rows,
        newsletter_subscribers: (await local.query("select * from newsletter_subscribers order by id")).rows,
      };
      await local.end();
      const total = Object.values(localData).reduce((n, a) => n + a.length, 0);
      console.log(`  ${GREEN("✓")} Read ${total} rows locally (${localData.products.length} products, ${localData.categories.length} categories)\n`);
    } catch (e) {
      await local.end().catch(() => {});
      console.log(`  ${DIM("– local database not reachable, skipping data copy")}\n`);
    }
  }

  // ── 4. Apply the schema ────────────────────────────────────────────────
  console.log("▸ Applying schema (src/db/schema.ts)…");
  try {
    const out = execFileSync("npx", ["drizzle-kit", "push"], {
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: urlArg },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const tail = out.trim().split("\n").filter((l) => l && !l.startsWith("[")).slice(-2).join(" ");
    console.log(`  ${GREEN("✓")} ${tail || "schema applied"}\n`);
  } catch (e) {
    await client.end().catch(() => {});
    die(`drizzle-kit push failed:\n${String(e.stderr || e.stdout || e.message).slice(0, 1500)}`);
  }

  // ── 5. Insert the migrated data ────────────────────────────────────────
  if (localData) {
    console.log("▸ Copying data into the new database…");
    let inserted = 0;

    const insertRows = async (table, rows, columns) => {
      for (const r of rows) {
        const vals = columns.map((c) => {
          const v = r[c];
          if (v === null || v === undefined) return null;
          if (Array.isArray(v)) return JSON.stringify(v);
          if (v instanceof Date) return v.toISOString();
          if (typeof v === "object") return JSON.stringify(v);
          return v;
        });
        const ph = columns.map((_, i) => `$${i + 1}`).join(",");
        await client.query(
          `insert into ${table} (${columns.join(",")}) values (${ph}) on conflict do nothing`,
          vals,
        ).catch(() => {});
        inserted++;
      }
    };

    await insertRows("categories", localData.categories, ["id", "name", "slug", "description", "image", "sort_order", "active"]);
    await insertRows("products", localData.products, ["id", "name", "slug", "description", "price", "discount_price", "category_id", "images", "sizes", "colors", "stock", "featured", "best_seller", "is_new_arrival", "active", "sold_count"]);
    await insertRows("users", localData.users, ["id", "name", "email", "password_hash", "phone", "role", "address", "city", "state"]);
    await insertRows("discount_codes", localData.discount_codes, ["id", "code", "type", "value", "min_order", "usage_limit", "used_count", "active"]);
    await insertRows("settings", localData.settings, ["key", "value"]);
    await insertRows("orders", localData.orders, ["id", "order_number", "user_id", "customer_name", "customer_email", "customer_phone", "address", "city", "state", "notes", "subtotal", "discount_code", "discount_amount", "delivery_fee", "total", "status", "payment_status", "payment_method", "stock_deducted"]);
    await insertRows("order_items", localData.order_items, ["id", "order_id", "product_id", "product_name", "product_image", "size", "color", "quantity", "unit_price"]);
    await insertRows("payments", localData.payments, ["id", "order_id", "reference", "method", "amount", "status", "channel", "gateway_response", "verified_by", "customer_note"]);
    await insertRows("newsletter_subscribers", localData.newsletter_subscribers, ["id", "email"]);

    // Restore sequences so new rows get correct ids
    for (const t of ["categories", "products", "users", "orders", "order_items", "payments", "discount_codes", "newsletter_subscribers"]) {
      await client
        .query(`select setval(pg_get_serial_sequence('${t}','id'), coalesce((select max(id) from ${t}), 0) + 1, false)`)
        .catch(() => {});
    }
    console.log(`  ${GREEN("✓")} Copied ${inserted} rows (existing rows were skipped)\n`);
  }

  // ── 6. Apply Row Level Security ────────────────────────────────────────
  if (isSupabase) {
    console.log("▸ Applying Row Level Security (supabase/migrations/20261102000100_row_level_security.sql)…");
    const rls = readFileSync("supabase/migrations/20261102000100_row_level_security.sql", "utf8");
    try {
      await client.query(rls);
      const enabled = await client.query(
        `select count(*)::int as c from pg_class c join pg_namespace n on n.oid=c.relnamespace
         where n.nspname='public' and c.relrowsecurity`,
      );
      console.log(`  ${GREEN("✓")} RLS enabled on ${enabled.rows[0].c} tables\n`);
    } catch (e) {
      console.log(`  ${RED("✗")} RLS could not be applied: ${String(e.message).slice(0, 200)}`);
      console.log(`  ${DIM("  You can run supabase/migrations/20261102000100_row_level_security.sql manually in the Supabase SQL editor.")}\n`);
    }
  }

  // ── 7. Verify ──────────────────────────────────────────────────────────
  const after = await counts(client);
  console.log("▸ Verifying…");
  const missing = Object.entries(after).filter(([, n]) => n === null).map(([t]) => t);
  if (missing.length) die(`These tables are missing: ${missing.join(", ")}`);

  console.log("  Row counts in the new database:");
  for (const [t, n] of Object.entries(after)) {
    console.log(`    ${t.padEnd(24)} ${n}`);
  }
  await client.end();

  // ── 8. Point the app at it ─────────────────────────────────────────────
  saveEnv(".env", {
    DATABASE_URL: urlArg,
    __NEXT_PRIVATE_ORIGIN: "http://127.0.0.1:3000",
  });
  console.log(`\n  ${GREEN("✓")} .env updated — the app now uses this database\n`);

  console.log("Next steps:");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("  • To store product photos in Supabase Storage (survives redeploys), also set:");
    console.log("      SUPABASE_URL=https://<project-ref>.supabase.co");
    console.log("      SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API>");
  }
  console.log("  • Restart the app so it picks up the new .env:");
  console.log("      npm run build && npm start");
  if (alreadyPopulated && !MIGRATE_DATA) {
    console.log("\n  Note: this database already had rows in it, so no data was copied.");
    console.log("  Re-run with --migrate-data if you want your local products copied across.");
  }
  console.log("");
}

main().catch((e) => die(String(e.message || e)));
