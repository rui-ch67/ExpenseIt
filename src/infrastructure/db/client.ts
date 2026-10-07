import { Pool } from "@neondatabase/serverless";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Any Postgres-backed Drizzle database with our schema: Neon in the app,
 * an in-memory PGlite instance in tests. Repositories depend on this type,
 * not on a particular driver.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Database | undefined;

/**
 * Created on first use rather than at import time, so `next build` works
 * without database credentials.
 */
export function getDb(): Database {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add it to .env.local (see .env.example) or connect Neon in Vercel.",
      );
    }
    const pool = new Pool({ connectionString });
    // Lets Vercel close idle connections cleanly before a function is suspended.
    attachDatabasePool(pool);
    instance = drizzle({ client: pool, schema });
  }
  return instance;
}
