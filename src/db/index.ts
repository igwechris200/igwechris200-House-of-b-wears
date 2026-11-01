import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * Local databases (127.0.0.1 / localhost) connect without SSL.
 * Hosted databases such as Supabase require SSL. Supabase's certificate chain
 * isn't in Node's default trust store, so we encrypt the connection without
 * verifying the chain. sslmode/ssl* params are stripped from the URL because
 * `pg` would otherwise let them override this setting.
 */
function buildPoolConfig(url: string): PoolConfig {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { connectionString: url };
  }
  const host = parsed.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
  if (isLocal || process.env.DATABASE_SSL === "false") {
    return { connectionString: url };
  }
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "ssl", "uselibpqcompat"]) {
    parsed.searchParams.delete(key);
  }
  return {
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(buildPoolConfig(databaseUrl));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
