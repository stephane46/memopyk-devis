import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_URL;

if (!connectionString) {
  throw new Error(
    'Database connection string missing. Set DATABASE_URL or SUPABASE_DB_URL in the environment.',
  );
}

const maxPoolSize = Number.parseInt(process.env.DB_POOL_MAX ?? '10', 10);

export const pool = new Pool({
  connectionString,
  max: Number.isNaN(maxPoolSize) ? 10 : maxPoolSize,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err: Error) => {
  console.error('[db] unexpected pool error', { message: err.message });
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export type DatabaseClient = typeof db;
export type TransactionClient = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];
