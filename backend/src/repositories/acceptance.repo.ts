import { and, eq, isNull } from 'drizzle-orm';

import { db, type TransactionClient } from '../db/client';
import { quotes } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type { AdminPaperAcceptanceDTO, PublicAcceptanceDTO } from '../api/validators/acceptance';
import type { QuoteFull } from './quotes.repo';
import { getById } from './quotes.repo';
import { lockNonCurrentVersionsForQuoteTx } from './versions.repo';
import { logActivityTx } from './activities.repo';
import { getPublicLinkByTokenTx } from './public-links.repo';
import type { QuotePublicView } from './public-access.repo';
import { getPublicQuoteViewByQuoteIdTx } from './public-access.repo';

async function loadQuoteByIdTx(tx: TransactionClient, quoteId: string) {
  const [quote] = await tx
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), isNull(quotes.deletedAt)))
    .limit(1);

  return quote ?? null;
}

export async function acceptQuoteOnlineByToken(
  publicToken: string,
  input: PublicAcceptanceDTO,
): Promise<QuotePublicView> {
  return db.transaction(async (tx) => {
    const link = await getPublicLinkByTokenTx(tx, publicToken);

    if (!link) {
      throw new HttpError(404, 'public_link_not_found', 'Public link not found.');
    }

    const quote = await loadQuoteByIdTx(tx, link.quoteId);

    if (!quote) {
      throw new HttpError(404, 'public_link_not_found', 'Public link not found.');
    }

    const now = new Date();

    if (link.pinHash) {
      if (link.pinLockedUntil && link.pinLockedUntil > now) {
        throw new HttpError(403, 'pin_locked', 'PIN is temporarily locked.', {
          unlock_at: link.pinLockedUntil.toISOString(),
        });
      }

      const failedAttempts = link.pinFailedAttempts ?? 0;

      if (failedAttempts !== 0) {
        throw new HttpError(403, 'pin_required', 'PIN is required to accept this quote.');
      }
    }

    if (quote.status === 'accepted') {
      throw new HttpError(409, 'already_accepted', 'Quote is already accepted.');
    }

    const [updated] = await tx
      .update(quotes)
      .set({
        status: 'accepted',
        acceptanceMode: 'online',
        acceptedAt: now,
        acceptedByName: input.full_name,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quote.id), isNull(quotes.deletedAt)))
      .returning({ id: quotes.id, currentVersionId: quotes.currentVersionId, status: quotes.status });

    if (!updated) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    await lockNonCurrentVersionsForQuoteTx(tx, updated.id);

    const currentVersionId = updated.currentVersionId ?? null;

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'status_changed',
      metadata: { from: quote.status, to: 'accepted' },
    });

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'accept',
      metadata: { mode: 'online', full_name: input.full_name },
    });

    const view = await getPublicQuoteViewByQuoteIdTx(tx, updated.id);

    if (!view) {
      throw new HttpError(500, 'quote_load_failed', 'Unable to load accepted quote.');
    }

    return view;
  });
}

export async function acceptQuoteOnPaper(
  quoteId: string,
  input: AdminPaperAcceptanceDTO,
): Promise<QuoteFull> {
  const updatedId = await db.transaction(async (tx) => {
    const quote = await loadQuoteByIdTx(tx, quoteId);

    if (!quote) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    if (quote.status === 'accepted') {
      throw new HttpError(409, 'already_accepted', 'Quote is already accepted.');
    }

    const now = new Date();
    const acceptedAt = input.accepted_at ? new Date(input.accepted_at) : now;

    const [updated] = await tx
      .update(quotes)
      .set({
        status: 'accepted',
        acceptanceMode: 'paper',
        acceptedAt,
        acceptedByName: input.full_name,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quote.id), isNull(quotes.deletedAt)))
      .returning({ id: quotes.id, currentVersionId: quotes.currentVersionId, status: quotes.status });

    if (!updated) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    await lockNonCurrentVersionsForQuoteTx(tx, updated.id);

    const currentVersionId = updated.currentVersionId ?? null;

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'status_changed',
      metadata: { from: quote.status, to: 'accepted' },
    });

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'accept',
      metadata: {
        mode: 'paper',
        full_name: input.full_name,
        accepted_at: acceptedAt.toISOString(),
        notes: input.notes,
      },
    });

    return updated.id;
  });

  const aggregate = await getById(updatedId);
  if (!aggregate) {
    throw new HttpError(500, 'quote_load_failed', 'Unable to load accepted quote.');
  }

  return aggregate;
}

export async function undoAcceptance(quoteId: string): Promise<QuoteFull> {
  const updatedId = await db.transaction(async (tx) => {
    const quote = await loadQuoteByIdTx(tx, quoteId);

    if (!quote) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    if (quote.status !== 'accepted') {
      throw new HttpError(409, 'acceptance_undo_forbidden', 'Quote is not in accepted status.');
    }

    const now = new Date();

    const [updated] = await tx
      .update(quotes)
      .set({
        status: 'sent',
        acceptanceMode: null,
        acceptedAt: null,
        acceptedByName: null,
        updatedAt: now,
      })
      .where(and(eq(quotes.id, quote.id), isNull(quotes.deletedAt)))
      .returning({ id: quotes.id, currentVersionId: quotes.currentVersionId });

    if (!updated) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    const currentVersionId = updated.currentVersionId ?? null;

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'status_changed',
      metadata: { from: 'accepted', to: 'sent' },
    });

    await logActivityTx(tx, {
      quoteId: updated.id,
      versionId: currentVersionId,
      type: 'decline',
      metadata: { previous_status: 'accepted', reason: 'acceptance_undone' },
    });

    return updated.id;
  });

  const aggregate = await getById(updatedId);
  if (!aggregate) {
    throw new HttpError(500, 'quote_load_failed', 'Unable to load quote after acceptance undo.');
  }

  return aggregate;
}
