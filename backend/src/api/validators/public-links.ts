import { z } from 'zod';

import { parseWithSchema } from './utils';

const adminPublicLinkUpdateSchema = z
  .object({
    enabled: z.boolean(),
    pin: z
      .union([
        z
          .string()
          .trim()
          .regex(/^\d{4,6}$/u, 'Le code PIN doit contenir entre 4 et 6 chiffres.'),
        z.null(),
      ])
      .optional(),
  })
  .strict();

const publicPinSubmitSchema = z
  .object({
    pin: z
      .string()
      .trim()
      .regex(/^\d{6}$/u, 'Le code PIN doit contenir exactement 6 chiffres.'),
  })
  .strict();

export type AdminPublicLinkUpdateDTO = z.infer<typeof adminPublicLinkUpdateSchema>;
export type PublicPinSubmitDTO = z.infer<typeof publicPinSubmitSchema>;

export function parseAdminPublicLinkUpdate(payload: unknown): AdminPublicLinkUpdateDTO {
  return parseWithSchema(adminPublicLinkUpdateSchema, payload);
}

export function parsePublicPinSubmit(payload: unknown): PublicPinSubmitDTO {
  return parseWithSchema(publicPinSubmitSchema, payload);
}
