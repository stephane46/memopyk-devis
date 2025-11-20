import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/client', () => {
  const db = {
    transaction: vi.fn(async (handler: (tx: unknown) => unknown) => handler({})),
  };

  return { db };
});

vi.mock('../../src/repositories/pdf-jobs.repo', () => ({
  updatePdfJobStatusTx: vi.fn(),
}));

describe('pdf-jobs.service', () => {
  const JOB_ID = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions job from pending to processing and then ready with placeholder URL', async () => {
    const { db } = await import('../../src/db/client');
    const { updatePdfJobStatusTx } = await import('../../src/repositories/pdf-jobs.repo');
    const { startPdfJobProcessing } = await import('../../src/services/pdf-jobs.service');

    await startPdfJobProcessing(JOB_ID);

    // Should wrap both updates in transactions
    expect(db.transaction).toHaveBeenCalledTimes(2);

    const calls = (updatePdfJobStatusTx as any).mock.calls;
    expect(calls.length).toBe(2);

    const firstPatch = calls[0][2];
    const secondPatch = calls[1][2];

    expect(firstPatch).toMatchObject({
      status: 'processing',
      incrementAttempts: true,
    });
    expect(firstPatch.startedAt).toBeInstanceOf(Date);

    expect(secondPatch).toMatchObject({
      status: 'ready',
      fileUrl: 'https://example.com/placeholder.pdf',
    });
    expect(secondPatch.finishedAt).toBeInstanceOf(Date);
  });
});
