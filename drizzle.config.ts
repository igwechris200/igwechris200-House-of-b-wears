import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * Drizzle reads DATABASE_URL from .env (see .env.example).
 * `npx drizzle-kit push` applies src/db/schema.ts to your database.
 */
export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
} satisfies Config;
