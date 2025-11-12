import { eq, sql } from 'drizzle-orm';

import { db, type TransactionClient } from '../db/client';
import { quoteNumberCounters } from '../db/schema';

const QUOTE_NUMBER_PREFIX = 'MPK';
const SEQUENCE_PAD_LENGTH = 3;

function formatQuoteNumber(year: number, sequence: number): string {
  const padded = sequence.toString().padStart(SEQUENCE_PAD_LENGTH, '0');
  return `${QUOTE_NUMBER_PREFIX}-${year}-${padded}`;
}

async function ensureCounterRow(tx: TransactionClient, year: number, timestamp: Date): Promise<void> {
  await tx
    .insert(quoteNumberCounters)
    .values({ year, lastSeq: 0, updatedAt: timestamp })
    .onConflictDoNothing({ target: quoteNumberCounters.year });
}

export async function reserveQuoteNumber(tx: TransactionClient): Promise<string> {
  const now = new Date();
  const year = now.getUTCFullYear();

  await ensureCounterRow(tx, year, now);

  const [updated] = await tx
    .update(quoteNumberCounters)
    .set({
      lastSeq: sql`${quoteNumberCounters.lastSeq} + 1`,
      updatedAt: now,
    })
    .where(eq(quoteNumberCounters.year, year))
    .returning({ sequence: quoteNumberCounters.lastSeq });

  if (!updated) {
    throw new Error('Failed to reserve quote number.');
  }

  return formatQuoteNumber(year, Number(updated.sequence));
}

export async function generateQuoteNumber(): Promise<string> {
  return db.transaction(async (tx) => reserveQuoteNumber(tx));
}

