import { z } from 'zod';

import { HttpError } from '../../utils/http-error';
import { parseWithSchema } from './utils';

const publicAcceptanceSchema = z
  .object({
    full_name: z.string().trim().min(1),
    accept_cgv: z.boolean(),
  })
  .strict();

const adminPaperAcceptanceSchema = z
  .object({
    full_name: z.string().trim().min(1),
    accepted_at: z
      .string()
      .trim()
      .refine((value) => {
        if (value.length === 0) {
          return false;
        }

        const parsed = new Date(value);
        return !Number.isNaN(parsed.getTime());
      }, { message: 'La date d\'acceptation doit être une date ISO valide.' })
      .optional(),
    notes: z.string().trim().optional(),
  })
  .strict();

export type PublicAcceptanceDTO = z.infer<typeof publicAcceptanceSchema>;
export type AdminPaperAcceptanceDTO = z.infer<typeof adminPaperAcceptanceSchema>;

export function parsePublicAcceptance(payload: unknown): PublicAcceptanceDTO {
  const dto = parseWithSchema(publicAcceptanceSchema, payload);

  if (!dto.accept_cgv) {
    throw new HttpError(400, 'cgv_not_accepted', 'Les CGV doivent être acceptées pour valider le devis.');
  }

  return dto;
}

export function parseAdminPaperAcceptance(payload: unknown): AdminPaperAcceptanceDTO {
  return parseWithSchema(adminPaperAcceptanceSchema, payload);
}
