// Reset (or create) the admin account from the server, e.g. when the owner forgets the password.
//
// Usage:
//   node scripts/reset-admin-password.mjs <email> <new-password>
//
// Reads DATABASE_URL from .env. The password must be at least 10 characters.
// If the email does not exist yet, an admin account is created with that email.
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const [, , rawEmail, password] = process.argv;
if (!rawEmail || !password) {
  console.error("Usage: node scripts/reset-admin-password.mjs <email> <new-password>");
  process.exit(1);
}
if (password.length < 10) {
  console.error("The password must be at least 10 characters.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// Same format the app uses: "<salt hex>:<scrypt hash hex>"
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
const email = rawEmail.trim().toLowerCase();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const existing = await client.query("select id, role from users where email = $1", [email]);
  if (existing.rows.length) {
    await client.query("update users set password_hash = $1, role = 'admin' where email = $2", [hash, email]);
    await client.query("delete from sessions where user_id = $1", [existing.rows[0].id]);
    console.log(`Password reset for ${email}. All active sessions for this account were signed out.`);
  } else {
    await client.query("insert into users (name, email, password_hash, role) values ($1, $2, $3, 'admin')", ["Store Owner", email, hash]);
    console.log(`Admin account created for ${email}.`);
  }
} finally {
  await client.end();
}
