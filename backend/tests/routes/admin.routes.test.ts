import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import type { BrandingConfig, Product, TaxRate } from '../../src/db/schema';

vi.mock('../../src/repositories/tax-rates.repo', () => ({
  listActiveTaxRatesTx: vi.fn(),
  createTaxRateTx: vi.fn(),
  updateTaxRateTx: vi.fn(),
}));

vi.mock('../../src/repositories/products.repo', () => ({
  listActiveProductsTx: vi.fn(),
  createProductTx: vi.fn(),
  updateProductTx: vi.fn(),
}));

vi.mock('../../src/repositories/branding.repo', () => ({
  getBrandingConfigTx: vi.fn(),
  upsertBrandingConfigTx: vi.fn(),
}));

vi.mock('../../src/db/client', () => {
  const db = {
    transaction: vi.fn(async (handler: (tx: unknown) => unknown) => handler({})),
  };

  return { db };
});

let app: ReturnType<typeof express>;
let taxRatesRepo: Awaited<ReturnType<typeof importTaxRatesRepo>>;
let productsRepo: Awaited<ReturnType<typeof importProductsRepo>>;
let brandingRepo: Awaited<ReturnType<typeof importBrandingRepo>>;

async function importTaxRatesRepo() {
  return vi.mocked(await import('../../src/repositories/tax-rates.repo'));
}

async function importProductsRepo() {
  return vi.mocked(await import('../../src/repositories/products.repo'));
}

async function importBrandingRepo() {
  return vi.mocked(await import('../../src/repositories/branding.repo'));
}

beforeAll(async () => {
  const { default: adminRouter } = await import('../../src/routes/v1/admin');
  taxRatesRepo = await importTaxRatesRepo();
  productsRepo = await importProductsRepo();
  brandingRepo = await importBrandingRepo();

  app = express();
  app.use(express.json());
  app.use('/v1/admin', adminRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    const code = typeof err?.code === 'string' ? err.code : 'internal_server_error';
    const message =
      status >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : err?.message || 'Request failed.';

    const payload: any = { code, message };
    if (err?.details) {
      payload.details = err.details;
    }

    res.status(status).json({ error: payload });
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('v1/admin tax-rates', () => {
  it('returns active tax rates as DTO array', async () => {
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

    taxRatesRepo.listActiveTaxRatesTx.mockResolvedValue(sampleRates);

    const response = await request(app).get('/v1/admin/tax-rates');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'TVA 20 %',
          code: 'TVA20',
          rate_bps: 2000,
          is_default: true,
          is_active: true,
        },
      ],
    });
    expect(taxRatesRepo.listActiveTaxRatesTx).toHaveBeenCalledTimes(1);
  });

  it('creates a tax rate and returns DTO', async () => {
    const sampleRate: TaxRate = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'TVA 20 %',
      code: 'TVA20',
      rateBps: 2000,
      isDefault: false,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    };

    taxRatesRepo.createTaxRateTx.mockResolvedValue(sampleRate);

    const payload = {
      name: 'TVA 20 %',
      code: 'TVA20',
      rate_bps: 2000,
      is_default: false,
    };

    const response = await request(app).post('/v1/admin/tax-rates').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'TVA 20 %',
        code: 'TVA20',
        rate_bps: 2000,
        is_default: false,
        is_active: true,
      },
    });
    expect(taxRatesRepo.createTaxRateTx).toHaveBeenCalledTimes(1);
    expect(taxRatesRepo.createTaxRateTx).toHaveBeenCalledWith(expect.anything(), payload);
  });

  it('returns validation_error when tax rate payload is invalid', async () => {
    const payload = {
      name: '',
      code: 'TVA20',
      rate_bps: -1,
      is_default: false,
    };

    const response = await request(app).post('/v1/admin/tax-rates').send(payload);

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('validation_error');
    expect(taxRatesRepo.createTaxRateTx).not.toHaveBeenCalled();
  });

  it('surfaces tax_rate_code_conflict when code is duplicated', async () => {
    taxRatesRepo.createTaxRateTx.mockRejectedValue(
      Object.assign(new Error('Tax rate code already exists.'), {
        status: 409,
        code: 'tax_rate_code_conflict',
      }),
    );

    const payload = {
      name: 'TVA 20 %',
      code: 'TVA20',
      rate_bps: 2000,
      is_default: false,
    };

    const response = await request(app).post('/v1/admin/tax-rates').send(payload);

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('tax_rate_code_conflict');
  });

  it('updates a tax rate and can set it as default', async () => {
    const updatedRate: TaxRate = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'TVA 21 %',
      code: 'TVA21',
      rateBps: 2100,
      isDefault: true,
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    };

    taxRatesRepo.updateTaxRateTx.mockResolvedValue(updatedRate);

    const payload = {
      name: 'TVA 21 %',
      rate_bps: 2100,
      is_default: true,
    };

    const response = await request(app)
      .patch('/v1/admin/tax-rates/11111111-1111-1111-1111-111111111111')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'TVA 21 %',
        code: 'TVA21',
        rate_bps: 2100,
        is_default: true,
        is_active: true,
      },
    });
    expect(taxRatesRepo.updateTaxRateTx).toHaveBeenCalledTimes(1);
    expect(taxRatesRepo.updateTaxRateTx).toHaveBeenCalledWith(
      expect.anything(),
      '11111111-1111-1111-1111-111111111111',
      payload,
    );
  });
});

