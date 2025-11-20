import { asc, eq } from 'drizzle-orm';

import type { AdminProductCreateDTO, AdminProductUpdateDTO } from '../api/validators/admin-catalog';
import type { TransactionClient } from '../db/client';
import { products, type Product } from '../db/schema';
import { HttpError } from '../utils/http-error';
import { getTaxRateByIdTx } from './tax-rates.repo';

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value);
}

export async function listActiveProductsTx(tx: TransactionClient): Promise<Product[]> {
  return tx
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));
}

export async function getProductByIdTx(
  tx: TransactionClient,
  id: string,
): Promise<Product | null> {
  const [product] = await tx
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return product ?? null;
}

async function resolveDefaultTaxRateIdOrThrow(
  tx: TransactionClient,
  rawId: string | null | undefined,
): Promise<string | null | undefined> {
  if (rawId === undefined) {
    return undefined;
  }

  if (rawId === null) {
    return null;
  }

  if (!isValidUuid(rawId)) {
    throw new HttpError(400, 'invalid_tax_rate_id', 'Invalid tax rate id.');
  }

  const rate = await getTaxRateByIdTx(tx, rawId);
  if (!rate) {
    throw new HttpError(400, 'invalid_tax_rate_id', 'Invalid tax rate id.');
  }

  return rate.id;
}

export async function createProductTx(
  tx: TransactionClient,
  dto: AdminProductCreateDTO,
): Promise<Product> {
  const now = new Date();

  const resolvedTaxRateId = await resolveDefaultTaxRateIdOrThrow(
    tx,
    dto.default_tax_rate_id ?? null,
  );

  const [created] = await tx
    .insert(products)
    .values({
      internalCode: dto.internal_code ?? null,
      name: dto.name,
      description: dto.description ?? null,
      defaultUnitPriceCents: dto.default_unit_price_cents,
      defaultTaxRateId: resolvedTaxRateId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!created) {
    throw new HttpError(500, 'product_create_failed', 'Failed to create product.');
  }

  return created;
}

export async function updateProductTx(
  tx: TransactionClient,
  id: string,
  dto: AdminProductUpdateDTO,
): Promise<Product> {
  const [existing] = await tx
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'product_not_found', 'Product not found.');
  }

  const now = new Date();
  const patch: Partial<typeof products.$inferInsert> = {
    updatedAt: now,
  };

  if (dto.internal_code !== undefined) {
    patch.internalCode = dto.internal_code ?? null;
  }

  if (dto.name !== undefined) {
    patch.name = dto.name;
  }

  if (dto.description !== undefined) {
    patch.description = dto.description ?? null;
  }

  if (dto.default_unit_price_cents !== undefined) {
    patch.defaultUnitPriceCents = dto.default_unit_price_cents;
  }

  if (dto.default_tax_rate_id !== undefined) {
    const resolvedTaxRateId = await resolveDefaultTaxRateIdOrThrow(
      tx,
      dto.default_tax_rate_id,
    );

    patch.defaultTaxRateId = resolvedTaxRateId ?? null;
  }

  const [updated] = await tx
    .update(products)
    .set(patch)
    .where(eq(products.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, 'product_not_found', 'Product not found.');
  }

  return updated;
}
