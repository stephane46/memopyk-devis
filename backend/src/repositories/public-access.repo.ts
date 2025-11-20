import { eq } from 'drizzle-orm';

import { db, type TransactionClient } from '../db/client';
import { quotePublicLinks, quotes } from '../db/schema';
import { HttpError } from '../utils/http-error';
import { getPublicLinkByTokenTx } from './public-links.repo';
import { logActivityTx } from './activities.repo';
import type { PublicPinSubmitDTO } from '../api/validators/public-links';
import type { QuoteFull } from './quotes.repo';
import { verifyPin } from '../services/pin-hash.service';

async function loadQuoteAggregateForPublicTx(
  tx: TransactionClient,
  quoteId: string,
): Promise<QuoteFull | null> {
  const result = await tx.query.quotes.findFirst({
    where: (quote, { eq: equals }) => equals(quote.id, quoteId),
    with: {
      currentVersion: {
        with: {
          lines: {
            where: (line, { isNull }) => isNull(line.deletedAt),
            orderBy: (line, { asc }) => [asc(line.position)],
          },
        },
      },
    },
  });

  if (!result) {
    return null;
  }

  const { currentVersion, ...quote } = result;
  return {
    quote,
    currentVersion: currentVersion ?? null,
    lines: currentVersion?.lines ?? [],
  };
}

export async function getPublicQuoteViewByQuoteIdTx(
  tx: TransactionClient,
  quoteId: string,
): Promise<QuotePublicView | null> {
  const aggregate = await loadQuoteAggregateForPublicTx(tx, quoteId);

  if (!aggregate) {
    return null;
  }

  return toPublicView(aggregate);
}

export interface QuotePublicView {
  quote: {
    number: string;
    customer_name: string | null;
    status: string;
    acceptance_mode: string | null;
    accepted_at: string | null;
    accepted_by_name: string | null;
    created_at: string;
    valid_until: string | null;
    currency_code: string;
  };
  current_version: {
    id: string;
    title: string;
    validity_date: string | null;
    totals_net_cents: number;
    totals_tax_cents: number;
    totals_gross_cents: number;
    totals_deposit_cents: number;
    totals_balance_cents: number;
  } | null;
  lines: Array<{
    id: string;
    label: string;
    description: string | null;
    quantity: string;
    unit_price_cents: number;
    tax_rate_pct: string;
    discount_pct: string;
    optional: boolean;
    position: number;
    net_amount_cents: number;
    tax_amount_cents: number;
    gross_amount_cents: number;
  }>;
}

function toPublicView(aggregate: QuoteFull): QuotePublicView {
  const { quote, currentVersion, lines } = aggregate;

  return {
    quote: {
      number: quote.number,
      customer_name: quote.customerName ?? null,
      status: quote.status,
      acceptance_mode: quote.acceptanceMode ?? null,
      accepted_at: quote.acceptedAt ? new Date(quote.acceptedAt).toISOString() : null,
      accepted_by_name: quote.acceptedByName ?? null,
      created_at: new Date(quote.createdAt).toISOString(),
      valid_until: quote.validUntil ? new Date(quote.validUntil).toISOString() : null,
      currency_code: quote.currencyCode,
    },
    current_version: currentVersion
      ? {
          id: currentVersion.id,
          title: currentVersion.title,
          validity_date: currentVersion.validityDate
            ? new Date(currentVersion.validityDate).toISOString()
            : null,
          totals_net_cents: currentVersion.totalsNetCents,
          totals_tax_cents: currentVersion.totalsTaxCents,
          totals_gross_cents: currentVersion.totalsGrossCents,
          totals_deposit_cents: currentVersion.totalsDepositCents,
          totals_balance_cents: currentVersion.totalsBalanceCents,
        }
      : null,
    lines: lines.map((line) => ({
      id: line.id,
      label: line.label,
      description: line.description ?? null,
      quantity: line.quantity,
      unit_price_cents: line.unitPriceCents,
      tax_rate_pct: line.taxRatePct,
      discount_pct: line.discountPct,
      optional: line.optional,
      position: line.position,
      net_amount_cents: line.netAmountCents,
      tax_amount_cents: line.taxAmountCents,
      gross_amount_cents: line.grossAmountCents,
    })),
  };
}

