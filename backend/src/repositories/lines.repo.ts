import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { LineCreateDTO, LineUpdateDTO } from '../api/validators/lines';
import type { TransactionClient } from '../db/client';
import { quoteLines, type QuoteLine } from '../db/schema';
import { computeLineTotals } from '../services/totals.service';
import { HttpError } from '../utils/http-error';
import { recomputeVersionTotalsTx } from './versions.repo';

function toTaxRatePct(bps: number): string {
  const pct = Math.max(0, Math.min(2500, bps)) / 100;
  return pct.toFixed(4);
}

function normaliseQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0';
  }

  return value.toString();
}

export async function listLinesTx(
  tx: TransactionClient,
  versionId: string,
): Promise<QuoteLine[]> {
  return tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.versionId, versionId), isNull(quoteLines.deletedAt)))
    .orderBy(asc(quoteLines.position));
}

export async function createLineTx(
  tx: TransactionClient,
  versionId: string,
  dto: LineCreateDTO,
): Promise<QuoteLine> {
  const now = new Date();
  const lines = await listLinesTx(tx, versionId);
  const position = dto.position && dto.position > 0 ? dto.position : lines.length + 1;

  const totals = computeLineTotals({
    unit_cents: dto.unit_amount_cents,
    quantity: dto.qty,
    tax_rate_pct: dto.tax_rate_bps / 100,
  });

  const [created] = await tx
    .insert(quoteLines)
    .values({
      versionId,
      kind: dto.product_id ? 'product' : 'service',
      refId: dto.product_id ?? null,
      label: dto.description,
      description: dto.description,
      quantity: normaliseQuantity(dto.qty),
      unitPriceCents: Math.trunc(dto.unit_amount_cents),
      taxRatePct: toTaxRatePct(dto.tax_rate_bps),
      discountPct: '0',
      optional: false,
      position,
      netAmountCents: totals.net_cents,
      taxAmountCents: totals.tax_cents,
      grossAmountCents: totals.gross_cents,
      metadata: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new HttpError(500, 'line_create_failed', 'Failed to create line.');
  }

  await recomputeVersionTotalsTx(tx, versionId);

  return created;
}

export async function updateLineTx(
  tx: TransactionClient,
  id: string,
  dto: LineUpdateDTO,
): Promise<QuoteLine> {
  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, 'line_update_empty', 'No fields provided to update.');
  }

  const [existing] = await tx
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.id, id), isNull(quoteLines.deletedAt)))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'line_not_found', 'Line not found.');
  }

  const patch: Partial<typeof quoteLines.$inferInsert> = { updatedAt: new Date() };

  if (dto.description !== undefined) {
    patch.label = dto.description;
    patch.description = dto.description;
  }

  if (dto.product_id !== undefined) {
    patch.refId = dto.product_id ?? null;
    patch.kind = dto.product_id ? 'product' : 'service';
  }

  if (dto.position !== undefined) {
    patch.position = dto.position;
  }

  let totals = {
    net_cents: existing.netAmountCents,
    tax_cents: existing.taxAmountCents,
    gross_cents: existing.grossAmountCents,
  };

  const quantity = dto.qty ?? Number(existing.quantity);
  const unitAmount = dto.unit_amount_cents ?? existing.unitPriceCents;
  const taxRateBps = dto.tax_rate_bps ?? Math.round(Number(existing.taxRatePct) * 100);

  if (
    dto.qty !== undefined ||
    dto.unit_amount_cents !== undefined ||
    dto.tax_rate_bps !== undefined
  ) {
    totals = computeLineTotals({
      unit_cents: unitAmount,
      quantity,
      tax_rate_pct: taxRateBps / 100,
    });

    patch.quantity = normaliseQuantity(quantity);
    patch.unitPriceCents = Math.trunc(unitAmount);
    patch.taxRatePct = toTaxRatePct(taxRateBps);
    patch.netAmountCents = totals.net_cents;
    patch.taxAmountCents = totals.tax_cents;
    patch.grossAmountCents = totals.gross_cents;
  }

  const [updated] = await tx
    .update(quoteLines)
    .set(patch)
    .where(eq(quoteLines.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(500, 'line_update_failed', 'Failed to update line.');
  }

  await recomputeVersionTotalsTx(tx, updated.versionId);

  return updated;
}

export async function softDeleteLineTx(
  tx: TransactionClient,
  id: string,
): Promise<void> {
  const now = new Date();

  const [deleted] = await tx
    .update(quoteLines)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(quoteLines.id, id), isNull(quoteLines.deletedAt)))
    .returning({ id: quoteLines.id, versionId: quoteLines.versionId });

  if (!deleted) {
    throw new HttpError(404, 'line_not_found', 'Line not found.');
  }

  await tx
    .update(quoteLines)
    .set({
      position: sql`row_number() over (order by position)`,
      updatedAt: now,
    })
    .where(and(eq(quoteLines.versionId, deleted.versionId), isNull(quoteLines.deletedAt)));

  await recomputeVersionTotalsTx(tx, deleted.versionId);
}
