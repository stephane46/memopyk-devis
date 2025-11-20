import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { QuoteCreateDTO, QuoteUpdateDTO } from '../api/validators/quotes';
import { db, type TransactionClient } from '../db/client';
import {
  quoteLines,
  quoteVersions,
  quotes,
  type BrandingConfig,
  type Quote,
  type QuoteLine,
  type QuoteVersion,
} from '../db/schema';
import { reserveQuoteNumber } from '../services/numbering.service';
import { computeLineTotals } from '../services/totals.service';
import { HttpError } from '../utils/http-error';
import { getBrandingConfigTx } from './branding.repo';
import type { LineCreateDTO } from '../api/validators/lines';
import { lockNonCurrentVersionsForQuoteTx, recomputeVersionTotalsTx } from './versions.repo';
import { logActivityTx } from './activities.repo';

const UNIQUE_VIOLATION = '23505';

export interface QuoteFull {
  quote: Quote;
  currentVersion: QuoteVersion | null;
  lines: QuoteLine[];
}

export interface QuoteListItem {
  quote: Quote;
  currentVersion: QuoteVersion | null;
}

export interface QuoteListFilters {
  status?: Quote['status'][];
  q?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

function normaliseQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }

  return value.toString();
}

function toTaxRatePercentage(basisPoints: number): string {
  const percentage = Math.max(0, Math.min(2500, basisPoints)) / 100; // convert bps → percent
  return percentage.toFixed(4);
}

function buildWhere(conditions: Array<SQL | undefined>): SQL | undefined {
  const filtered = conditions.filter((condition): condition is SQL => Boolean(condition));
  if (filtered.length === 0) {
    return undefined;
  }

  if (filtered.length === 1) {
    return filtered[0];
  }

  return and(...filtered);
}

