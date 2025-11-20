import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import {
  parseAdminBrandingUpdate,
  parseAdminProductCreate,
  parseAdminProductUpdate,
  parseAdminTaxRateCreate,
  parseAdminTaxRateUpdate,
} from '../../api/validators/admin-catalog';
import { db } from '../../db/client';
import { createTaxRateTx, listActiveTaxRatesTx, updateTaxRateTx } from '../../repositories/tax-rates.repo';
import { createProductTx, listActiveProductsTx, updateProductTx } from '../../repositories/products.repo';
import { getBrandingConfigTx, upsertBrandingConfigTx } from '../../repositories/branding.repo';
import type { BrandingConfig, Product, TaxRate } from '../../db/schema';
import { HttpError } from '../../utils/http-error';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function assertValidDefaultTaxRateId(id: string | null | undefined): void {
  if (id === undefined || id === null) {
    return;
  }

  if (!UUID_REGEX.test(id)) {
    throw new HttpError(400, 'invalid_tax_rate_id', 'Invalid tax rate id.');
  }
}

function mapTaxRateToDto(rate: TaxRate) {
  return {
    id: rate.id,
    name: rate.name,
    code: rate.code,
    rate_bps: rate.rateBps,
    is_default: rate.isDefault,
    is_active: rate.isActive,
  };
}

function mapProductToDto(product: Product) {
  return {
    id: product.id,
    internal_code: product.internalCode ?? null,
    name: product.name,
    description: product.description ?? null,
    default_unit_price_cents: product.defaultUnitPriceCents ?? null,
    default_tax_rate_id: product.defaultTaxRateId ?? null,
    is_active: product.isActive,
  };
}

function mapBrandingToDto(config: BrandingConfig) {
  return {
    id: config.id,
    label: config.label,
    company_name: config.companyName ?? null,
    logo_url: config.logoUrl ?? null,
    primary_color: config.primaryColor ?? null,
    secondary_color: config.secondaryColor ?? null,
    pdf_footer_text: config.pdfFooterText ?? null,
    default_validity_days: config.defaultValidityDays ?? null,
    default_deposit_pct: config.defaultDepositPct ?? null,
  };
}

const router = Router();

router.get(
  '/tax-rates',
  asyncHandler(async (_req, res) => {
    const rates = await db.transaction(async (tx) => listActiveTaxRatesTx(tx));

    res.json({
      data: rates.map(mapTaxRateToDto),
    });
  }),
);

router.post(
  '/tax-rates',
  asyncHandler(async (req, res) => {
    const payload = parseAdminTaxRateCreate(req.body);

    const created = await db.transaction(async (tx) => createTaxRateTx(tx, payload));

    res.status(201).json({
      data: mapTaxRateToDto(created),
    });
  }),
);

router.patch(
  '/tax-rates/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = parseAdminTaxRateUpdate(req.body);

    const updated = await db.transaction(async (tx) => updateTaxRateTx(tx, id, payload));

    res.json({
      data: mapTaxRateToDto(updated),
    });
  }),
);

router.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const items = await db.transaction(async (tx) => listActiveProductsTx(tx));

    res.json({
      data: items.map(mapProductToDto),
    });
  }),
);

router.post(
  '/products',
  asyncHandler(async (req, res) => {
    const payload = parseAdminProductCreate(req.body);

    assertValidDefaultTaxRateId(payload.default_tax_rate_id ?? null);

    const created = await db.transaction(async (tx) => createProductTx(tx, payload));

    res.status(201).json({
      data: mapProductToDto(created),
    });
  }),
);

router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = parseAdminProductUpdate(req.body);

    assertValidDefaultTaxRateId(payload.default_tax_rate_id ?? null);

    const updated = await db.transaction(async (tx) => updateProductTx(tx, id, payload));

    res.json({
      data: mapProductToDto(updated),
    });
  }),
);

router.get(
  '/branding',
  asyncHandler(async (_req, res) => {
    const config = await db.transaction(async (tx) => getBrandingConfigTx(tx));

    if (!config) {
      res.json({ data: null });
      return;
    }

    res.json({ data: mapBrandingToDto(config) });
  }),
);

router.post(
  '/branding',
  asyncHandler(async (req, res) => {
    const payload = parseAdminBrandingUpdate(req.body);

    const updated = await db.transaction(async (tx) =>
      upsertBrandingConfigTx(tx, {
        label: payload.label,
        companyName: payload.company_name ?? null,
        logoUrl: payload.logo_url ?? null,
        primaryColor: payload.primary_color ?? null,
        secondaryColor: payload.secondary_color ?? null,
        pdfFooterText: payload.pdf_footer_text ?? null,
        defaultValidityDays: payload.default_validity_days ?? undefined,
        defaultDepositPct: payload.default_deposit_pct ?? undefined,
      }),
    );

    res.json({ data: mapBrandingToDto(updated) });
  }),
);

export { router };
export default router;
