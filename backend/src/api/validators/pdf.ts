import { z } from 'zod';

import { parseWithSchema } from './utils';

const pdfJobCreateSchema = z
  .object({
    force_regenerate: z.boolean().optional(),
  })
  .strict();

const pdfJobStatusParamsSchema = z
  .object({
    jobId: z.string().uuid(),
  })
  .strict();

export type PdfJobCreateDTO = z.infer<typeof pdfJobCreateSchema>;
export type PdfJobStatusParamsDTO = z.infer<typeof pdfJobStatusParamsSchema>;

export function parsePdfJobCreateRequest(payload: unknown): PdfJobCreateDTO {
  return parseWithSchema(pdfJobCreateSchema, payload);
}

export function parsePdfJobStatusParams(params: unknown): PdfJobStatusParamsDTO {
  return parseWithSchema(pdfJobStatusParamsSchema, params);
}