describe('v1/admin products', () => {
  it('returns active products as DTO array', async () => {
    const sampleProducts: Product[] = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        internalCode: 'MEMO-FILM-CLASSIC',
        name: 'Film MEMOPYK Classique',
        description: 'Pack tournage + montage',
        defaultUnitPriceCents: 120000,
        defaultTaxRateId: '11111111-1111-1111-1111-111111111111',
        isActive: true,
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      },
    ];

    productsRepo.listActiveProductsTx.mockResolvedValue(sampleProducts);

    const response = await request(app).get('/v1/admin/products');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          internal_code: 'MEMO-FILM-CLASSIC',
          name: 'Film MEMOPYK Classique',
          description: 'Pack tournage + montage',
          default_unit_price_cents: 120000,
          default_tax_rate_id: '11111111-1111-1111-1111-111111111111',
          is_active: true,
        },
      ],
    });
    expect(productsRepo.listActiveProductsTx).toHaveBeenCalledTimes(1);
  });

  it('creates a product and returns DTO', async () => {
    const sampleProduct: Product = {
      id: '22222222-2222-2222-2222-222222222222',
      internalCode: 'MEMO-FILM-CLASSIC',
      name: 'Film MEMOPYK Classique',
      description: 'Pack tournage + montage',
      defaultUnitPriceCents: 120000,
      defaultTaxRateId: '11111111-1111-1111-1111-111111111111',
      isActive: true,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    };

    productsRepo.createProductTx.mockResolvedValue(sampleProduct);

    const payload = {
      internal_code: 'MEMO-FILM-CLASSIC',
      name: 'Film MEMOPYK Classique',
      description: 'Pack tournage + montage',
      default_unit_price_cents: 120000,
      default_tax_rate_id: '11111111-1111-1111-1111-111111111111',
    };

    const response = await request(app).post('/v1/admin/products').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        internal_code: 'MEMO-FILM-CLASSIC',
        name: 'Film MEMOPYK Classique',
        description: 'Pack tournage + montage',
        default_unit_price_cents: 120000,
        default_tax_rate_id: '11111111-1111-1111-1111-111111111111',
        is_active: true,
      },
    });
    expect(productsRepo.createProductTx).toHaveBeenCalledTimes(1);
    expect(productsRepo.createProductTx).toHaveBeenCalledWith(expect.anything(), payload);
  });

  it('updates a product and returns DTO', async () => {
    const updatedProduct: Product = {
      id: '22222222-2222-2222-2222-222222222222',
      internalCode: 'MEMO-FILM-CLASSIC',
      name: 'Film MEMOPYK Premium',
      description: 'Pack premium',
      defaultUnitPriceCents: 150000,
      defaultTaxRateId: null,
      isActive: true,
      createdAt: new Date('2024-01-02T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    };

    productsRepo.updateProductTx.mockResolvedValue(updatedProduct);

    const payload = {
      name: 'Film MEMOPYK Premium',
      description: 'Pack premium',
      default_unit_price_cents: 150000,
      default_tax_rate_id: null,
    };

    const response = await request(app)
      .patch('/v1/admin/products/22222222-2222-2222-2222-222222222222')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        internal_code: 'MEMO-FILM-CLASSIC',
        name: 'Film MEMOPYK Premium',
        description: 'Pack premium',
        default_unit_price_cents: 150000,
        default_tax_rate_id: null,
        is_active: true,
      },
    });
    expect(productsRepo.updateProductTx).toHaveBeenCalledTimes(1);
    expect(productsRepo.updateProductTx).toHaveBeenCalledWith(
      expect.anything(),
      '22222222-2222-2222-2222-222222222222',
      payload,
    );
  });

  it('returns invalid_tax_rate_id when default_tax_rate_id is not a valid UUID', async () => {
    const payload = {
      internal_code: 'MEMO-FILM-CLASSIC',
      name: 'Film MEMOPYK Classique',
      description: 'Pack tournage + montage',
      default_unit_price_cents: 120000,
      default_tax_rate_id: 'not-a-uuid',
    };

    const response = await request(app).post('/v1/admin/products').send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('invalid_tax_rate_id');
    expect(productsRepo.createProductTx).not.toHaveBeenCalled();
  });
});

