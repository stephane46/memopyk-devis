import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { parsePdfJobCreateRequest, parsePdfJobStatusParams } from '../../api/validators/pdf';
import { db } from '../../db/client';
import { quotes } from '../../db/schema';
import { createPdfJobTx, getPdfJobByIdTx } from '../../repositories/pdf-jobs.repo';
import { startPdfJobProcessing } from '../../services/pdf-jobs.service';
import { eq } from 'drizzle-orm';
import { HttpError } from '../../utils/http-error';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const router = Router();

router.post(
  '/quotes/:quoteId/pdf',
  asyncHandler(async (req, res) => {
    const { quoteId } = req.params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(quoteId)) {
      throw new HttpError(404, 'quote_not_found', 'Quote not found.');
    }

    const payload = parsePdfJobCreateRequest(req.body ?? {});
    void payload; // reserved for future use (force_regenerate)

    const job = await db.transaction(async (tx) => {
      const [quote] = await tx
        .select({ id: quotes.id, currentVersionId: quotes.currentVersionId, deletedAt: quotes.deletedAt })
        .from(quotes)
        .where(eq(quotes.id, quoteId))
        .limit(1);

      if (!quote || quote.deletedAt) {
        throw new HttpError(404, 'quote_not_found', 'Quote not found.');
      }

      if (!quote.currentVersionId) {
        throw new HttpError(409, 'no_current_version_for_pdf', 'No current version available for PDF.');
      }

      return createPdfJobTx(tx, { quoteId, versionId: quote.currentVersionId });
    });

    // Fire-and-forget processing: transition job from pending -> processing -> ready
    void startPdfJobProcessing(job.id);

    res.status(200).json({
      data: {
        job_id: job.id,
        status: job.status,
      },
    });
  }),
);

router.get(
  '/pdf/jobs/:jobId',
  asyncHandler(async (req, res) => {
    const { jobId } = parsePdfJobStatusParams(req.params);

    const job = await db.transaction(async (tx) => getPdfJobByIdTx(tx, jobId));

    if (!job) {
      throw new HttpError(404, 'pdf_job_not_found', 'PDF job not found.');
    }

    res.json({
      data: {
        job_id: job.id,
        status: job.status,
        file_url: job.fileUrl ?? null,
        error_code: job.errorCode ?? null,
        error_message: job.errorMessage ?? null,
      },
    });
  }),
);

export { router };
export default router;
