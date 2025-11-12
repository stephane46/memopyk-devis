import { and, desc, eq, isNull, max } from 'drizzle-orm';

import type { LineCreateDTO } from '../api/validators/lines';
import type { TransactionClient } from '../db/client';
import {
  quoteLines,
  quoteVersions,
  quotes,
  type QuoteLine,
  type QuoteVersion,
} from '../db/schema';
import {
  computeLineTotals,
  computeVersionTotals,
  type LineInput,
} from '../services/totals.service';
import { HttpError } from '../utils/http-error';

function toLineInput(line: QuoteLine): LineInput {
  return {
    unit_cents: line.unitPriceCents,
    quantity: Number(line.quantity),
    tax_rate_pct: Number(line.taxRatePct),
  };
}

function toDepositPct(value: string | null | undefined): string {
  if (!value) {
    return '0';
  }

  return value;
}

export async function recomputeVersionTotalsTx(
  tx: TransactionClient,
  versionId: string,
): Promise<void> {
  const lines = await tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.versionId, versionId), isNull(quoteLines.deletedAt)))
    .orderBy(quoteLines.position);

  const totals = computeVersionTotals(lines.map(toLineInput));

  await tx
    .update(quoteVersions)
    .set({
      totalsNetCents: totals.lines_net_cents,
      totalsTaxCents: totals.lines_tax_cents,
      totalsGrossCents: totals.lines_gross_cents,
      updatedAt: new Date(),
    })
    .where(eq(quoteVersions.id, versionId));
}

export async function duplicateVersionTx(
  tx: TransactionClient,
  versionId: string,
): Promise<QuoteVersion> {
  const [version] = await tx
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.id, versionId), isNull(quoteVersions.deletedAt)))
    .limit(1);

  if (!version) {
    throw new HttpError(404, 'version_not_found', 'Version not found.');
  }

  const [nextNumberRow] = await tx
    .select({ value: max(quoteVersions.versionNumber).as('max') })
    .from(quoteVersions)
    .where(eq(quoteVersions.quoteId, version.quoteId));

  const nextVersionNumber = (nextNumberRow?.value ?? 0) + 1;
  const now = new Date();

  const [created] = await tx
    .insert(quoteVersions)
    .values({
      quoteId: version.quoteId,
      versionNumber: nextVersionNumber,
      status: 'draft',
      label: version.label,
      title: version.title,
      intro: version.intro,
      notes: version.notes,
      currencyCode: version.currencyCode,
      validityDate: version.validityDate,
      depositPct: version.depositPct,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new HttpError(500, 'version_duplicate_failed', 'Failed to duplicate version.');
  }

  const lines = await tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.versionId, versionId), isNull(quoteLines.deletedAt)))
    .orderBy(quoteLines.position);

  for (const line of lines) {
    await tx.insert(quoteLines).values({
      versionId: created.id,
      kind: line.kind,
      refId: line.refId,
      label: line.label,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxRatePct: line.taxRatePct,
      discountPct: line.discountPct,
      optional: line.optional,
      position: line.position,
      netAmountCents: line.netAmountCents,
      taxAmountCents: line.taxAmountCents,
      grossAmountCents: line.grossAmountCents,
      metadata: line.metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recomputeVersionTotalsTx(tx, created.id);

  return created;
}

export async function createVersionWithLinesTx(
  tx: TransactionClient,
  quoteId: string,
  payload: { version: Partial<QuoteVersion>; lines: LineCreateDTO[] },
): Promise<QuoteVersion> {
  const now = new Date();

  const [nextNumberRow] = await tx
    .select({ value: max(quoteVersions.versionNumber).as('max') })
    .from(quoteVersions)
    .where(eq(quoteVersions.quoteId, quoteId));

  const nextVersionNumber = (nextNumberRow?.value ?? 0) + 1;

  const insertValues = {
    quoteId,
    versionNumber: nextVersionNumber,
    status: payload.version.status ?? 'draft',
    title: payload.version.title ?? 'Nouvelle version',
    intro: payload.version.intro ?? null,
    notes: payload.version.notes ?? null,
    label: payload.version.label ?? null,
    currencyCode: payload.version.currencyCode ?? 'EUR',
    validityDate: payload.version.validityDate ?? null,
    depositPct: toDepositPct(payload.version.depositPct),
    totalsNetCents: 0,
    totalsTaxCents: 0,
    totalsGrossCents: 0,
    totalsDepositCents: 0,
    totalsBalanceCents: 0,
    isLocked: payload.version.isLocked ?? false,
    createdAt: now,
    updatedAt: now,
  } satisfies Record<string, unknown>;

  const [created] = await tx
    .insert(quoteVersions)
    .values(insertValues)
    .returning();

  if (!created) {
    throw new HttpError(500, 'version_create_failed', 'Failed to create version.');
  }

  if (payload.lines.length > 0) {
    let positionCounter = 1;
    for (const line of payload.lines) {
      const totals = computeLineTotals({
        unit_cents: line.unit_amount_cents,
        quantity: line.qty,
        tax_rate_pct: line.tax_rate_bps / 100,
      });

      await tx.insert(quoteLines).values({
        versionId: created.id,
        kind: line.product_id ? 'product' : 'service',
        refId: line.product_id ?? null,
        label: line.description,
        description: line.description,
        quantity: line.qty.toString(),
        unitPriceCents: Math.trunc(line.unit_amount_cents),
        taxRatePct: (line.tax_rate_bps / 100).toFixed(4),
        discountPct: '0',
        optional: false,
        position: positionCounter,
        netAmountCents: totals.net_cents,
        taxAmountCents: totals.tax_cents,
        grossAmountCents: totals.gross_cents,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });

      positionCounter += 1;
    }

    await recomputeVersionTotalsTx(tx, created.id);
  }

  return created;
}

export async function setCurrentVersionTx(
  tx: TransactionClient,
  versionId: string,
): Promise<void> {
  const [version] = await tx
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.id, versionId), isNull(quoteVersions.deletedAt)))
    .limit(1);

  if (!version) {
    throw new HttpError(404, 'version_not_found', 'Version not found.');
  }

  await tx
    .update(quoteVersions)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(and(eq(quoteVersions.quoteId, version.quoteId), isNull(quoteVersions.deletedAt)));

  await tx
    .update(quoteVersions)
    .set({ status: 'current', updatedAt: new Date() })
    .where(eq(quoteVersions.id, versionId));

  await tx
    .update(quotes)
    .set({ currentVersionId: versionId, updatedAt: new Date() })
    .where(eq(quotes.id, version.quoteId));
}

export async function listVersionsTx(
  tx: TransactionClient,
  quoteId: string,
): Promise<QuoteVersion[]> {
  return tx
    .select()
    .from(quoteVersions)
    .where(and(eq(quoteVersions.quoteId, quoteId), isNull(quoteVersions.deletedAt)))
    .orderBy(desc(quoteVersions.versionNumber));
}
