import { eq } from 'drizzle-orm';

import type { TransactionClient } from '../db/client';
import { quotePublicLinks, type QuotePublicLink } from '../db/schema';

export interface PublicLinkUpsertInput {
  quoteId: string;
  token: string;
  pinHash: string | null;
}

export async function getPublicLinkByQuoteIdTx(
  tx: TransactionClient,
  quoteId: string,
): Promise<QuotePublicLink | null> {
  const [link] = await tx
    .select()
    .from(quotePublicLinks)
    .where(eq(quotePublicLinks.quoteId, quoteId))
    .limit(1);

  return link ?? null;
}

export async function getPublicLinkByTokenTx(
  tx: TransactionClient,
  token: string,
): Promise<QuotePublicLink | null> {
  const [link] = await tx
    .select()
    .from(quotePublicLinks)
    .where(eq(quotePublicLinks.token, token))
    .limit(1);

  return link ?? null;
}

export async function upsertPublicLinkTx(
  tx: TransactionClient,
  input: PublicLinkUpsertInput,
): Promise<QuotePublicLink> {
  const now = new Date();

  const existing = await getPublicLinkByQuoteIdTx(tx, input.quoteId);

  if (existing) {
    const [updated] = await tx
      .update(quotePublicLinks)
      .set({
        token: input.token,
        pinHash: input.pinHash,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        updatedAt: now,
      })
      .where(eq(quotePublicLinks.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await tx
    .insert(quotePublicLinks)
    .values({
      quoteId: input.quoteId,
      token: input.token,
      pinHash: input.pinHash,
      // rely on defaults for pinFailedAttempts, createdAt, updatedAt
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function deletePublicLinkByQuoteIdTx(
  tx: TransactionClient,
  quoteId: string,
): Promise<void> {
  await tx.delete(quotePublicLinks).where(eq(quotePublicLinks.quoteId, quoteId));
}
