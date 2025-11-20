import { and, desc, eq, sql } from 'drizzle-orm';

import type { TransactionClient } from '../db/client';
import { pdfJobs, quotes, quoteVersions, type PdfJob, type PdfJobStatus } from '../db/schema';
import { HttpError } from '../utils/http-error';

export type PdfJobCreateInput = {
  quoteId: string;
  versionId: string;
};

export type PdfJobStatusPatch = {
  status?: PdfJobStatus;
  fileUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  incrementAttempts?: boolean;
};

export async function createPdfJobTx(
  tx: TransactionClient,
  input: PdfJobCreateInput,
): Promise<PdfJob> {
  const { quoteId, versionId } = input;

  const [quote] = await tx
    .select({ id: quotes.id, deletedAt: quotes.deletedAt, currentVersionId: quotes.currentVersionId })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote || quote.deletedAt) {
    throw new HttpError(404, 'quote_not_found', 'Quote not found.');
  }

  const [version] = await tx
    .select({ id: quoteVersions.id, quoteId: quoteVersions.quoteId, deletedAt: quoteVersions.deletedAt })
    .from(quoteVersions)
    .where(and(eq(quoteVersions.id, versionId), eq(quoteVersions.quoteId, quoteId)))
    .limit(1);

  if (!version || version.deletedAt) {
    throw new HttpError(404, 'version_not_found', 'Version not found.');
  }

  const now = new Date();

  const [created] = await tx
    .insert(pdfJobs)
    .values({
      quoteId,
      versionId,
      status: 'pending',
      attempts: 0,
      fileUrl: null,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      finishedAt: null,
    })
    .returning();

  if (!created) {
    throw new HttpError(500, 'pdf_job_create_failed', 'Failed to create PDF job.');
  }

  return created;
}

export async function getPdfJobByIdTx(
  tx: TransactionClient,
  id: string,
): Promise<PdfJob | null> {
  const [job] = await tx.select().from(pdfJobs).where(eq(pdfJobs.id, id)).limit(1);

  return job ?? null;
}

export async function findLatestPdfJobForQuoteVersionTx(
  tx: TransactionClient,
  quoteId: string,
  versionId: string,
): Promise<PdfJob | null> {
  const [job] = await tx
    .select()
    .from(pdfJobs)
    .where(and(eq(pdfJobs.quoteId, quoteId), eq(pdfJobs.versionId, versionId)))
    .orderBy(desc(pdfJobs.createdAt))
    .limit(1);

  return job ?? null;
}

export async function updatePdfJobStatusTx(
  tx: TransactionClient,
  id: string,
  patch: PdfJobStatusPatch,
): Promise<PdfJob> {
  const [existing] = await tx.select().from(pdfJobs).where(eq(pdfJobs.id, id)).limit(1);

  if (!existing) {
    throw new HttpError(404, 'pdf_job_not_found', 'PDF job not found.');
  }

  const now = new Date();

  const updatePatch: Partial<typeof pdfJobs.$inferInsert> = {
    updatedAt: now,
  };

  if (patch.status !== undefined) {
    updatePatch.status = patch.status;
  }

  if (patch.fileUrl !== undefined) {
    updatePatch.fileUrl = patch.fileUrl;
  }

  if (patch.errorCode !== undefined) {
    updatePatch.errorCode = patch.errorCode;
  }

  if (patch.errorMessage !== undefined) {
    updatePatch.errorMessage = patch.errorMessage;
  }

  if (patch.startedAt !== undefined) {
    updatePatch.startedAt = patch.startedAt;
  }

  if (patch.finishedAt !== undefined) {
    updatePatch.finishedAt = patch.finishedAt;
  }

  if (patch.incrementAttempts) {
    updatePatch.attempts = sql`${pdfJobs.attempts} + 1` as any;
  }

  const [updated] = await tx
    .update(pdfJobs)
    .set(updatePatch)
    .where(eq(pdfJobs.id, id))
    .returning();

  if (!updated) {
    throw new HttpError(404, 'pdf_job_not_found', 'PDF job not found.');
  }

  return updated;
}
