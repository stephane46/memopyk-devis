import { db } from '../db/client';
import { updatePdfJobStatusTx } from '../repositories/pdf-jobs.repo';

export async function startPdfJobProcessing(jobId: string): Promise<void> {
  const startedAt = new Date();

  // Mark job as processing and increment attempts
  await db.transaction(async (tx) => {
    await updatePdfJobStatusTx(tx, jobId, {
      status: 'processing',
      startedAt,
      incrementAttempts: true,
    });
  });

  // Simulate rendering work and mark job as ready with a placeholder URL
  const finishedAt = new Date();

  await db.transaction(async (tx) => {
    await updatePdfJobStatusTx(tx, jobId, {
      status: 'ready',
      fileUrl: 'https://example.com/placeholder.pdf',
      finishedAt,
    });
  });
}
