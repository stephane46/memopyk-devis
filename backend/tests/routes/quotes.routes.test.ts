import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import type { QuoteFull, QuoteListItem } from '../../src/repositories/quotes.repo';
import type { QuoteLine, QuoteVersion } from '../../src/db/schema';

const isoNow = '2024-01-01T00:00:00.000Z';
const QUOTE_ID = '11111111-1111-1111-1111-111111111111';
const VERSION_ID = '22222222-2222-2222-2222-222222222222';
const VERSION_ID_2 = '33333333-3333-3333-3333-333333333333';
const VERSION_ID_3 = '44444444-4444-4444-4444-444444444444';
const LINE_ID = '55555555-5555-5555-5555-555555555555';

vi.mock('../../src/repositories/quotes.repo', () => ({
  createQuote: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  restore: vi.fn(),
  softDelete: vi.fn(),
  updateMeta: vi.fn(),
}));

vi.mock('../../src/repositories/versions.repo', () => ({
  createVersionWithLinesTx: vi.fn(),
  duplicateVersionTx: vi.fn(),
  listVersionsTx: vi.fn(),
  setCurrentVersionTx: vi.fn(),
}));

vi.mock('../../src/repositories/lines.repo', () => ({
  createLineTx: vi.fn(),
  softDeleteLineTx: vi.fn(),
  updateLineTx: vi.fn(),
}));

vi.mock('../../src/repositories/acceptance.repo', () => ({
  acceptQuoteOnPaper: vi.fn(),
  undoAcceptance: vi.fn(),
}));

vi.mock('../../src/repositories/public-links.repo', () => ({
  upsertPublicLinkTx: vi.fn(),
  deletePublicLinkByQuoteIdTx: vi.fn(),
}));

vi.mock('../../src/services/pin-hash.service', () => ({
  hashPin: vi.fn(),
}));

vi.mock('../../src/repositories/activities.repo', () => ({
  logActivity: vi.fn(),
  logActivityTx: vi.fn(),
}));

vi.mock('../../src/services/version-diff.service', () => ({
  computeVersionDiffTx: vi.fn(),
}));

vi.mock('../../src/db/client', () => {
  const state = {
    quote: { id: QUOTE_ID, deletedAt: null },
    version: { id: VERSION_ID, quoteId: QUOTE_ID, deletedAt: null },
    line: { id: LINE_ID, versionId: VERSION_ID, deletedAt: null },
  } as {
    quote: { id: string; deletedAt: Date | null } | null;
    version: { id: string; quoteId: string; deletedAt: Date | null } | null;
    line: { id: string; versionId: string; deletedAt: Date | null } | null;
  };

  const createTx = () => ({
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: () => {
            if (table === schema.quotes) {
              return state.quote ? [state.quote] : [];
            }

            if (table === schema.quoteVersions) {
              return state.version ? [state.version] : [];
            }

            if (table === schema.quoteLines) {
              return state.line ? [state.line] : [];
            }

            return [];
          },
        }),
      }),
    }),
  });

  it('returns an acceptance summary for a quote', async () => {
    const fullQuote = {
      quote: {
        id: QUOTE_ID,
        number: 'MPK-2025-001',
        status: 'accepted',
        acceptanceMode: 'online',
        acceptedAt: isoNow,
        acceptedByName: 'John Doe',
      },
      currentVersion: null,
      lines: [],
    } as unknown as QuoteFull;

    quotesRepo.getById.mockResolvedValue(fullQuote);

    const response = await request(app).get(`/v1/quotes/${QUOTE_ID}/acceptance-summary`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        status: 'accepted',
        acceptance_mode: 'online',
        accepted_at: isoNow,
        accepted_by_name: 'John Doe',
      },
    });
    expect(quotesRepo.getById).toHaveBeenCalledWith(QUOTE_ID);
  });

  const mockDb = {
    query: {
      quotes: {
        findFirst: vi.fn(async ({ where }: { where: Function }) => {
          if (!state.quote) {
            return null;
          }

          const matches = where(state.quote, {
            eq: (field: unknown, value: unknown) => field === value,
            isNull: (value: unknown) => value === null,
          });

          return matches ? state.quote : null;
        }),
      },
    },
    transaction: vi.fn(async (handler: (tx: unknown) => unknown) => handler(createTx())),
  };

  return {
    db: mockDb,
    pool: {},
    __mockState: state,
  };
});

