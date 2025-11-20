import { asc, eq } from 'drizzle-orm';

import type { AdminTaxRateCreateDTO, AdminTaxRateUpdateDTO } from '../api/validators/admin-catalog';
import type { TransactionClient } from '../db/client';
import { taxRates, type TaxRate } from '../db/schema';
import { HttpError } from '../utils/http-error';

const UNIQUE_VIOLATION = '23505';

export async function listActiveTaxRatesTx(tx: TransactionClient): Promise<TaxRate[]> {
  return tx
    .select()
    .from(taxRates)
    .where(eq(taxRates.isActive, true))
    .orderBy(asc(taxRates.rateBps), asc(taxRates.name));
}

export async function getDefaultTaxRateTx(tx: TransactionClient): Promise<TaxRate | null> {
  const [rate] = await tx
    .select()
    .from(taxRates)
    .where(eq(taxRates.isDefault, true))
    .limit(1);

  return rate ?? null;
}

export async function getTaxRateByIdTx(
  tx: TransactionClient,
  id: string,
): Promise<TaxRate | null> {
  const [rate] = await tx
    .select()
    .from(taxRates)
    .where(eq(taxRates.id, id))
    .limit(1);

  return rate ?? null;
}

export async function createTaxRateTx(
  tx: TransactionClient,
  dto: AdminTaxRateCreateDTO,
): Promise<TaxRate> {
  const now = new Date();

  if (dto.is_default) {
    await tx
      .update(taxRates)
      .set({ isDefault: false, updatedAt: now })
      .where(eq(taxRates.isDefault, true));
  }

  let created: TaxRate | undefined;

  try {
    [created] = await tx
      .insert(taxRates)
      .values({
        name: dto.name,
        code: dto.code,
        rateBps: dto.rate_bps,
        isDefault: dto.is_default,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  } catch (error) {
    if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'tax_rate_code_conflict', 'Tax rate code already exists.');
    }

    throw error;
  }

  if (!created) {
    throw new HttpError(500, 'tax_rate_create_failed', 'Failed to create tax rate.');
  }

  return created;
}

export async function updateTaxRateTx(
  tx: TransactionClient,
  id: string,
  dto: AdminTaxRateUpdateDTO,
): Promise<TaxRate> {
  const [existing] = await tx
    .select()
    .from(taxRates)
    .where(eq(taxRates.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'tax_rate_not_found', 'Tax rate not found.');
  }

  const now = new Date();
  const patch: Partial<typeof taxRates.$inferInsert> = {
    updatedAt: now,
  };

  if (dto.name !== undefined) {
    patch.name = dto.name;
  }

  if (dto.code !== undefined) {
    patch.code = dto.code;
  }

  if (dto.rate_bps !== undefined) {
    patch.rateBps = dto.rate_bps;
  }

  if (dto.is_default !== undefined) {
    patch.isDefault = dto.is_default;

    if (dto.is_default) {
      await tx
        .update(taxRates)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(taxRates.isDefault, true));
    }
  }

  let updated: TaxRate | undefined;

  try {
    [updated] = await tx
      .update(taxRates)
      .set(patch)
      .where(eq(taxRates.id, id))
      .returning();
  } catch (error) {
    if ((error as { code?: string })?.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'tax_rate_code_conflict', 'Tax rate code already exists.');
    }

    throw error;
  }

  if (!updated) {
    throw new HttpError(404, 'tax_rate_not_found', 'Tax rate not found.');
  }

  return updated;
}
