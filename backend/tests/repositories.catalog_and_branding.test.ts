import { describe, it, expect } from 'vitest';

import type { TransactionClient } from '../src/db/client';
import type { TaxRate, Product, BrandingConfig } from '../src/db/schema';
import { listActiveTaxRatesTx, getDefaultTaxRateTx } from '../src/repositories/tax-rates.repo';
import { listActiveProductsTx, getProductByIdTx } from '../src/repositories/products.repo';
import { getBrandingConfigTx, upsertBrandingConfigTx } from '../src/repositories/branding.repo';

function createTaxRatesTxFixture(rates: TaxRate[]): TransactionClient {
  const rows = [...rates];

  const tx: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => rows,
          limit: async (count?: number) => {
            if (!count || count >= rows.length) {
              return rows;
            }

            return rows.slice(0, count);
          },
        }),
      }),
    }),
  };

  return tx as TransactionClient;
}

function createProductsTxFixture(productsList: Product[]): TransactionClient {
  const rows = [...productsList];

  const tx: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => rows,
          limit: async () => rows.slice(0, 1),
        }),
      }),
    }),
  };

  return tx as TransactionClient;
}

function createBrandingTxFixture(initial?: BrandingConfig | null): TransactionClient {
  let current: BrandingConfig | null = initial ?? null;

  const tx: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (current ? [current] : []),
        }),
        limit: async () => (current ? [current] : []),
      }),
    }),
    update: () => ({
      set: (values: Partial<BrandingConfig>) => ({
        where: () => ({
          returning: async () => {
            current = { ...(current as BrandingConfig), ...(values as BrandingConfig) };
            return [current];
          },
        }),
      }),
    }),
    insert: () => ({
      values: (values: Partial<BrandingConfig>) => ({
        returning: async () => {
          current = {
            id: (values.id as string) ?? '00000000-0000-0000-0000-000000000000',
            label: values.label as string,
            companyName: (values.companyName ?? null) as string | null,
            logoUrl: (values.logoUrl ?? null) as string | null,
            primaryColor: (values.primaryColor ?? null) as string | null,
            secondaryColor: (values.secondaryColor ?? null) as string | null,
            pdfFooterText: (values.pdfFooterText ?? null) as string | null,
            defaultValidityDays: (values.defaultValidityDays ?? null) as number | null,
            defaultDepositPct: (values.defaultDepositPct ?? null) as number | null,
            createdAt: (values.createdAt as Date) ?? new Date(),
            updatedAt: (values.updatedAt as Date) ?? new Date(),
          };

          return [current];
        },
      }),
    }),
  };

  return tx as TransactionClient;
}

describe('tax-rates.repo', () => {
  it('lists active tax rates and returns the default rate when present', async () => {
    const sampleRates: TaxRate[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'TVA 20 %',
        code: 'TVA20',
        rateBps: 2000,
        isDefault: true,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ];

    const tx = createTaxRatesTxFixture(sampleRates);

    const active = await listActiveTaxRatesTx(tx);
    expect(active).toHaveLength(1);
    expect(active[0].code).toBe('TVA20');

    const def = await getDefaultTaxRateTx(tx);
    expect(def).not.toBeNull();
    expect(def?.isDefault).toBe(true);
  });
});

describe('products.repo', () => {
  it('lists active products and can load a product by id', async () => {
    const sampleProducts: Product[] = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        internalCode: 'MEMO-FILM-CLASSIC',
        name: 'Film MEMOPYK Classique',
        description: 'Pack tournage + montage',
        defaultUnitPriceCents: 120000,
        defaultTaxRateId: null,
        isActive: true,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ];

    const tx = createProductsTxFixture(sampleProducts);

    const active = await listActiveProductsTx(tx);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Film MEMOPYK Classique');

    const byId = await getProductByIdTx(tx, sampleProducts[0].id);
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(sampleProducts[0].id);
  });
});

describe('branding.repo', () => {
  it('returns the first branding config when present', async () => {
    const initial: BrandingConfig = {
      id: '33333333-3333-3333-3333-333333333333',
      label: 'default',
      companyName: 'MEMOPYK',
      logoUrl: null,
      primaryColor: '#123456',
      secondaryColor: '#abcdef',
      pdfFooterText: 'Merci pour votre confiance',
      defaultValidityDays: 30,
      defaultDepositPct: 50,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    };

    const tx = createBrandingTxFixture(initial);

    const config = await getBrandingConfigTx(tx);
    expect(config).not.toBeNull();
    expect(config?.label).toBe('default');
    expect(config?.companyName).toBe('MEMOPYK');
  });

  it('inserts a new branding config when none exists, and updates when one exists', async () => {
    const tx = createBrandingTxFixture(null);

    const created = await upsertBrandingConfigTx(tx, {
      label: 'default',
      companyName: 'MEMOPYK',
      defaultValidityDays: 14,
      defaultDepositPct: 40,
    });

    expect(created.label).toBe('default');
    expect(created.companyName).toBe('MEMOPYK');
    expect(created.defaultValidityDays).toBe(14);

    const updated = await upsertBrandingConfigTx(tx, {
      label: 'default',
      companyName: 'MEMOPYK Studio',
      defaultValidityDays: 30,
      defaultDepositPct: 50,
    });

    expect(updated.companyName).toBe('MEMOPYK Studio');
    expect(updated.defaultValidityDays).toBe(30);
    expect(updated.defaultDepositPct).toBe(50);
  });
});
