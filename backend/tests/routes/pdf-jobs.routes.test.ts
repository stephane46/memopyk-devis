import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

import * as schema from '../../src/db/schema';

const QUOTE_ID = '11111111-1111-1111-1111-111111111111';
const VERSION_ID = '22222222-2222-2222-2222-222222222222';
const JOB_ID = '33333333-3333-3333-3333-333333333333';
const isoNow = '2024-01-01T00:00:00.000Z';

vi.mock('../../src/repositories/pdf-jobs.repo', () => ({
  createPdfJobTx: vi.fn(),
  getPdfJobByIdTx: vi.fn(),
}));

vi.mock('../../src/services/pdf-jobs.service', () => ({
  startPdfJobProcessing: vi.fn(),
}));

vi.mock('../../src/db/client', () => {
  const state = {
    quote: {
      id: QUOTE_ID,
      currentVersionId: VERSION_ID,
      deletedAt: null,
    } as any | null,
    job: {
      id: JOB_ID,
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      status: 'pending',
      fileUrl: null,
      errorCode: null,
      errorMessage: null,
      attempts: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
      startedAt: null,
      finishedAt: null,
    } as any | null,
  };

  const createTx = () => ({
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === schema.quotes) {
              return state.quote ? [state.quote] : [];
            }

            if (table === schema.pdfJobs) {
              return state.job ? [state.job] : [];
            }

            return [];
          },
        }),
      }),
    }),
    insert: () => ({
      values: () => ({ returning: () => [state.job] }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: () => [state.job] }) }),
    }),
  });

  const mockDb = {
    transaction: vi.fn(async (handler: (tx: any) => unknown) => handler(createTx())),
  };

  return {
    db: mockDb,
    pool: {},
    __mockState: state,
  };
});

let app: ReturnType<typeof express>;
let pdfJobsRepo: Awaited<ReturnType<typeof importPdfJobsRepo>>;
let pdfJobsService: Awaited<ReturnType<typeof importPdfJobsService>>;
let mockState: {
  quote: any | null;
  job: any | null;
};

async function importPdfJobsRepo() {
  return vi.mocked(await import('../../src/repositories/pdf-jobs.repo'));
}

async function importPdfJobsService() {
  return vi.mocked(await import('../../src/services/pdf-jobs.service'));
}

beforeAll(async () => {
  const { default: pdfRouter } = await import('../../src/routes/v1/pdf');
  pdfJobsRepo = await importPdfJobsRepo();
  pdfJobsService = await importPdfJobsService();

  const dbModule: any = await import('../../src/db/client');
  mockState = dbModule.__mockState;

  app = express();
  app.use(express.json());
  // Mount under /v1 so that routes resolve to /v1/quotes/:quoteId/pdf and /v1/pdf/jobs/:jobId
  app.use('/v1', pdfRouter);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    const code = typeof err?.code === 'string' ? err.code : 'internal_server_error';
    const message =
      status >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : err?.message || 'Request failed.';

    const payload: any = { code, message };
    if (err?.details) {
      payload.details = err.details;
    }

    res.status(status).json({ error: payload });
  });
});

describe('v1/pdf routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.quote = {
      id: QUOTE_ID,
      currentVersionId: VERSION_ID,
      deletedAt: null,
    };

    mockState.job = {
      id: JOB_ID,
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      status: 'pending',
      fileUrl: null,
      errorCode: null,
      errorMessage: null,
      attempts: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
      startedAt: null,
      finishedAt: null,
    };
  });

  describe('POST /v1/quotes/:quoteId/pdf', () => {
    it('creates a pending PDF job when quote and current version exist', async () => {
      pdfJobsRepo.createPdfJobTx.mockResolvedValue(mockState.job);

      const response = await request(app).post(`/v1/quotes/${QUOTE_ID}/pdf`).send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          job_id: JOB_ID,
          status: 'pending',
        },
      });
      expect(pdfJobsRepo.createPdfJobTx).toHaveBeenCalledTimes(1);
      expect(pdfJobsService.startPdfJobProcessing).toHaveBeenCalledTimes(1);
      expect(pdfJobsService.startPdfJobProcessing).toHaveBeenCalledWith(JOB_ID);
    });

    it('returns 404 quote_not_found when quote does not exist', async () => {
      mockState.quote = null;

      const response = await request(app).post(`/v1/quotes/${QUOTE_ID}/pdf`).send({});

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('quote_not_found');
      expect(pdfJobsRepo.createPdfJobTx).not.toHaveBeenCalled();
    });

    it('returns 409 no_current_version_for_pdf when quote has no current version', async () => {
      mockState.quote = {
        id: QUOTE_ID,
        currentVersionId: null,
        deletedAt: null,
      };

      const response = await request(app).post(`/v1/quotes/${QUOTE_ID}/pdf`).send({});

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('no_current_version_for_pdf');
      expect(pdfJobsRepo.createPdfJobTx).not.toHaveBeenCalled();
    });
  });

  describe('GET /v1/pdf/jobs/:jobId', () => {
    it('returns job status when job exists', async () => {
      pdfJobsRepo.getPdfJobByIdTx.mockResolvedValue(mockState.job);

      const response = await request(app).get(`/v1/pdf/jobs/${JOB_ID}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          job_id: JOB_ID,
          status: 'pending',
          file_url: null,
          error_code: null,
          error_message: null,
        },
      });
      expect(pdfJobsRepo.getPdfJobByIdTx).toHaveBeenCalledWith(expect.anything(), JOB_ID);
    });

    it('returns ready job with non-null file_url', async () => {
      const readyJob = {
        ...mockState.job,
        status: 'ready',
        fileUrl: 'https://example.com/placeholder.pdf',
        errorCode: null,
        errorMessage: null,
      };

      pdfJobsRepo.getPdfJobByIdTx.mockResolvedValue(readyJob as any);

      const response = await request(app).get(`/v1/pdf/jobs/${JOB_ID}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          job_id: JOB_ID,
          status: 'ready',
          file_url: 'https://example.com/placeholder.pdf',
          error_code: null,
          error_message: null,
        },
      });
    });

    it('returns failed job with error_code and error_message', async () => {
      const failedJob = {
        ...mockState.job,
        status: 'failed',
        fileUrl: null,
        errorCode: 'render_failed',
        errorMessage: 'Simulated failure',
      };

      pdfJobsRepo.getPdfJobByIdTx.mockResolvedValue(failedJob as any);

      const response = await request(app).get(`/v1/pdf/jobs/${JOB_ID}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        data: {
          job_id: JOB_ID,
          status: 'failed',
          file_url: null,
          error_code: 'render_failed',
          error_message: 'Simulated failure',
        },
      });
    });

    it('returns 404 pdf_job_not_found when job does not exist', async () => {
      pdfJobsRepo.getPdfJobByIdTx.mockResolvedValue(null as any);

      const response = await request(app).get(`/v1/pdf/jobs/${JOB_ID}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('pdf_job_not_found');
    });

    it('returns validation_error for invalid jobId', async () => {
      const response = await request(app).get('/v1/pdf/jobs/not-a-uuid');

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('validation_error');
    });
  });
});
