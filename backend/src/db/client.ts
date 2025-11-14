import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

const rawConnectionString =
  process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_URL;

if (!rawConnectionString) {
  throw new Error(
    'Database connection string missing. Set DATABASE_URL or SUPABASE_DB_URL in the environment.',
  );
}

const normalizeFlag = (value: string | undefined): string | undefined =>
  value?.trim().toLowerCase();

const dbSslFlag = normalizeFlag(process.env.DB_SSL);

const disableValues = new Set(['0', 'false', 'off', 'disable', 'disabled', 'no']);
const enableValues = new Set(['1', 'true', 'on', 'enable', 'enabled', 'yes', 'require', 'required']);

const parsedUrl = (() => {
  try {
    return new URL(rawConnectionString);
  } catch (error) {
    console.warn('[db] failed to parse DATABASE_URL', { message: (error as Error).message });
    return undefined;
  }
})();

const host = parsedUrl?.hostname ?? '';

let shouldUseSsl = process.env.NODE_ENV === 'production';

if (dbSslFlag) {
  if (disableValues.has(dbSslFlag)) {
    shouldUseSsl = false;
  } else if (enableValues.has(dbSslFlag)) {
    shouldUseSsl = true;
  }
}

const internalHostPatterns = ['localhost', '127.0.0.1', 'supabase-db-'];

if (shouldUseSsl && host) {
  const isInternalHost = internalHostPatterns.some((pattern) => host.includes(pattern));
  if (isInternalHost) {
    shouldUseSsl = false;
  }
}

const sslModeProvided = rawConnectionString.includes('sslmode=');

const connectionString = shouldUseSsl && !sslModeProvided
  ? `${rawConnectionString}${rawConnectionString.includes('?') ? '&' : '?'}sslmode=require`
  : rawConnectionString;

const maxPoolSize = Number.parseInt(process.env.DB_POOL_MAX ?? '10', 10);

export const pool = new Pool({
  connectionString,
  max: Number.isNaN(maxPoolSize) ? 10 : maxPoolSize,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err: Error) => {
  console.error('[db] unexpected pool error', { message: err.message });
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export type DatabaseClient = typeof db;
export type TransactionClient = Parameters<Parameters<DatabaseClient['transaction']>[0]>[0];