export async function getPublicQuoteViewByToken(publicToken: string): Promise<QuotePublicView> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const link = await getPublicLinkByTokenTx(tx, publicToken);

    if (!link) {
      throw new HttpError(404, 'public_link_not_found', 'Public link not found.');
    }

    const aggregate = await loadQuoteAggregateForPublicTx(tx, link.quoteId);

    if (!aggregate) {
      throw new HttpError(404, 'public_link_not_found', 'Public link not found.');
    }

    if (link.pinHash) {
      if (link.pinLockedUntil && link.pinLockedUntil > now) {
        throw new HttpError(403, 'pin_locked', 'PIN is temporarily locked.', {
          unlock_at: link.pinLockedUntil.toISOString(),
        });
      }

      throw new HttpError(403, 'pin_required', 'PIN is required to view this quote.');
    }

    await logActivityTx(tx, {
      quoteId: link.quoteId,
      versionId: aggregate.currentVersion?.id ?? null,
      type: 'view',
      metadata: { source: 'public_view' },
    });

    return toPublicView(aggregate);
  });
}

export async function verifyPublicPinByToken(
  publicToken: string,
  input: PublicPinSubmitDTO,
): Promise<{ pin_valid: true }> {
  const maxAttempts = 5;
  const lockMinutes = 15;

  return db.transaction(async (tx) => {
    const link = await getPublicLinkByTokenTx(tx, publicToken);

    if (!link) {
      throw new HttpError(404, 'public_link_not_found', 'Public link not found.');
    }

    if (!link.pinHash) {
      throw new HttpError(400, 'pin_not_required', 'No PIN is configured for this public link.');
    }

    const now = new Date();

    if (link.pinLockedUntil && link.pinLockedUntil > now) {
      throw new HttpError(403, 'pin_locked', 'PIN is temporarily locked.', {
        unlock_at: link.pinLockedUntil.toISOString(),
      });
    }

    const isValid = verifyPin(input.pin, link.pinHash);

    if (isValid) {
      await tx
        .update(quotePublicLinks)
        .set({ pinFailedAttempts: 0, pinLockedUntil: null, updatedAt: now })
        .where(eq(quotePublicLinks.id, link.id));

      await logActivityTx(tx, {
        quoteId: link.quoteId,
        versionId: null,
        type: 'pin_verified',
        metadata: {},
      });

      return { pin_valid: true } as const;
    }

    const failedAttempts = (link.pinFailedAttempts ?? 0) + 1;

    if (failedAttempts >= maxAttempts) {
      const unlockAt = new Date(now.getTime() + lockMinutes * 60 * 1000);

      await tx
        .update(quotePublicLinks)
        .set({
          pinFailedAttempts: failedAttempts,
          pinLockedUntil: unlockAt,
          updatedAt: now,
        })
        .where(eq(quotePublicLinks.id, link.id));

      await logActivityTx(tx, {
        quoteId: link.quoteId,
        versionId: null,
        type: 'pin_failed',
        metadata: { remaining_attempts: 0 },
      });

      await logActivityTx(tx, {
        quoteId: link.quoteId,
        versionId: null,
        type: 'pin_locked',
        metadata: { unlock_at: unlockAt.toISOString() },
      });

      throw new HttpError(403, 'pin_locked', 'PIN is temporarily locked.', {
        unlock_at: unlockAt.toISOString(),
      });
    }

    const remainingAttempts = Math.max(0, maxAttempts - failedAttempts);

    await tx
      .update(quotePublicLinks)
      .set({ pinFailedAttempts: failedAttempts, updatedAt: now })
      .where(eq(quotePublicLinks.id, link.id));

    await logActivityTx(tx, {
      quoteId: link.quoteId,
      versionId: null,
      type: 'pin_failed',
      metadata: { remaining_attempts: remainingAttempts },
    });

    throw new HttpError(403, 'pin_invalid', 'Invalid PIN.', {
      remaining_attempts: remainingAttempts,
    });
  });
}