describe('v1/admin branding', () => {
  it('returns null when no branding config exists', async () => {
    brandingRepo.getBrandingConfigTx.mockResolvedValue(null as unknown as BrandingConfig);

    const response = await request(app).get('/v1/admin/branding');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: null });
  });

  it('returns the current branding config when present', async () => {
    const config: BrandingConfig = {
      id: '33333333-3333-3333-3333-333333333333',
      label: 'default',
      companyName: 'MEMOPYK',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      pdfFooterText: 'Merci pour votre confiance',
      defaultValidityDays: 30,
      defaultDepositPct: 50,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
      updatedAt: new Date('2024-01-03T00:00:00.000Z'),
    };

    brandingRepo.getBrandingConfigTx.mockResolvedValue(config);

    const response = await request(app).get('/v1/admin/branding');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: config.id,
        label: 'default',
        company_name: 'MEMOPYK',
        logo_url: 'https://example.com/logo.png',
        primary_color: '#000000',
        secondary_color: '#ffffff',
        pdf_footer_text: 'Merci pour votre confiance',
        default_validity_days: 30,
        default_deposit_pct: 50,
      },
    });
    expect(brandingRepo.getBrandingConfigTx).toHaveBeenCalledTimes(1);
  });

  it('validates payload and upserts branding config on POST', async () => {
    const config: BrandingConfig = {
      id: '44444444-4444-4444-4444-444444444444',
      label: 'default',
      companyName: 'MEMOPYK Studio',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#111111',
      secondaryColor: '#eeeeee',
      pdfFooterText: 'Merci pour votre confiance',
      defaultValidityDays: 30,
      defaultDepositPct: 50,
      createdAt: new Date('2024-01-04T00:00:00.000Z'),
      updatedAt: new Date('2024-01-04T00:00:00.000Z'),
    };

    brandingRepo.upsertBrandingConfigTx.mockResolvedValue(config);

    const payload = {
      label: 'default',
      company_name: 'MEMOPYK Studio',
      logo_url: 'https://example.com/logo.png',
      primary_color: '#111111',
      secondary_color: '#eeeeee',
      pdf_footer_text: 'Merci pour votre confiance',
      default_validity_days: 30,
      default_deposit_pct: 50,
    };

    const response = await request(app).post('/v1/admin/branding').send(payload);

    expect(response.status).toBe(200);
    expect(brandingRepo.upsertBrandingConfigTx).toHaveBeenCalledTimes(1);

    const [, upsertInput] = brandingRepo.upsertBrandingConfigTx.mock.calls[0];
    expect(upsertInput).toEqual({
      label: 'default',
      companyName: 'MEMOPYK Studio',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#111111',
      secondaryColor: '#eeeeee',
      pdfFooterText: 'Merci pour votre confiance',
      defaultValidityDays: 30,
      defaultDepositPct: 50,
    });

    expect(response.body).toEqual({
      data: {
        id: config.id,
        label: 'default',
        company_name: 'MEMOPYK Studio',
        logo_url: 'https://example.com/logo.png',
        primary_color: '#111111',
        secondary_color: '#eeeeee',
        pdf_footer_text: 'Merci pour votre confiance',
        default_validity_days: 30,
        default_deposit_pct: 50,
      },
    });
  });

  it('returns validation_error when payload is invalid', async () => {
    const response = await request(app).post('/v1/admin/branding').send({});

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('validation_error');
    expect(brandingRepo.upsertBrandingConfigTx).not.toHaveBeenCalled();
  });

  it('enforces branding numeric constraints for validity days and deposit pct', async () => {
    const response = await request(app)
      .post('/v1/admin/branding')
      .send({
        label: 'default',
        default_validity_days: -1,
        default_deposit_pct: 150,
      });

    expect(response.status).toBe(422);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error.code).toBe('validation_error');
    expect(brandingRepo.upsertBrandingConfigTx).not.toHaveBeenCalled();
  });
});