async function fetchAggregate(where: SQL): Promise<QuoteFull | null> {
  const result = await db.query.quotes.findFirst({
    where,
    with: {
      currentVersion: {
        with: {
          lines: {
            where: isNull(quoteLines.deletedAt),
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

async function insertLines(
  tx: TransactionClient,
  versionId: string,
  lines: LineCreateDTO[],
): Promise<void> {
  const now = new Date();

  const orderedLines = lines
    .map((line, index) => ({ ...line, __position: line.position ?? index + 1 }))
    .sort((a, b) => a.__position - b.__position);

  for (let index = 0; index < orderedLines.length; index += 1) {
    const line = orderedLines[index];
    const position = index + 1;
    const taxRatePercent = line.tax_rate_bps / 100; // convert bps → percent

    const totals = computeLineTotals({
      unit_cents: line.unit_amount_cents,
      quantity: line.qty,
      tax_rate_pct: taxRatePercent,
    });

    await tx.insert(quoteLines).values({
      versionId,
      kind: line.product_id ? 'product' : 'service',
      refId: line.product_id ?? null,
      label: line.description,
      description: line.description,
      quantity: normaliseQuantity(line.qty),
      unitPriceCents: Math.trunc(line.unit_amount_cents),
      taxRatePct: toTaxRatePercentage(line.tax_rate_bps),
      discountPct: '0',
      optional: false,
      position,
      netAmountCents: totals.net_cents,
      taxAmountCents: totals.tax_cents,
      grossAmountCents: totals.gross_cents,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export function computeQuoteBrandingDefaults(
  now: Date,
  dto: QuoteCreateDTO,
  branding: BrandingConfig | null,
): { validUntil: string | null; depositPct: string } {
  let validUntil: string | null = null;

  if (dto.valid_until !== undefined) {
    validUntil = dto.valid_until ?? null;
  } else if (branding?.defaultValidityDays != null) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    base.setUTCDate(base.getUTCDate() + branding.defaultValidityDays);
    validUntil = base.toISOString().slice(0, 10);
  }

  let depositPct = '0';

  if (dto.deposit_pct !== undefined) {
    depositPct = dto.deposit_pct.toString();
  } else if (branding?.defaultDepositPct != null) {
    depositPct = branding.defaultDepositPct.toString();
  }

  return { validUntil, depositPct };
}

export async function createQuote(dto: QuoteCreateDTO): Promise<{ id: string; number: string }> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const quoteNumber = await reserveQuoteNumber(tx);
        const now = new Date();
        const branding = await getBrandingConfigTx(tx);
        const { validUntil, depositPct } = computeQuoteBrandingDefaults(now, dto, branding);

        const [quote] = await tx
          .insert(quotes)
          .values({
            number: quoteNumber,
            customerName: dto.customer_name,
            title: dto.title,
            summary: dto.notes ?? null,
            currencyCode: dto.currency,
            status: 'draft',
            validUntil,
            depositPct,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!quote) {
          throw new HttpError(500, 'quote_create_failed', 'Failed to persist quote.');
        }

        const [version] = await tx
          .insert(quoteVersions)
          .values({
            quoteId: quote.id,
            versionNumber: 1,
            status: 'current',
            title: dto.title,
            intro: dto.notes ?? null,
            notes: dto.notes ?? null,
            currencyCode: dto.currency,
            validityDate: validUntil,
            depositPct,
            totalsNetCents: 0,
            totalsTaxCents: 0,
            totalsGrossCents: 0,
            totalsDepositCents: 0,
            totalsBalanceCents: 0,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (!version) {
          throw new HttpError(500, 'version_create_failed', 'Failed to create initial version.');
        }

        await tx
          .update(quotes)
          .set({ currentVersionId: version.id, updatedAt: now })
          .where(eq(quotes.id, quote.id));

        if (dto.lines.length > 0) {
          await insertLines(tx, version.id, dto.lines);
          await recomputeVersionTotalsTx(tx, version.id);
        }

        await logActivityTx(tx, {
          quoteId: quote.id,
          versionId: version.id,
          type: 'created',
          metadata: { number: quote.number },
        });

        return { id: quote.id, number: quoteNumber };
      });
    } catch (error) {
      if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
        continue;
      }

      throw error;
    }
  }

  throw new HttpError(409, 'quote_number_conflict', 'Unable to generate unique quote number.');
}

export async function getById(id: string): Promise<QuoteFull | null> {
  const where = and(eq(quotes.id, id), isNull(quotes.deletedAt));
  if (!where) {
    return null;
  }

  return fetchAggregate(where);
}

export async function getByNumber(number: string): Promise<QuoteFull | null> {
  const where = and(eq(quotes.number, number), isNull(quotes.deletedAt));
  if (!where) {
    return null;
  }

  return fetchAggregate(where);
}

export async function list(filters?: QuoteListFilters): Promise<QuoteListItem[]> {
  const where = buildWhere([
    isNull(quotes.deletedAt),
    filters?.status && filters.status.length > 0 ? inArray(quotes.status, filters.status) : undefined,
    filters?.from ? gte(quotes.createdAt, filters.from) : undefined,
    filters?.to ? lte(quotes.createdAt, filters.to) : undefined,
    filters?.q
      ? or(
          ilike(quotes.number, `%${filters.q}%`),
          ilike(quotes.title, `%${filters.q}%`),
          ilike(quotes.customerName, `%${filters.q}%`),
        )
      : undefined,
  ]);

  const items = await db.query.quotes.findMany({
    where,
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
    orderBy: (quote, { desc: orderDesc }) => [orderDesc(quote.createdAt)],
    with: {
      currentVersion: true,
    },
  });

  return items.map(({ currentVersion, ...quote }) => ({
    quote,
    currentVersion: currentVersion ?? null,
  }));
}

export async function updateMeta(id: string, patch: QuoteUpdateDTO): Promise<void> {
  if (Object.keys(patch).length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(quotes)
      .where(and(eq(quotes.id, id), isNull(quotes.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    const now = new Date();
    const updatePayload: Partial<typeof quotes.$inferInsert> = {
      updatedAt: now,
    };

    if (patch.title !== undefined) {
      updatePayload.title = patch.title;
    }

    if (patch.customer_name !== undefined) {
      updatePayload.customerName = patch.customer_name;
    }

    if (patch.notes !== undefined) {
      updatePayload.summary = patch.notes;
    }

    if (patch.currency !== undefined) {
      updatePayload.currencyCode = patch.currency;
    }

    if (patch.status !== undefined) {
      updatePayload.status = patch.status as Quote['status'];
    }

    if (patch.valid_until !== undefined) {
      updatePayload.validUntil = patch.valid_until === null ? null : patch.valid_until;
    }

    const [updated] = await tx
      .update(quotes)
      .set(updatePayload)
      .where(and(eq(quotes.id, id), isNull(quotes.deletedAt)))
      .returning({ id: quotes.id });

    if (!updated) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    if (patch.status === 'accepted' && existing.status !== 'accepted') {
      await lockNonCurrentVersionsForQuoteTx(tx, id);
    }

    const currentVersionId = existing.currentVersionId ?? null;

    const activities: Array<{
      type: 'updated' | 'status_changed' | 'send' | 'accept' | 'decline';
      metadata?: Record<string, unknown>;
    }> = [];

    activities.push({
      type: 'updated',
      metadata: { patch },
    });

    if (patch.status && patch.status !== existing.status) {
      activities.push({
        type: 'status_changed',
        metadata: { from: existing.status, to: patch.status },
      });

      if (patch.status === 'sent') {
        activities.push({
          type: 'send',
          metadata: { from: existing.status, to: patch.status },
        });
      } else if (patch.status === 'accepted') {
        activities.push({
          type: 'accept',
          metadata: { from: existing.status, to: patch.status },
        });
      } else if (patch.status === 'declined') {
        activities.push({
          type: 'decline',
          metadata: { from: existing.status, to: patch.status },
        });
      }
    }

    for (const activity of activities) {
      await logActivityTx(tx, {
        quoteId: id,
        versionId: currentVersionId,
        type: activity.type,
        metadata: activity.metadata ?? null,
      });
    }
  });
}

export async function softDelete(id: string): Promise<void> {
  const now = new Date();
  const [deleted] = await db
    .update(quotes)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(quotes.id, id), isNull(quotes.deletedAt)))
    .returning({ id: quotes.id });

  if (!deleted) {
    throw new HttpError(404, 'quote_not_found', 'Quote not found.');
  }
}

export async function restore(id: string): Promise<void> {
  const now = new Date();
  const [restored] = await db
    .update(quotes)
    .set({ deletedAt: null, updatedAt: now })
    .where(eq(quotes.id, id))
    .returning({ id: quotes.id, deletedAt: quotes.deletedAt });

  if (!restored) {
    throw new HttpError(404, 'quote_not_found', 'Quote not found.');
  }
}