let app: ReturnType<typeof express>;
let quotesRepo: Awaited<ReturnType<typeof importQuotesRepo>>;
let versionsRepo: Awaited<ReturnType<typeof importVersionsRepo>>;
let linesRepo: Awaited<ReturnType<typeof importLinesRepo>>;
let activitiesRepo: Awaited<ReturnType<typeof importActivitiesRepo>>;
let diffService: Awaited<ReturnType<typeof importDiffService>>;
let acceptanceRepo: Awaited<ReturnType<typeof importAcceptanceRepo>>;
let publicLinksRepo: Awaited<ReturnType<typeof importPublicLinksRepo>>;
let pinHashService: Awaited<ReturnType<typeof importPinHashService>>;
let mockState: {
  quote: { id: string; deletedAt: Date | null } | null;
  version: { id: string; quoteId: string; deletedAt: Date | null } | null;
  line: { id: string; versionId: string; deletedAt: Date | null } | null;
};

async function importQuotesRepo() {
  return vi.mocked(await import('../../src/repositories/quotes.repo'));
}

async function importVersionsRepo() {
  return vi.mocked(await import('../../src/repositories/versions.repo'));
}

async function importLinesRepo() {
  return vi.mocked(await import('../../src/repositories/lines.repo'));
}

async function importActivitiesRepo() {
  return vi.mocked(await import('../../src/repositories/activities.repo'));
}

async function importDiffService() {
  return vi.mocked(await import('../../src/services/version-diff.service'));
}

async function importAcceptanceRepo() {
  return vi.mocked(await import('../../src/repositories/acceptance.repo'));
}

async function importPublicLinksRepo() {
  return vi.mocked(await import('../../src/repositories/public-links.repo'));
}

async function importPinHashService() {
  return vi.mocked(await import('../../src/services/pin-hash.service'));
}

