import { z } from 'zod';

import { parseWithSchema } from './utils';

export const versionCreateSchema = z
  .object({
    quote_id: z.string().uuid(),
    from_version_id: z.string().uuid().optional(),
  })
  .strict();

export type VersionCreateDTO = z.infer<typeof versionCreateSchema>;

export function parseVersionCreate(payload: unknown): VersionCreateDTO {
  return parseWithSchema(versionCreateSchema, payload);
}
