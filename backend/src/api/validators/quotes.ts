import { z } from 'zod';

import { lineCreateSchema } from './lines';
import { HttpError } from '../../utils/http-error';
import { parseWithSchema } from './utils';

const currencySchema = z.enum(['EUR', 'USD']);
const statusSchema = z.enum(['draft', 'sent', 'accepted', 'declined']);

export const quoteCreateSchema = z
  .object({
    customer_name: z.string().trim().min(1),
    title: z.string().trim().min(1),
    notes: z.string().trim().optional(),
    currency: currencySchema,
    lines: z.array(lineCreateSchema).min(1),
    valid_until: z
      .union([
        z
          .string()
          .trim()
          .refine((value) => {
            if (value.length === 0) {
              return false;
            }

            const parsed = new Date(value);
            return !Number.isNaN(parsed.getTime());
          }, { message: 'La date de validité doit être une date ISO valide.' }),
        z.null(),
      ])
      .optional(),
    deposit_pct: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional(),
  })
  .strict();

export const quoteUpdateSchema = z
  .object({
    customer_name: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    notes: z.string().trim().optional(),
    currency: currencySchema.optional(),
    status: statusSchema.optional(),
    valid_until: z
      .union([
        z
          .string()
          .trim()
          .refine((value) => {
            if (value.length === 0) {
              return false;
            }

            const parsed = new Date(value);
            return !Number.isNaN(parsed.getTime());
          }, { message: 'La date de validité doit être une date ISO valide.' }),
        z.null(),
      ])
      .optional(),
  })
  .strict();

export type QuoteCreateDTO = z.infer<typeof quoteCreateSchema>;
export type QuoteUpdateDTO = z.infer<typeof quoteUpdateSchema>;

export type QuoteListQueryDTO = {
  status?: Array<z.infer<typeof statusSchema>>;
  q?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export function parseQuoteCreate(payload: unknown): QuoteCreateDTO {
  return parseWithSchema(quoteCreateSchema, payload);
}

export function parseQuoteUpdate(payload: unknown): QuoteUpdateDTO {
  return parseWithSchema(quoteUpdateSchema, payload);
}

function coerceDate(parameter: string, value: unknown): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" must be an ISO date string.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" is not a valid date.`);
  }

  return parsed;
}

function coerceInteger(
  parameter: string,
  value: unknown,
  { min, max }: { min?: number; max?: number },
): number {
  if (value === undefined) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" is required.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" must be an integer.`);
  }

  if (min !== undefined && parsed < min) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" must be greater than or equal to ${min}.`);
  }

  if (max !== undefined && parsed > max) {
    throw new HttpError(422, 'invalid_query', `Query parameter "${parameter}" must be less than or equal to ${max}.`);
  }

  return parsed;
}

function collectStatuses(raw: unknown): Array<z.infer<typeof statusSchema>> | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const tokens: string[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string') {
        tokens.push(entry);
      }
    }
  } else if (typeof raw === 'string') {
    tokens.push(...raw.split(','));
  }

  if (tokens.length === 0) {
    throw new HttpError(422, 'invalid_query', 'Query parameter "status" must be a string or array of strings.');
  }

  return tokens
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      try {
        return statusSchema.parse(token);
      } catch (error) {
        throw new HttpError(422, 'invalid_query', `Invalid status value "${token}".`);
      }
    });
}

export function parseQuoteListQuery(query: Record<string, unknown>): QuoteListQueryDTO {
  const result: QuoteListQueryDTO = {};

  if (query.status !== undefined) {
    result.status = collectStatuses(query.status);
  }

  if (typeof query.q === 'string' && query.q.trim().length > 0) {
    result.q = query.q.trim();
  }

  if (query.from !== undefined) {
    result.from = coerceDate('from', query.from);
  }

  if (query.to !== undefined) {
    result.to = coerceDate('to', query.to);
  }

  if (query.limit !== undefined) {
    result.limit = coerceInteger('limit', query.limit, { min: 1, max: 100 });
  }

  if (query.offset !== undefined) {
    result.offset = coerceInteger('offset', query.offset, { min: 0 });
  }

  return result;
}
