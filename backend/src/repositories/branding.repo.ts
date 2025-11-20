import { eq } from 'drizzle-orm';

import type { TransactionClient } from '../db/client';
import { brandingConfigs, type BrandingConfig } from '../db/schema';

export interface BrandingConfigUpsertInput {
  id?: string;
  label: string;
  companyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  pdfFooterText?: string | null;
  defaultValidityDays?: number | null;
  defaultDepositPct?: number | null;
}

export async function getBrandingConfigTx(tx: TransactionClient): Promise<BrandingConfig | null> {
  const [config] = await tx.select().from(brandingConfigs).limit(1);
  return config ?? null;
}

export async function upsertBrandingConfigTx(
  tx: TransactionClient,
  input: BrandingConfigUpsertInput,
): Promise<BrandingConfig> {
  const now = new Date();

  const whereClause = input.id
    ? eq(brandingConfigs.id, input.id)
    : eq(brandingConfigs.label, input.label);

  const [existing] = await tx
    .select()
    .from(brandingConfigs)
    .where(whereClause)
    .limit(1);

  const baseValues: Partial<typeof brandingConfigs.$inferInsert> = {
    label: input.label,
    companyName: input.companyName ?? null,
    logoUrl: input.logoUrl ?? null,
    primaryColor: input.primaryColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    pdfFooterText: input.pdfFooterText ?? null,
    defaultValidityDays:
      input.defaultValidityDays === undefined ? null : input.defaultValidityDays,
    defaultDepositPct:
      input.defaultDepositPct === undefined ? null : input.defaultDepositPct,
    updatedAt: now,
  };

  if (existing) {
    const [updated] = await tx
      .update(brandingConfigs)
      .set(baseValues)
      .where(eq(brandingConfigs.id, existing.id))
      .returning();

    return updated;
  }

  const [created] = await tx
    .insert(brandingConfigs)
    .values({
      id: input.id,
      ...baseValues,
      createdAt: now,
    })
    .returning();

  return created;
}
