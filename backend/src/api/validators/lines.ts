import { z } from 'zod';

import { parseWithSchema } from './utils';

const baseLineSchema = z
  .object({
    product_id: z.string().uuid().optional(),
    description: z.string().trim().min(1),
    qty: z.coerce.number().gt(0),
    unit_amount_cents: z.coerce.number().int().min(0),
    tax_rate_bps: z.coerce.number().int().min(0).max(2500),
    position: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const lineCreateSchema = baseLineSchema;
export const lineUpdateSchema = baseLineSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one field must be provided.',
  },
);

export type LineCreateDTO = z.infer<typeof lineCreateSchema>;
export type LineUpdateDTO = z.infer<typeof lineUpdateSchema>;

export function parseLineCreate(payload: unknown): LineCreateDTO {
  return parseWithSchema(lineCreateSchema, payload);
}

export function parseLineUpdate(payload: unknown): LineUpdateDTO {
  return parseWithSchema(lineUpdateSchema, payload);
}
