import { z } from 'zod';

import { parseWithSchema } from './utils';

const adminTaxRateBaseSchema = z
  .object({
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    rate_bps: z.number().int().min(0).max(2500),
    is_default: z.boolean(),
  })
  .strict();

const adminTaxRateCreateSchema = adminTaxRateBaseSchema;

const adminTaxRateUpdateSchema = adminTaxRateBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided.',
  },
);

const adminProductBaseSchema = z
  .object({
    internal_code: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().optional(),
    default_unit_price_cents: z.number().int().min(0),
    default_tax_rate_id: z
      .union([z.string().trim().min(1), z.null()])
      .optional(),
  })
  .strict();

const adminProductCreateSchema = adminProductBaseSchema;

const adminProductUpdateSchema = adminProductBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided.',
  },
);

const adminBrandingUpdateSchema = z
  .object({
    label: z.string().trim().min(1),
    company_name: z.string().trim().min(1).optional(),
    logo_url: z.string().trim().optional(),
    primary_color: z.string().trim().optional(),
    secondary_color: z.string().trim().optional(),
    pdf_footer_text: z.string().trim().optional(),
    default_validity_days: z.number().int().min(0).optional(),
    default_deposit_pct: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type AdminTaxRateCreateDTO = z.infer<typeof adminTaxRateCreateSchema>;
export type AdminTaxRateUpdateDTO = z.infer<typeof adminTaxRateUpdateSchema>;
export type AdminProductCreateDTO = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateDTO = z.infer<typeof adminProductUpdateSchema>;
export type AdminBrandingUpdateDTO = z.infer<typeof adminBrandingUpdateSchema>;

export function parseAdminTaxRateCreate(payload: unknown): AdminTaxRateCreateDTO {
  return parseWithSchema(adminTaxRateCreateSchema, payload);
}

export function parseAdminTaxRateUpdate(payload: unknown): AdminTaxRateUpdateDTO {
  return parseWithSchema(adminTaxRateUpdateSchema, payload);
}

export function parseAdminProductCreate(payload: unknown): AdminProductCreateDTO {
  return parseWithSchema(adminProductCreateSchema, payload);
}

export function parseAdminProductUpdate(payload: unknown): AdminProductUpdateDTO {
  return parseWithSchema(adminProductUpdateSchema, payload);
}

export function parseAdminBrandingUpdate(payload: unknown): AdminBrandingUpdateDTO {
  return parseWithSchema(adminBrandingUpdateSchema, payload);
}