beforeAll(async () => {
  const { default: quotesRouter } = await import('../../src/routes/v1/quotes');
  quotesRepo = await importQuotesRepo();
  versionsRepo = await importVersionsRepo();
  linesRepo = await importLinesRepo();
  activitiesRepo = await importActivitiesRepo();
  diffService = await importDiffService();
  acceptanceRepo = await importAcceptanceRepo();
  publicLinksRepo = await importPublicLinksRepo();
  pinHashService = await importPinHashService();

  const dbModule: any = await import('../../src/db/client');
  mockState = dbModule.__mockState;

  app = express();
  app.use(express.json());
  app.use('/v1/quotes', quotesRouter);

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

const sampleQuotePayload = {
  customer_name: 'Acme Corp',
  title: 'Consulting Engagement',
  notes: 'Initial draft',
  currency: 'EUR',
  lines: [
    {
      description: 'Professional services',
      qty: 1,
      unit_amount_cents: 15000,
      tax_rate_bps: 2000,
    },
  ],
};

describe('v1/quotes routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState.quote = { id: QUOTE_ID, deletedAt: null };
    mockState.version = { id: VERSION_ID, quoteId: QUOTE_ID, deletedAt: null };
    mockState.line = { id: LINE_ID, versionId: VERSION_ID, deletedAt: null };
  });

  it('creates a quote and returns the aggregate', async () => {
    const fullQuote = {
      quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
      currentVersion: null,
      lines: [],
    } as unknown as QuoteFull;

    quotesRepo.createQuote.mockResolvedValue({ id: QUOTE_ID, number: 'MPK-2025-001' });
    quotesRepo.getById.mockResolvedValue(fullQuote);

    const response = await request(app).post('/v1/quotes').send(sampleQuotePayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: fullQuote });
    expect(quotesRepo.createQuote).toHaveBeenCalledWith(sampleQuotePayload);
    expect(quotesRepo.getById).toHaveBeenCalledWith(QUOTE_ID);
  });

  it('lists quotes with parsed query filters', async () => {
    const items: QuoteListItem[] = [
      {
        quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
        currentVersion: null,
      } as unknown as QuoteListItem,
    ];
    quotesRepo.list.mockResolvedValue(items);

    const response = await request(app).get(
      `/v1/quotes?status=draft,sent&limit=20&offset=5&q=Acme`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: items });
    expect(quotesRepo.list).toHaveBeenCalledWith({
      status: ['draft', 'sent'],
      limit: 20,
      offset: 5,
      q: 'Acme',
    });
  });

  it('fetches a quote by id', async () => {
    const fullQuote = {
      quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
      currentVersion: { id: VERSION_ID } as unknown as QuoteVersion,
      lines: [],
    } as unknown as QuoteFull;
    quotesRepo.getById.mockResolvedValue(fullQuote);

    const response = await request(app).get(`/v1/quotes/${QUOTE_ID}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: fullQuote });
    expect(quotesRepo.getById).toHaveBeenCalledWith(QUOTE_ID);
    expect(activitiesRepo.logActivity).toHaveBeenCalledWith({
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      type: 'view',
      metadata: { source: 'v1/quotes/:quoteId' },
    });
  });

  it('updates quote metadata', async () => {
    const fullQuote = {
      quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
      currentVersion: null,
      lines: [],
    } as unknown as QuoteFull;
    quotesRepo.getById.mockResolvedValue(fullQuote);
    const patch = { title: 'Updated title' };

    const response = await request(app).patch(`/v1/quotes/${QUOTE_ID}`).send(patch);

    expect(response.status).toBe(200);
    expect(quotesRepo.updateMeta).toHaveBeenCalledWith(QUOTE_ID, patch);
    expect(quotesRepo.getById).toHaveBeenCalledWith(QUOTE_ID);
    expect(response.body).toEqual({ data: fullQuote });
  });

  it('soft deletes and restores a quote', async () => {
    const deleteResponse = await request(app).delete(`/v1/quotes/${QUOTE_ID}`);
    expect(deleteResponse.status).toBe(204);
    expect(quotesRepo.softDelete).toHaveBeenCalledWith(QUOTE_ID);

    const restoreResponse = await request(app).post(`/v1/quotes/${QUOTE_ID}/restore`);
    expect(restoreResponse.status).toBe(204);
    expect(quotesRepo.restore).toHaveBeenCalledWith(QUOTE_ID);
  });

  it('accepts a quote on paper', async () => {
    const fullQuote = {
      quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
      currentVersion: null,
      lines: [],
    } as unknown as QuoteFull;

    acceptanceRepo.acceptQuoteOnPaper.mockResolvedValue(fullQuote);

    const payload = {
      full_name: 'John Doe',
      accepted_at: isoNow,
      notes: 'Signed on paper',
    };

    const response = await request(app)
      .post(`/v1/quotes/${QUOTE_ID}/accept-paper`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: fullQuote });
    expect(acceptanceRepo.acceptQuoteOnPaper).toHaveBeenCalledWith(QUOTE_ID, payload);
  });

  it('undoes acceptance for a quote', async () => {
    const fullQuote = {
      quote: { id: QUOTE_ID, number: 'MPK-2025-001' },
      currentVersion: null,
      lines: [],
    } as unknown as QuoteFull;

    acceptanceRepo.undoAcceptance.mockResolvedValue(fullQuote);

    const response = await request(app).post(`/v1/quotes/${QUOTE_ID}/acceptance/undo`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: fullQuote });
    expect(acceptanceRepo.undoAcceptance).toHaveBeenCalledWith(QUOTE_ID);
  });

  it('lists versions for a quote', async () => {
    const versions = [
      {
        id: VERSION_ID,
        quoteId: QUOTE_ID,
        versionNumber: 1,
        status: 'current',
        title: 'v1',
        intro: null,
        notes: null,
        currencyCode: 'EUR',
        depositPct: '0',
        totalsNetCents: 0,
        totalsTaxCents: 0,
        totalsGrossCents: 0,
        totalsDepositCents: 0,
        totalsBalanceCents: 0,
        isLocked: false,
        createdAt: isoNow,
        updatedAt: isoNow,
        deletedAt: null,
        validityDate: null,
        label: null,
      } as unknown as QuoteVersion,
    ];
    versionsRepo.listVersionsTx.mockResolvedValue(versions);

    const response = await request(app).get(`/v1/quotes/${QUOTE_ID}/versions`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: versions });
    expect(versionsRepo.listVersionsTx).toHaveBeenCalledTimes(1);
  });

  it('returns a version diff between two versions', async () => {
    const diff = {
      meta: [{ field: 'label', before: null, after: 'New label' }],
      lines: [],
    };

    diffService.computeVersionDiffTx.mockResolvedValue(diff as any);

    const response = await request(app).get(
      `/v1/quotes/${QUOTE_ID}/versions/${VERSION_ID}/diff/${VERSION_ID_2}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: diff });
    expect(diffService.computeVersionDiffTx).toHaveBeenCalledWith(
      expect.anything(),
      VERSION_ID,
      VERSION_ID_2,
    );
  });

  it('duplicates a version when from_version_id is provided', async () => {
    const duplicated = {
      id: VERSION_ID_2,
      quoteId: QUOTE_ID,
      versionNumber: 2,
      status: 'draft',
      title: 'copy',
      intro: null,
      notes: null,
      currencyCode: 'EUR',
      depositPct: '0',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      createdAt: isoNow,
      updatedAt: isoNow,
      deletedAt: null,
      validityDate: null,
      label: null,
    } as unknown as QuoteVersion;
    versionsRepo.duplicateVersionTx.mockResolvedValue(duplicated);

    const response = await request(app)
      .post(`/v1/quotes/${QUOTE_ID}/versions`)
      .send({ from_version_id: VERSION_ID });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: duplicated });
    expect(versionsRepo.duplicateVersionTx).toHaveBeenCalledTimes(1);
  });

  it('creates an empty version when no source provided', async () => {
    const newlyCreated = {
      id: VERSION_ID_3,
      quoteId: QUOTE_ID,
      versionNumber: 3,
      status: 'draft',
      title: 'Nouvelle version',
      intro: null,
      notes: null,
      currencyCode: 'EUR',
      depositPct: '0',
      totalsNetCents: 0,
      totalsTaxCents: 0,
      totalsGrossCents: 0,
      totalsDepositCents: 0,
      totalsBalanceCents: 0,
      isLocked: false,
      createdAt: isoNow,
      updatedAt: isoNow,
      deletedAt: null,
      validityDate: null,
      label: null,
    } as unknown as QuoteVersion;
    versionsRepo.createVersionWithLinesTx.mockResolvedValue(newlyCreated);

    const response = await request(app)
      .post(`/v1/quotes/${QUOTE_ID}/versions`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: newlyCreated });
    expect(versionsRepo.createVersionWithLinesTx).toHaveBeenCalledWith(expect.anything(), QUOTE_ID, {
      version: {},
      lines: [],
    });
  });

  it('publishes a version', async () => {
    const response = await request(app).post(`/v1/quotes/${QUOTE_ID}/versions/${VERSION_ID}/publish`);

    expect(response.status).toBe(204);
    expect(versionsRepo.setCurrentVersionTx).toHaveBeenCalledWith(expect.anything(), VERSION_ID);
    expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      type: 'version_published',
      metadata: { source: 'v1/quotes:publish' },
    });
  });

  it('creates, updates, and deletes lines', async () => {
    const line = {
      id: LINE_ID,
      versionId: VERSION_ID,
      kind: 'service',
      refId: null,
      label: 'New line',
      description: 'New line',
      quantity: '1',
      unitPriceCents: 5000,
      taxRatePct: '10',
      discountPct: '0',
      optional: false,
      position: 1,
      netAmountCents: 5000,
      taxAmountCents: 500,
      grossAmountCents: 5500,
      metadata: null,
      createdAt: isoNow,
      updatedAt: isoNow,
      deletedAt: null,
    } as unknown as QuoteLine;
    linesRepo.createLineTx.mockResolvedValue(line);
    const createResponse = await request(app)
      .post(`/v1/quotes/${QUOTE_ID}/versions/${VERSION_ID}/lines`)
      .send({
        description: 'New line',
        qty: 1,
        unit_amount_cents: 5000,
        tax_rate_bps: 1000,
      });

    expect(createResponse.status).toBe(201);
    expect(linesRepo.createLineTx).toHaveBeenCalledWith(expect.anything(), VERSION_ID, {
      description: 'New line',
      qty: 1,
      unit_amount_cents: 5000,
      tax_rate_bps: 1000,
    });
    expect(createResponse.body).toEqual({ data: line });

    const updatedLine = {
      ...line,
      label: 'Updated',
      description: 'Updated',
    } as unknown as QuoteLine;
    linesRepo.updateLineTx.mockResolvedValue(updatedLine);
    const updateResponse = await request(app)
      .patch(`/v1/quotes/${QUOTE_ID}/versions/${VERSION_ID}/lines/${LINE_ID}`)
      .send({ description: 'Updated' });

    expect(updateResponse.status).toBe(200);
    expect(linesRepo.updateLineTx).toHaveBeenCalledWith(expect.anything(), LINE_ID, {
      description: 'Updated',
    });
    expect(updateResponse.body).toEqual({ data: updatedLine });

    const deleteResponse = await request(app).delete(
      `/v1/quotes/${QUOTE_ID}/versions/${VERSION_ID}/lines/${LINE_ID}`,
    );

    expect(deleteResponse.status).toBe(204);
    expect(linesRepo.softDeleteLineTx).toHaveBeenCalledWith(expect.anything(), LINE_ID);
    expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      type: 'line_changed',
      metadata: { operation: 'create', lineId: LINE_ID },
    });
    expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      type: 'line_changed',
      metadata: { operation: 'update', lineId: LINE_ID },
    });
    expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
      quoteId: QUOTE_ID,
      versionId: VERSION_ID,
      type: 'line_changed',
      metadata: { operation: 'delete', lineId: LINE_ID },
    });
  });

  describe('POST /v1/quotes/:quoteId/public-link', () => {
    it('enables public link without PIN', async () => {
      const link = {
        id: 'link-1',
        quoteId: QUOTE_ID,
        token: 'token-123',
        pinHash: null,
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      } as any;

      publicLinksRepo.upsertPublicLinkTx.mockResolvedValue(link);

      const response = await request(app)
        .post(`/v1/quotes/${QUOTE_ID}/public-link`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        enabled: true,
        pin_protected: false,
      });
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.length).toBeGreaterThan(0);

      expect(publicLinksRepo.upsertPublicLinkTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          quoteId: QUOTE_ID,
          pinHash: null,
        }),
      );

      const [, upsertInput] = publicLinksRepo.upsertPublicLinkTx.mock.calls[0];
      expect(typeof upsertInput.token).toBe('string');
      expect(upsertInput.token.length).toBeGreaterThanOrEqual(32);

      expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
        quoteId: QUOTE_ID,
        versionId: null,
        type: 'public_link_updated',
        metadata: {
          enabled: true,
          pin_protected: false,
          rotated: true,
        },
      });
    });

    it('enables public link with PIN', async () => {
      pinHashService.hashPin.mockReturnValue('hashed-123456');

      const link = {
        id: 'link-1',
        quoteId: QUOTE_ID,
        token: 'token-123',
        pinHash: 'hashed-123456',
        pinFailedAttempts: 0,
        pinLockedUntil: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      } as any;

      publicLinksRepo.upsertPublicLinkTx.mockResolvedValue(link);

      const response = await request(app)
        .post(`/v1/quotes/${QUOTE_ID}/public-link`)
        .send({ enabled: true, pin: '123456' });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        enabled: true,
        pin_protected: true,
      });
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.length).toBeGreaterThan(0);

      expect(pinHashService.hashPin).toHaveBeenCalledWith('123456');

      expect(publicLinksRepo.upsertPublicLinkTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          quoteId: QUOTE_ID,
          pinHash: 'hashed-123456',
        }),
      );

      expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
        quoteId: QUOTE_ID,
        versionId: null,
        type: 'public_link_updated',
        metadata: {
          enabled: true,
          pin_protected: true,
          rotated: true,
        },
      });
    });

    it('disables public link', async () => {
      const response = await request(app)
        .post(`/v1/quotes/${QUOTE_ID}/public-link`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        enabled: false,
        token: null,
        pin_protected: false,
      });

      expect(publicLinksRepo.deletePublicLinkByQuoteIdTx).toHaveBeenCalledWith(
        expect.anything(),
        QUOTE_ID,
      );

      expect(activitiesRepo.logActivityTx).toHaveBeenCalledWith(expect.anything(), {
        quoteId: QUOTE_ID,
        versionId: null,
        type: 'public_link_updated',
        metadata: { enabled: false },
      });
    });

    it('returns quote_not_found when quote does not exist', async () => {
      mockState.quote = null;

      const response = await request(app)
        .post(`/v1/quotes/${QUOTE_ID}/public-link`)
        .send({ enabled: true });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('quote_not_found');

      expect(publicLinksRepo.upsertPublicLinkTx).not.toHaveBeenCalled();
      expect(publicLinksRepo.deletePublicLinkByQuoteIdTx).not.toHaveBeenCalled();
    });

    it('returns validation_error for invalid payload', async () => {
      const response = await request(app)
        .post(`/v1/quotes/${QUOTE_ID}/public-link`)
        .send({ enabled: true, pin: 'abcd' });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('validation_error');

      expect(publicLinksRepo.upsertPublicLinkTx).not.toHaveBeenCalled();
      expect(publicLinksRepo.deletePublicLinkByQuoteIdTx).not.toHaveBeenCalled();
    });
  });
});
